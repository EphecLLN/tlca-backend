import { gql } from 'apollo-server'

const typeDefs = gql`
  type Partner {
    abbreviation: String
    banner: String
    code: ID!
    courses: [Course!]
    description: String!
    logo: String
    name: String!
    representative: User!
    website: String
  }

  extend type Query {
    partner(code: ID!): Partner
    partners(limit: Int): [Partner!]!
  }
`

export default typeDefs
