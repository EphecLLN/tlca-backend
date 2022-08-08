import { gql } from 'apollo-server'

const typeDefs = gql`
  type SignInResponse {
    token: String!
  }

  type User {
    displayName: String!
    email: String!
    firstName: String
    id: ID!
    isValidated: Boolean
    lastName: String
    roles: [String!]!
    username: ID!
  }

  extend type Query {
    me: User
    users(offset: Int, limit: Int): [User!]! @auth(requires: ADMIN)
    colleagues: [User!]! @auth(requires: TEACHER)
  }

  extend type Mutation {
    signIn(usernameOrEmail: String!, password: String!): SignInResponse!
    signOut: Boolean @auth
    signUp(email: String!, password: String!): Boolean
  }
`

export default typeDefs
