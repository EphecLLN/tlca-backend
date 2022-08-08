function isCoordinator(course, user) {
  const userId = user?.id
  return (course.coordinator._id || course.coordinator).toString() === userId
}

function isTeacher(course, user) {
  const userId = user?.id
  return !!course.teachers?.some((t) => (t._id || t).toString() === userId)
}

export { isCoordinator, isTeacher }
