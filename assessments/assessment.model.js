import { DateTime } from 'luxon'
import mongoose from 'mongoose'

const { model, Schema } = mongoose

const CompetencySchema = new Schema(
  {
    competency: {
      type: Schema.ObjectId,
      ref: 'Competency',
    },
    optional: {
      type: Boolean,
    },
    stars: {
      type: Number,
      min: 1,
      max: 3,
    },
  },
  {
    id: false,
    _id: false,
  }
)

const AssessmentSchema = new Schema({
  category: {
    type: String,
    enum: [
      'casestudy',
      'coding',
      'exercise',
      'interview',
      'mission',
      'project',
      'quiz',
    ],
    required: 'Category cannot be blank.',
  },
  clonedFrom: {
    type: Schema.ObjectId,
    ref: 'Assessment',
  },
  code: {
    type: String,
  },
  competencies: {
    type: [CompetencySchema],
    default: undefined,
  },
  course: {
    type: Schema.ObjectId,
    ref: 'Course',
    required: 'Course cannot be blank.',
  },
  created: {
    type: Date,
    default: Date.now,
  },
  description: {
    type: String,
    required: 'Description cannot be blank.',
  },
  end: {
    type: Date,
  },
  name: {
    type: String,
    trim: true,
    required: 'Name cannot be blank.',
  },
  start: {
    type: Date,
  },
  user: {
    type: Schema.ObjectId,
    ref: 'User',
  },
})

AssessmentSchema.pre('validate', function (next) {
  // There must be at least one mandatory competency.
  if (!this.competencies.some((c) => !c.optional)) {
    this.invalidate('competencies', 'MISSING_MANDATORY_COMPETENCY')
  }

  // Competencies must be all different.
  const codes = new Set()
  if (
    this.competencies.some(
      (c) =>
        codes.size ===
        codes.add((c.competency._id || c.competency).toString()).size
    )
  ) {
    this.invalidate('competencies', 'DUPLICATE_COMPETENCIES')
  }

  // Start date must be strictly before end date,
  // if both are defined.
  if (this.start && this.end) {
    const start = DateTime.fromJSDate(this.start)
    const end = DateTime.fromJSDate(this.end)

    if (start >= end) {
      this.invalidate('start', 'START_DATE_NOT_BEFORE_END_DATE')
    }
  }

  next()
})

export default model('Assessment', AssessmentSchema)
