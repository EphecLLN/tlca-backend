import Bugsnag from '@bugsnag/js'
import { AuthenticationError, UserInputError } from 'apollo-server'
import jwt from 'jsonwebtoken'
import { DateTime } from 'luxon'

// Create the access and the refresh tokens.
function getTokens(user, env) {
  const userinfo = { id: user._id, roles: user.roles }

  const token = jwt.sign(userinfo, env.JWT_ACCESS_TOKEN_SECRET, {
    expiresIn: '15m',
  })
  const refreshToken = jwt.sign(userinfo, env.JWT_REFRESH_TOKEN_SECRET, {
    expiresIn: '14d',
  })

  user.refreshToken = refreshToken
  user.refreshTokenExpires = DateTime.now().plus({ days: 14 }).toJSDate()

  return {
    token,
    refreshToken,
  }
}

const resolvers = {
  User: {
    displayName(user, _args, _context, _info) {
      if (!(user.firstName && user.lastName)) {
        return user.username
      }
      return `${user.firstName} ${user.lastName}`
    },
  },
  Query: {
    async colleagues(_parent, _args, { models }, _info) {
      const { User } = models

      return await User.find({ roles: 'teacher' })
    },
    async me(_parent, _args, { models, user }, _info) {
      const { User } = models

      // Retrieve the logged in user, if any.
      const loggedUser = await User.findOne(
        { _id: user?.id },
        'firstName lastName roles username'
      ).lean()
      if (!user) {
        throw new AuthenticationError('Not authorized')
      }

      // Return all the selected field except '_id'
      return (({ _id, ...rest }) => rest)(loggedUser)
    },
    async users(_parent, args, { models }, _info) {
      const { User } = models

      // Set up offset and limit.
      const skip = Math.max(0, args.offset ?? 0)
      const limit = args.limit ?? undefined

      // Retrieve all the users satisfying the conditions defined hereabove.
      const users = await User.find({}, null, { skip, limit })
      return users.map((user) => ({
        ...user.toJSON(),
        id: user.id,
        isValidated: !user.emailConfirmationToken,
      }))
    },
  },
  Mutation: {
    async refreshToken(_parent, args, { env, models }, _info) {
      const { User } = models

      // Check the refresh token validity.
      const decoded = jwt.verify(args.token, env.JWT_REFRESH_TOKEN_SECRET)
      if (!decoded) {
        throw new UserInputError('INVALID_REFRESH_TOKEN')
      }

      // Find a user with the given refresh token.
      const user = await User.findOne(
        { _id: decoded.id },
        '_id refreshToken refreshTokenExpires roles'
      )
      if (
        !user ||
        user.refreshToken !== args.token ||
        DateTime.now() > DateTime.fromISO(user.refreshTokenExpires)
      ) {
        throw new UserInputError('INVALID_REFRESH_TOKEN')
      }

      // Create the access and the refresh tokens.
      const { refreshToken, token } = getTokens(user, env)

      // Save the refresh token into the database.
      try {
        await user.save()
        return {
          refreshToken,
          token,
        }
      } catch (err) {
        Bugsnag.notify(err)
      }

      return null
    },
    async signIn(_parent, args, { env, models }, _info) {
      const { User } = models

      // Find a user who has either the specified email address
      // or the specified username.
      const user = await User.findOne(
        {
          $or: [
            { email: args.usernameOrEmail },
            { username: args.usernameOrEmail },
          ],
        },
        '_id emailConfirmed password roles salt'
      )
      if (!user?.authenticate(args.password)) {
        throw new UserInputError('INVALID_CREDENTIALS')
      }
      if (!user.emailConfirmed) {
        throw new UserInputError('UNCONFIRMED_EMAIL_ADDRESS')
      }

      // Create the access and the refresh tokens.
      const { refreshToken, token } = getTokens(user, env)

      // Save the refresh token into the database.
      try {
        await user.save()
        return {
          refreshToken,
          token,
        }
      } catch (err) {
        Bugsnag.notify(err)
      }

      return null
    },
    async signOut(_parent, _args, { models, user }, _info) {
      const { User } = models

      // Find the connected user.
      const loggedUser = await User.findOne(
        { _id: user.id },
        '_id refreshToken refreshTokenExpires'
      )

      // Remove his/her refresh token.
      loggedUser.refreshToken = undefined
      loggedUser.refreshTokenExpires = undefined

      // Save the refresh token into the database.
      try {
        await loggedUser.save()
        return true
      } catch (err) {
        Bugsnag.notify(err)
      }

      return false
    },
    async signUp(_parent, args, { models, smtpTransport }, _info) {
      const { Registration, User } = models

      // Create the user Mongoose object.
      const user = new User(args)
      user.provider = 'local'

      user.updateEmail(args.email)

      // Save the user into the database.
      try {
        await user.save()

        // Send a confirmation email to the new user.
        const validationURL = `https://www.tlca.eu/profiles/${user.username}/${user.emailConfirmationToken}`
        await smtpTransport.sendMail({
          to: args.email,
          from: 'sebastien@combefis.be',
          subject: '[TLCA] Email address validation',
          html:
            '<p>Hello,</p>' +
            '<p>Thank you for creating an account on the TLCA platform.</p>' +
            `<p>In order to be able to connect on the platform, you first need to validate your email address. You can do so by visiting the following page:</p><p><a href="${validationURL}">${validationURL}</a></p>` +
            '<p>The TLCA team</p>',
        })

        // Update any invitation that have been sent to this user.
        const registrations = await Registration.find({ email: args.email })
        await Promise.all(
          registrations.map(async (registration) => {
            registration.email = undefined
            registration.user = user._id

            await registration.save()
          })
        )

        return true
      } catch (err) {
        switch (err.name) {
          case 'MongoServerError': {
            switch (err.code) {
              case 11000: {
                throw new UserInputError('EXISTING_EMAIL_ADDRESS')
              }
            }
            break
          }

          case 'ValidationError': {
            if (err.errors.email) {
              throw new UserInputError('INVALID_EMAIL_ADDRESS')
            }
            if (err.errors.password) {
              throw new UserInputError('INVALID_PASSWORD')
            }
            break
          }
        }

        Bugsnag.notify(err)
      }

      return false
    },
    // Validate the email address of a new account.
    async validateAccount(_parent, args, { models }, _info) {
      const { User } = models

      // Retrieve the user to validate.
      const user = await User.findOne(
        { username: args.username },
        'emailConfirmationToken emailConfirmationTokenExpires'
      )
      if (
        !user ||
        user.emailConfirmationToken !== args.emailConfirmationToken ||
        DateTime.now() > DateTime.fromISO(user.emailConfirmationTokenExpires)
      ) {
        throw new UserInputError('USER_NOT_FOUND')
      }

      // Validate the user.
      user.emailConfirmationToken = undefined
      user.emailConfirmationTokenExpires = undefined
      user.emailConfirmed = new Date()

      // Save the user into the database.
      try {
        await user.save()
        return true
      } catch (err) {
        Bugsnag.notify(err)
      }

      return false
    },
  },
}

export default resolvers
