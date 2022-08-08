import mongoose from 'mongoose'

const { model, Schema } = mongoose

const CompetencySchema = new Schema({
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
  },
  name: {
    type: String,
    default: '',
    trim: true,
    required: 'Name cannot be blank.',
  },
  partners: {
    type: [
      {
        type: Schema.ObjectId,
        ref: 'Partner',
      },
    ],
    default: undefined,
  },
  public: {
    type: Boolean,
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
    enum: ['theoretical', 'practical'],
  },
  user: {
    type: Schema.ObjectId,
    ref: 'User',
  },
})

export default model('Competency', CompetencySchema)
