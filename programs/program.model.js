import mongoose from 'mongoose'
import { getPathCompleter } from '../lib/models.js'

const { model, Schema } = mongoose

const CourseSchema = new Schema(
  {
    course: {
      type: Schema.ObjectId,
      ref: 'Course',
    },
    optional: {
      type: Boolean,
    },
  },
  {
    id: false,
    _id: false,
  }
)

const ProgramSchema = new Schema({
  archived: {
    type: Date,
  },
  banner: {
    type: String,
  },
  code: {
    type: String,
    trim: true,
    required: 'Code cannot be blank.',
    unique: true,
  },
  coordinator: {
    type: Schema.ObjectId,
    ref: 'User',
    required: 'Coordinator cannot be blank.',
  },
  courses: {
    type: [CourseSchema],
    default: undefined,
  },
  created: {
    type: Date,
    default: Date.now,
  },
  description: {
    type: String,
    required: 'Description cannot be blank.',
  },
  field: {
    type: String,
    trim: true,
  },
  language: {
    type: String,
    trim: true,
  },
  name: {
    type: String,
    trim: true,
    required: 'Name cannot be blank.',
  },
  published: {
    type: Date,
  },
  tags: {
    type: [
      {
        type: String,
        trim: true,
      },
    ],
    default: undefined,
  },
  type: {
    type: String,
    enum: ['training', 'uprogram'],
    default: 'training',
    required: 'Type cannot be blank.',
  },
  user: {
    type: Schema.ObjectId,
    ref: 'User',
  },
  visibility: {
    type: String,
    enum: ['public', 'invite-only', 'private'],
    default: 'public',
  },
})

// Generate full path for the banner.
ProgramSchema.post(
  ['aggregate', 'find', 'findOne'],
  getPathCompleter('programs')
)

export default model('Program', ProgramSchema)
