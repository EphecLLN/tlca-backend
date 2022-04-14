import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const ProgramSchema = new Schema({
  code: {
    type: String,
    trim: true,
    required: 'Code cannot be blank.',
    unique: true
  },
  name: {
    type: String,
    default: '',
    trim: true,
    required: 'Name cannot be blank.'
  },
  type: {
    type: String,
    enum: ['training', 'uprogram'],
    default: 'training',
    required: 'Type cannot be blank.'
  },
  field: {
    type: String,
    trim: true
  },
  tags: {
    type: [{
      type: String,
      trim: true
    }],
    default: undefined
  },
  language: {
    type: String,
    trim: true
  },
  coordinator: {
    type: Schema.ObjectId,
    ref: 'User',
    required: 'Coordinator cannot be blank.'
  },
  courses: {
    type: [{
      type: Schema.ObjectId,
      ref: 'Course'
    }],
    default: undefined
  },
  description: {
    type: String,
    required: 'Description cannot be blank.'
  },
  visibility: {
    type: String,
    enum: ['public', 'invite-only', 'private'],
    default: 'public'
  },
  created: {
    type: Date,
    default: Date.now
  },
  user: {
    type: Schema.ObjectId,
    ref: 'User'
  }
});

export default mongoose.model('Program', ProgramSchema);
