import mongoose from 'mongoose'
import { getPathCompleter } from '../lib/models.js'

const { Schema } = mongoose

const CompetencySchema = new Schema(
  {
    category: {
      type: String,
      enum: ['basic', 'advanced'],
    },
    competency: {
      type: Schema.ObjectId,
      ref: 'Competency',
    },
    subcategory: {
      type: String,
      trim: true,
    },
  },
  {
    id: false,
    _id: false,
  }
)

const ProgressStepSchema = new Schema(
  {
    date: {
      type: Date,
      required: true,
    },
    progress: {
      advanced: {
        type: Number,
        min: 0,
        max: 100,
        required: true,
      },
      basic: {
        type: Number,
        min: 0,
        max: 100,
        required: true,
      },
    },
  },
  {
    id: false,
    _id: false,
  }
)

const ScheduleSchema = new Schema(
  {
    end: {
      type: Date,
    },
    start: {
      type: Date,
    },
    registrationsEnd: {
      type: Date,
    },
    registrationsStart: {
      type: Date,
    },
    evaluationsEnd: {
      type: Date,
    },
  },
  {
    id: false,
    _id: false,
  }
)

const TeachingGroupSchema = new Schema(
  {
    name: {
      type: String,
      trim: true,
    },
    supervisor: {
      type: Schema.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    id: false,
    _id: false,
  }
)

const WorkingGroupSchema = new Schema(
  {
    name: {
      type: String,
      trim: true,
    },
  },
  {
    id: false,
    _id: false,
  }
)

const CourseSchema = new Schema(
  {
    archived: {
      type: Date,
    },
    banner: {
      type: String,
    },
    clonedFrom: {
      type: Schema.ObjectId,
      ref: 'Course',
    },
    code: {
      type: String,
      trim: true,
      required: 'Code cannot be blank.',
      unique: true,
    },
    colophon: {
      type: String,
      trim: true,
    },
    competencies: {
      type: [CompetencySchema],
      default: undefined,
    },
    coordinator: {
      type: Schema.ObjectId,
      ref: 'User',
      required: 'Coordinator cannot be blank.',
    },
    created: {
      type: Date,
      default: Date.now,
    },
    description: {
      type: String,
      trim: true,
      required: 'Description cannot be blank.',
    },
    field: {
      type: String,
      trim: true,
    },
    groups: {
      teaching: {
        type: [TeachingGroupSchema],
        default: undefined,
      },
      working: {
        type: [WorkingGroupSchema],
        default: undefined,
      },
    },
    language: {
      type: String,
      trim: true,
    },
    load: {
      type: {
        type: String,
        enum: ['weekly', 'theo+prac'],
      },
      theory: {
        type: Number,
        min: 0,
      },
      practice: {
        type: Number,
        min: 0,
      },
      weekload: {
        type: Number,
        min: 1,
      },
      ects: {
        type: Number,
        min: 0,
      },
    },
    name: {
      type: String,
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
    progressGuide: {
      type: [ProgressStepSchema],
      default: undefined,
    },
    published: {
      type: Date,
    },
    schedule: {
      type: ScheduleSchema,
      default: undefined,
    },
    span: {
      type: Number,
      min: 1,
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
    teachers: {
      type: [
        {
          type: Schema.ObjectId,
          ref: 'User',
        },
      ],
      default: undefined,
    },
    type: {
      type: String,
      enum: ['project', 'training', 'ucourse', 'unit'],
      default: 'unit',
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
  },
  { usePushEach: true }
)

CourseSchema.pre('validate', function (next) {
  // There must be at least one basic competency.
  if (!this.competencies.some((c) => c.category === 'basic')) {
    this.invalidate('competencies', 'MISSING_BASIC_COMPETENCY')
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

  // Teaching group names must be all different.
  if (this.groups?.teaching?.length) {
    const groups = new Set()
    if (
      this.groups.teaching
        .filter((g) => g.name?.length)
        .some((g) => groups.size === groups.add(g.name).size)
    ) {
      this.invalidate('groups', 'DUPLICATE_TEACHING_GROUP_NAMES')
    }
  }

  next()
})

// Generate full path for the banner.
const pathCompleter = getPathCompleter('courses')
CourseSchema.post('aggregate', pathCompleter)
CourseSchema.post('find', pathCompleter)
CourseSchema.post('findOne', pathCompleter)

export default mongoose.model('Course', CourseSchema)
