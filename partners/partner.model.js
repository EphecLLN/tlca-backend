import mongoose from 'mongoose'
import { getPathCompleter } from '../lib/models.js'

const { model, Schema } = mongoose

const PartnerSchema = new Schema({
  abbreviation: {
    type: String,
    trim: true,
  },
  banner: {
    type: String,
    trim: true,
  },
  code: {
    type: String,
    trim: true,
    required: 'Code cannot be blank.',
    unique: true,
  },
  created: {
    type: Date,
    default: Date.now,
  },
  description: {
    type: String,
    required: 'Description cannot be blank.',
  },
  logo: {
    type: String,
    trim: true,
  },
  name: {
    type: String,
    trim: true,
    required: 'Name cannot be blank.',
  },
  representative: {
    type: Schema.ObjectId,
    ref: 'User',
    required: 'Representative cannot be blank.',
  },
  user: {
    type: Schema.ObjectId,
    ref: 'User',
  },
  website: {
    type: String,
    trim: true,
  },
})

// Generate full path for the banner and the logo.
PartnerSchema.post(
  ['aggregate', 'find', 'findOne'],
  getPathCompleter('partners')
)

export default model('Partner', PartnerSchema)
