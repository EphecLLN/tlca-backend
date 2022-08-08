import { gql } from 'apollo-server'

const typeDefs = gql`
  enum RegistrationInvitation {
    REQUESTED
    SENT
  }

  type RegistrationGroup {
    teaching: Int
    working: Int
  }

  type Registration {
    datetime: DateTime!
    email: String
    group: RegistrationGroup
    id: ID!
    invitation: RegistrationInvitation
    user: User
  }

  extend type Mutation {
    acceptInvitationRequest(id: ID!): Registration @auth(requires: TEACHER)
    removeGroup(id: ID!, group: Int!, type: GroupType!): Registration
      @auth(requires: TEACHER)
    updateGroup(id: ID!, group: Int!, type: GroupType!): Registration
      @auth(requires: TEACHER)
  }
`

export default typeDefs
