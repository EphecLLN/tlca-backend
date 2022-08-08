import { makeExecutableSchema } from '@graphql-tools/schema'
import { gql } from 'apollo-server'

import {
  authDirectiveTypeDefs,
  authDirectiveTransformer,
} from '../directives/auth-directive.js'

import assessments from '../assessments/index.js'
import competencies from '../competencies/index.js'
import courses from '../courses/index.js'
import files from '../files/index.js'
import partners from '../partners/index.js'
import programs from '../programs/index.js'
import registrations from '../registrations/index.js'
import users from '../users/index.js'

const typeDefs = gql`
  scalar Date
  scalar DateTime

  type Query
  type Mutation
`

let schema = makeExecutableSchema({
  typeDefs: [
    authDirectiveTypeDefs,
    typeDefs,
    assessments.typeDef,
    competencies.typeDef,
    courses.typeDef,
    files.typeDef,
    partners.typeDef,
    programs.typeDef,
    registrations.typeDef,
    users.typeDef,
  ],
  resolvers: [
    assessments.resolvers,
    competencies.resolvers,
    courses.resolvers,
    files.resolvers,
    partners.resolvers,
    programs.resolvers,
    registrations.resolvers,
    users.resolvers,
  ],
})
schema = authDirectiveTransformer(schema)

const models = {
  Assessment: assessments.Assessment,
  Competency: competencies.Competency,
  Course: courses.Course,
  Partner: partners.Partner,
  Program: programs.Program,
  Registration: registrations.Registration,
  User: users.User,
}

export { schema, models }
