import { passwordStrength } from 'check-password-strength'
import crypto from 'crypto'
import mongoose from 'mongoose'
import validator from 'validator'

const { model, Schema } = mongoose

const validateLocalStrategyEmail = function (email) {
  return (
    (this.provider !== 'local' && !this.updated) ||
    validator.isEmail(email, { require_tld: false })
  )
}

const validateUsername = function (username) {
  const usernameRegex = /^(?=[\w.-]+$)(?!.*[._-]{2})(?!\.)(?!.*\.$).{3,34}$/
  const illegalUsernames = [
    'administrator',
    'password',
    'admin',
    'user',
    'unknown',
    'anonymous',
    'null',
    'undefined',
    'api',
  ]
  return (
    this.provider !== 'local' ||
    (username &&
      usernameRegex.test(username) &&
      illegalUsernames.indexOf(username) < 0)
  )
}

const UserSchema = new Schema(
  {
    firstName: {
      type: String,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    displayName: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      index: {
        unique: true,
        sparse: true,
      },
      lowercase: true,
      trim: true,
      default: '',
      validate: [
        validateLocalStrategyEmail,
        'Please fill a valid email address',
      ],
    },
    emailConfirmationToken: {
      type: String,
    },
    emailConfirmed: {
      type: Date,
    },
    username: {
      type: String,
      unique: 'Username already exists',
      validate: [
        validateUsername,
        'Please enter a valid username: 3+ characters long, non restricted word, characters "_-.", no consecutive dots, does not begin or end with dots, letters a-z and numbers 0-9.',
      ],
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      default: '',
    },
    salt: {
      type: String,
    },
    profileImageURL: {
      type: String,
      default: '/modules/users/client/img/profile/default.png',
    },
    provider: {
      type: String,
      required: 'Provider is required',
    },
    providerData: {},
    additionalProvidersData: {},
    roles: {
      type: [
        {
          type: String,
          enum: ['user', 'student', 'teacher', 'manager', 'admin'],
        },
      ],
      default: ['user'],
      required: 'Please provide at least one role',
    },
    updated: {
      type: Date,
    },
    created: {
      type: Date,
      default: Date.now,
    },
    resetPasswordToken: {
      type: String,
    },
    resetPasswordExpires: {
      type: Date,
    },
  },
  { usePushEach: true }
)

UserSchema.pre('save', function (next) {
  // Set the username to the '_id' as a default value.
  if (!this.username) {
    this.username = this._id
  }

  // Regenerate display name when either first name or last name changed.
  if (
    (this.firstName && this.isModified('firstName')) ||
    (this.lastName && this.isModified('lastName'))
  ) {
    this.displayName = (this.firstName + ' ' + this.lastName).trim()
  }

  // Set the display name to the username when no first and last names are defined.
  if (!this.displayName || !this.displayName.length) {
    this.displayName = this.username
  }

  // Choose a new salt and hash the password each time a new one is choosed.
  if (this.password && this.isModified('password')) {
    this.salt = crypto.randomBytes(16).toString('base64')
    this.password = this.hashPassword(this.password)
  }

  next()
})

UserSchema.pre('validate', function (next) {
  if (
    this.provider === 'local' &&
    this.password &&
    this.isModified('password')
  ) {
    const { id, value } = passwordStrength(this.password)
    if (id <= 1) {
      this.invalidate('password', 'Password is ' + value.toLowerCase())
    }
  }

  next()
})

UserSchema.methods.authenticate = function (password) {
  return this.password === this.hashPassword(password)
}

UserSchema.methods.hashPassword = function (password) {
  if (!this.salt || !password) {
    return password
  }
  return crypto
    .pbkdf2Sync(password, Buffer.from(this.salt, 'base64'), 10000, 64, 'SHA1')
    .toString('base64')
}

UserSchema.methods.updateEmail = function (email) {
  this.email = email

  delete this.emailConfirmed
  this.emailConfirmationToken = crypto.randomBytes(20).toString('hex')
}

export default model('User', UserSchema)
