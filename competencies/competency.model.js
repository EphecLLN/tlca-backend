import mongoose from 'mongoose'

const { model, Schema } = mongoose

const CompetencySchema = new Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  created: {
    type: Date,
    default: Date.now,
  },
  description: {
    type: String,
  },
  learningOutcomes: {
    type: [
      {
        type: String,
        trim: true,
      },
    ],
    default: undefined,
  },
  name: {
    type: String,
    default: '',
    required: true,
    trim: true,
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

CompetencySchema.pre('validate', function (next) {
  // Learning outcomes list cannot be empty and all their names cannot be empty.
  if (
    this.learningOutcomes &&
    (!this.learningOutcomes.length ||
      this.learningOutcomes.some((lo) => !lo.length))
  ) {
    this.invalidate('learningOutcomes', 'EMPTY_LEARNING_OUTCOMES')
  }

  next()
})

export default model('Competency', CompetencySchema)
