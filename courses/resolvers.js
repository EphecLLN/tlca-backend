import { UserInputError } from 'apollo-server'
import { DateTime } from 'luxon'
import mongoose from 'mongoose'

function isCoordinator(course, user) {
  const userId = user?.id
  return (course.coordinator._id || course.coordinator).toString() === userId
}

function isTeacher(course, user) {
  const userId = user?.id
  return !!course.teachers?.some((t) => (t._id || t).toString() === userId)
}

function canEnroll(schedule, now) {
  if (schedule) {
    const isAfter = (dt) => dt > now
    const isSameOrBefore = (dt) => dt <= now

    const events = [
      {
        field: 'registrationsStart',
        check: isAfter,
      },
      {
        field: 'registrationsEnd',
        check: isSameOrBefore,
      },
      {
        field: 'evaluationsEnd',
        check: isSameOrBefore,
      },
      {
        field: 'end',
        check: isSameOrBefore,
      },
    ]

    for (const event of events) {
      if (
        schedule[event.field] &&
        event.check(DateTime.fromISO(schedule[event.field]))
      ) {
        return false
      }
    }
  }

  return true
}

const resolvers = {
  CompetencyCategory: {
    ADVANCED: 'advanced',
    BASIC: 'basic',
  },
  CourseLoadType: {
    WEEKLY: 'weekly',
    THEO_PRAC: 'theo+prac',
  },
  CourseStatus: {
    ARCHIVED: 'archived',
    PUBLISHED: 'published',
    UNPUBLISHED: 'unpublished',
  },
  CourseType: {
    PROJECT: 'project',
    TRAINING: 'training',
    UCOURSE: 'ucourse',
    UNIT: 'unit',
  },
  CourseView: {
    COORDINATOR: 'coordinator',
    STUDENT: 'student',
    TEACHER: 'teacher',
    USER: 'user',
  },
  RegistrationInvite: {
    REQUESTED: 'requested',
    SENT: 'sent',
  },
  Visibility: {
    PUBLIC: 'public',
    INVITE_ONLY: 'invite-only',
    PRIVATE: 'private',
  },
  Course: {
    async assessments(course, _args, { models }, _info) {
      const { Assessment } = models

      return await Assessment.find({ course: course._id })
    },
    async coordinator(course, _args, { models }, _info) {
      const { User } = models

      return await User.findOne({ _id: course.coordinator })
    },
    async groups(course, _args, { models }, _info) {
      const { Course } = models

      return await Course.populate(course, [
        {
          path: 'groups.supervisor',
          model: 'User',
        },
      ]).then((a) => a.groups)
    },
    async hasRequestedInvite(course, _args, { models, user }, _info) {
      const { Registration } = models

      const registration = await Registration.findOne({
        course: course._id,
        user: user.id,
      })
      return registration?.invite === 'requested'
    },
    isArchived(course, _args, _context, _info) {
      return !!course.archived
    },
    isCoordinator(course, _args, { user }, _info) {
      const coordinator = course.coordinator
      return (coordinator?._id || coordinator)?.toString() === user.id
    },
    isPublished(course, _args, _context, _info) {
      return !!course.published
    },
    async isRegistered(course, _args, { models, user }, _info) {
      const { Registration } = models

      const registration = await Registration.findOne({
        course: course._id,
        user: user.id,
      })

      return !!registration && !registration.invite
    },
    isTeacher(course, _args, { user }, _info) {
      return !!course.teachers?.some((t) => (t._id || t).toString() === user.id)
    },
    async partners(course, _args, { models }, _info) {
      const { Partner } = models

      return await Partner.find({ _id: { $in: course.partners } })
    },
    async registration(course, _args, { models, user }, _info) {
      const { Registration } = models

      return await Registration.findOne({ course: course._id, user: user.id })
    },
    async registrations(course, _args, { models }, _info) {
      const { Registration } = models

      return await Registration.find({ course: course._id }).populate('user')
    },
    status(course, _args, _content, _info) {
      if (!course.published) {
        return 'unpublished'
      }
      if (!course.archived) {
        return 'published'
      }
      if (course.archived) {
        return 'archived'
      }

      return null
    },
    team(course, _args, _context, _info) {
      const team = []

      // Add all the teachers.
      const teachers = course.teachers
      if (teachers) {
        team.push(...teachers)
      }

      // Add the coordinator if he/she is not also a teacher.
      const coordinator = course.coordinator
      if (
        !team.find(
          (t) =>
            (t._id || t).toString() ===
            (coordinator._id || coordinator).toString()
        )
      ) {
        team.push(coordinator)
      }

      return team
    },
  },
  Query: {
    async courses(_parent, args, { models, user }, _info) {
      const { Course } = models

      const pipeline = []

      // Basically, can only retrieve courses that are:
      // with the 'public' or invite-only' visibilities,
      // and with the 'published' status.
      const filter = {
        $or: [
          {
            $and: [
              { published: { $exists: true } },
              { archived: { $exists: false } },
              {
                $or: [{ visibility: 'public' }, { visibility: 'invite-only' }],
              },
            ],
          },
        ],
      }

      // If a user is connected,
      // adjust the filter according to his/her roles.
      if (user && args.view !== 'user') {
        const { roles } = user
        const userId = new mongoose.Types.ObjectId(user.id)

        // Teachers can also access their own courses
        // no matter their status or visibility.
        if (roles.includes('teacher')) {
          filter.$or.push({ coordinator: userId }, { teachers: userId })
        }

        // Students can also access the courses they are registered to
        // no matter their status or visibility.
        if (roles.includes('student')) {
          pipeline.push(
            {
              $lookup: {
                from: 'registrations',
                localField: '_id',
                foreignField: 'course',
                as: 'registrations',
              },
            },
            {
              $addFields: {
                isRegistered: {
                  $anyElementTrue: {
                    $map: {
                      input: '$registrations',
                      as: 'registration',
                      in: {
                        $and: [
                          { $eq: ['$$registration.user', userId] },
                          {
                            $eq: [
                              { $type: '$$registration.invitation' },
                              'missing',
                            ],
                          },
                        ],
                      },
                    },
                  },
                },
              },
            }
          )

          filter.$or.push({ isRegistered: true })
        }

        // Admin can access to all the courses.
        if (roles.includes('admin')) {
          delete filter.$or
        }

        // If the view argument is defined,
        // adjust the filter according to it.
        const { view } = args
        if (view) {
          switch (view) {
            case 'coordinator':
              filter.$or = [{ coordinator: userId }]
              break

            case 'student':
              filter.$or = [{ isRegistered: true }]
              break

            case 'teacher':
              filter.$or = [
                {
                  $and: [
                    { published: { $exists: true } },
                    { $or: [{ coordinator: userId }, { teachers: userId }] },
                  ],
                },
              ]
              break
          }
        }
      }

      // Only set the defined filter when no user is connected,
      // or if the connected one has not the admin role.
      if (!user || !user.roles.includes('admin')) {
        pipeline.push({ $match: filter })
      }

      // Set up offset and limit.
      pipeline.push({ $skip: Math.max(0, args.offset ?? 0) })
      if (args.limit) {
        pipeline.push({ $limit: args.limit })
      }

      // Retrieve all the courses satisfying the conditions defined hereabove
      // of all the competencies if the connected user has the admin role.
      pipeline.push({ $project: { registrations: 0 } })
      const courses = await Course.aggregate(pipeline)

      return courses
    },
    async course(_parent, args, { models, user }, _info) {
      const { Course } = models

      let course = await Course.findOne({ code: args.code })
      if (!course) {
        throw new UserInputError('Course not found.')
      }

      // If no user is authenticated,
      // reject the request if the course has not been published or is archived
      if (
        !user &&
        (!course.published ||
          course.archived ||
          course.visibility === 'private')
      ) {
        throw new UserInputError('Course not found.')
      }

      course = await Course.populate(course, [
        {
          path: 'competencies.competency',
          select: 'code description name',
          model: 'Competency',
        },
        {
          path: 'coordinator',
          select: '_id displayName username',
          model: 'User',
        },
        { path: 'teachers', select: '_id displayName username', model: 'User' },
      ]).then((c) => c.toJSON())

      // Rename the 'id' field of the coordinator and teachers
      course.coordinator.id = course.coordinator._id.toString()
      if (course.teachers) {
        course.teachers.forEach((t) => (t.id = t._id.toString()))
      }

      // Restructure the format of the schedule
      if (course.schedule) {
        course.schedule = Object.entries(course.schedule).map(
          ([name, date]) => ({ name, date })
        )
      }

      return course
    },
  },
  Mutation: {
    async archiveCourse(_parent, args, { models, user }, _info) {
      const { Course } = models

      const course = await Course.findOne({ code: args.code })
      if (!course) {
        throw new UserInputError('COURSE_NOT_FOUND')
      }

      // Can only archive a course that is published.
      if (
        !course.published ||
        course.archived ||
        !isCoordinator(course, user)
      ) {
        throw new UserInputError('COURSE_ARCHIVING_FAILED')
      }

      // TODO: Can only archive a course with respect to its schedule.

      // Archive the course
      const archiveDate = DateTime.now()
      if (!args.archiveCode) {
        args.archiveCode = `${course.code}_${archiveDate.toFormat(
          'yyyy-MM-dd_HH-mm'
        )}_archived`
      }
      course.archived = archiveDate.toISO()
      course.code = args.archiveCode

      // Save the course into the database.
      try {
        return await course.save()
      } catch (err) {
        console.log(err)
      }

      return null
    },
    async createCourse(_parent, args, { models, user }, _info) {
      const { Competency, Course, User } = models

      // Clean up the optional args.
      if (args.groups?.length === 0) {
        args.groups = undefined
      }
      if (args.teachers?.length === 0) {
        args.teachers = undefined
      }

      // Create the course Mongoose object.
      const course = new Course(args)
      course.competencies = await Promise.all(
        args.competencies.map(async (c) => ({
          ...c,
          competency: (await Competency.findOne({ code: c.competency }))?._id,
        }))
      )
      course.coordinator = user.id
      if (args.groups) {
        course.groups = await Promise.all(
          args.groups.map(async (g) => ({
            ...g,
            supervisor: (await User.findOne({ username: g.supervisor }))?._id,
          }))
        )
      }
      if (args.teachers) {
        course.teachers = await Promise.all(
          args.teachers.map(async (t) => await User.findOne({ username: t }))
        )
      }
      course.user = user.id

      // Save the course into the database.
      try {
        await course.save()
        return true
      } catch (err) {
        const formErrors = {}

        switch (err.name) {
          case 'MongoServerError':
            switch (err.code) {
              case 11000:
                throw new UserInputError('EXISTING_CODE', {
                  formErrors: {
                    code: 'The specified code already exists',
                  },
                })
            }
            break

          case 'ValidationError':
            Object.keys(err.errors).forEach(
              (e) => (formErrors[e] = err.errors[e].properties.message)
            )
            throw new UserInputError('VALIDATION_ERROR', { formErrors })
        }
      }

      return false
    },
    async publishCourse(_parent, args, { models, user }, _info) {
      const { Course } = models

      const course = await Course.findOne({ code: args.code })
      if (!course) {
        throw new UserInputError('COURSE_NOT_FOUND')
      }

      // Can only publish a course that is not published yet
      // and only the course coordinator can publish it.
      if (course.published || course.archived || !isCoordinator(course, user)) {
        throw new UserInputError('COURSE_PUBLICATION_FAILED')
      }

      // TODO: Can only publish a course with respect to its schedule.

      // Publish the course
      course.published = new Date()

      // Save the course into the database.
      try {
        return await course.save()
      } catch (err) {
        console.log(err)
      }

      return null
    },
    async register(_parent, args, { models, user }, _info) {
      const { Course, Registration } = models

      const course = await Course.findOne({ code: args.code })
      if (!course) {
        throw new UserInputError('Course not found.')
      }

      // Can only directly register to
      // a published course with 'public' visibility.
      if (
        !course.published ||
        course.archived ||
        course.visibility !== 'public'
      ) {
        throw new UserInputError('REGISTRATION_FAILED')
      }

      // Coordinator and teacher cannot register to their own course.
      if (isCoordinator(course, user) || isTeacher(course, user)) {
        throw new UserInputError('REGISTRATION_FAILED')
      }

      // Can only register if it agrees with the schedule of the course.
      const now = DateTime.now()
      if (!canEnroll(course.schedule, now)) {
        throw new UserInputError('REGISTRATION_FAILED')
      }

      // Check whether there is not already a registration.
      const userId = user.id
      const registration = await Registration.findOne({
        course: course._id,
        user: userId,
      })
      if (registration) {
        throw new UserInputError('REGISTRATION_FAILED')
      }

      // Create a new registration for the user.
      try {
        const registration = new Registration({
          course: course._id,
          date: now,
          user: userId,
        })
        course.registration = await registration.save()

        return course
      } catch (err) {
        console.log(err)
      }

      throw new UserInputError('REGISTRATION_FAILED')
    },
    async requestInvite(_parent, args, { models, user }, _info) {
      const { Course, Registration } = models

      const course = await Course.findOne({ code: args.code })
      if (!course) {
        throw new UserInputError('Course not found.')
      }

      // Can only request an invite for
      // a published course with 'invite-only' visibility.
      if (
        !course.published ||
        course.archived ||
        course.visibility !== 'invite-only'
      ) {
        throw new UserInputError('INVITE_REQUEST_FAILED')
      }

      // Coordinator and teacher cannot request an invite for their own course.
      if (isCoordinator(course, user) || isTeacher(course, user)) {
        throw new UserInputError('INVITE_REQUEST_FAILED')
      }

      // Can only request an invite if it agrees with the schedule of the course.
      const now = DateTime.now()
      if (!canEnroll(course.schedule, now)) {
        throw new UserInputError('INVITE_REQUEST_FAILED')
      }

      // Check whether there is not already a registration.
      const userId = user.id
      const registration = await Registration.findOne({
        course: course._id,
        user: userId,
      })
      if (registration) {
        throw new UserInputError('INVITE_REQUEST_FAILED')
      }

      // Create a new registration for the user,
      // representing the invite request.
      try {
        const registration = new Registration({
          course: course._id,
          date: now,
          invite: 'requested',
          user: userId,
        })
        course.registration = await registration.save()

        return course
      } catch (err) {
        console.log(err)
      }

      throw new UserInputError('INVITE_REQUEST_FAILED')
    },
  },
}

export default resolvers
