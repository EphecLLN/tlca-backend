import { gql } from 'apollo-server'

const typeDefs = gql`
  enum BannerType {
    COURSE
    PARTNER
    PROGRAM
  }

  type Banner {
    path: String
  }

  extend type Mutation {
    updateBanner(
      code: String!
      image: String!
      name: String!
      type: BannerType!
    ): Banner @auth(requires: TEACHER)
  }
`

export default typeDefs
