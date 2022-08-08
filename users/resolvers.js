import { AuthenticationError, UserInputError } from 'apollo-server'
import jwt from 'jsonwebtoken'

const resolvers = {
  Query: {
    async colleagues(_parent, _args, { models }, _info) {
      const { User } = models

      return await User.find({ roles: 'teacher' })
    },
    async me(_parent, _args, context, _info) {
      const { User } = context.models

      if (!context.user) {
        return null
      }

      const user = await User.findOne({ _id: context.user.id })
      if (!user) {
        throw new AuthenticationError('You must be logged in.')
      }

      return {
        displayName: user.displayName,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles,
        username: user.username,
      }
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
    async signIn(_parent, args, { env, models }, _info) {
      const { User } = models

      if (!args.usernameOrEmail || !args.password) {
        throw new UserInputError('MISSING_FIELDS')
      }

      // Find a user either with a given email address or with a given username
      const user = await User.findOne(
        {
          $or: [
            { email: args.usernameOrEmail },
            { username: args.usernameOrEmail },
          ],
        },
        '_id password roles salt'
      )

      if (user && user.authenticate(args.password)) {
        return {
          token: jwt.sign({ id: user._id, roles: user.roles }, env.JWT_SECRET),
        }
      }

      throw new UserInputError('INVALID_CREDENTIALS')
    },
    signOut(_parent, _args, _context, _info) {
      return true
    },
    async signUp(_parent, args, { models }, _info) {
      const { User } = models

      if (!args.email || !args.password) {
        throw new UserInputError('MISSING_FIELDS')
      }

      const user = new User(args)
      user.provider = 'local'

      user.updateEmail(args.email)

      try {
        await user.save()
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
        return false
      }
    },
  },
}

export default resolvers
