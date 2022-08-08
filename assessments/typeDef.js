import { gql } from 'apollo-server'

const typeDefs = gql`
  enum AssessmentCategory {
    CASESTUDY
    CODING
    EXERCISE
    INTERVIEW
    MISSION
    PROJECT
    QUIZ
  }

  type AssessmentCompetency {
    competency: Competency!
    stars: Int!
    optional: Boolean
  }

  type Assessment {
    category: AssessmentCategory!
    code: String
    competencies: [AssessmentCompetency!]!
    course: Course!
    description: String!
    end: DateTime
    id: ID!
    name: String!
    start: DateTime
  }

  extend type Query {
    assessment(id: ID!): Assessment @auth(requires: TEACHER)
  }

  input AssessmentCompetencyInput {
    competency: ID!
    stars: Int!
    optional: Boolean
  }

  extend type Mutation {
    createAssessment(
      category: AssessmentCategory!
      code: String
      competencies: [AssessmentCompetencyInput!]!
      course: ID!
      description: String!
      end: DateTime
      name: String!
      start: DateTime
    ): Assessment @auth(requires: TEACHER)
  }
`

export default typeDefs
