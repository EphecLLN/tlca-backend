import { UserInputError } from 'apollo-server'

import { isCoordinator } from '../lib/courses.js'

const resolvers = {
  RegistrationInvitation: {
    REQUESTED: 'requested',
    SENT: 'sent',
  },
  Mutation: {
    // Accept an invitation request made by a user/student for a given course.
    async acceptInvitationRequest(_parent, args, { models, user }, _info) {
      const { Course, Registration, User } = models

      const registration = await Registration.findOne({ _id: args.id })
      if (!registration) {
        throw new UserInputError('REGISTRATION_NOT_FOUND')
      }

      // Can only accept invitation request if there is one.
      if (registration.invitation !== 'requested') {
        throw new UserInputError('INVITATION_REQUEST_ACCEPTANCE_FAILED')
      }

      const course = await Course.findOne({ _id: registration.course }).lean()
      if (!course) {
        throw new UserInputError('COURSE_NOT_FOUND')
      }

      // Only the coordinator can accept an invitation request
      // for a course with the 'published' status and 'invite-only' visibility.
      if (
        !isCoordinator(course, user) ||
        !course.published ||
        course.archived ||
        course.visibility !== 'invite-only'
      ) {
        throw new UserInputError('INVITATION_REQUEST_ACCEPTANCE_FAILED')
      }

      // TODO: Can only accept an invitation request when the course is not finished.

      // Accept the invitation request.
      registration.invitation = undefined

      // Save the registration into the database.
      try {
        // Check if the registered user has the student role
        // and add it to him/her if not.
        const user = await User.findOne({ _id: registration.user })
        if (!user.roles.includes('student')) {
          user.roles.push('student')
          await user.save()
        }

        return await registration.save()
      } catch (err) {
        console.log(err)
      }

      return null
    },
    // Update the teaching or working group associated to this registration.
    async updateGroup(_parent, args, { models, user }, _info) {
      const { Course, Registration } = models

      const groupType = args.type.toLowerCase()

      const registration = await Registration.findOne({ _id: args.id })
      if (!registration) {
        throw new UserInputError('REGISTRATION_NOT_FOUND')
      }

      // Group can only be assigned for confirmed registrations.
      if (registration.invitation) {
        throw new UserInputError('GROUP_ASSIGNMENT_FAILED')
      }

      const course = await Course.findOne({ _id: registration.course }).lean()
      if (!course) {
        throw new UserInputError('COURSE_NOT_FOUND')
      }

      // Only the coordinator can update the group of a student
      // for a course for which groups have been defined.
      if (
        !isCoordinator(course, user) ||
        !course.groups ||
        !course.groups[groupType]?.length ||
        !(args.group >= 0 && args.group < course.groups[groupType].length)
      ) {
        throw new UserInputError('GROUP_ASSIGNMENT_FAILED')
      }

      // TODO: Can only update the group when the course is not finished.

      // Update the group assignment of the student.
      if (!registration.group) {
        registration.group = {}
      }
      registration.group[groupType] = args.group

      // Save the registration into the database.
      try {
        return await registration.save()
      } catch (err) {
        console.log(err)
      }

      return null
    },
  },
}

export default resolvers
