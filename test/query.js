import { ApolloServer } from 'apollo-server'
import chai from 'chai'
import dotenv from 'dotenv'
import { GraphQLError } from 'graphql'
import jwt from 'jsonwebtoken'
import { describe, it, before } from 'mocha'

import { models, schema } from '../data/schema.js'
import { connectDB, disconnectDB } from '../lib/mongoose.js'

const expect = chai.expect

dotenv.config({ path: `.env.${process.env.NODE_ENV}` })

// Connect to MongoDB.
await connectDB(process.env.MONGODB_URI)

// Remove all existing documents from all the models.
await Promise.all(
  Object.keys(models).map(async (m) => {
    await models[m].deleteMany()
  })
)

describe('Test Course queries', () => {
  let testServer
  let teacher
  let comp1
  let C1

  const user1 = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@doe.com',
    password: 'a6M?fC3$',
    provider: 'local',
    roles: ['user', 'teacher'],
  }

  const competency1 = {
    code: 'C1',
    name: 'Competency 1',
  }

  const course1 = {
    code: 'C1',
    name: 'Course 1',
    description: 'This is the first course',
  }

  const signIn = async function ({ usernameOrEmail, password }) {
    const result = await testServer.executeOperation({
      query:
        'mutation signIn($usernameOrEmail: String!, $password: String!) { signIn(usernameOrEmail: $usernameOrEmail, password: $password) { token } }',
      variables: { usernameOrEmail, password },
    })
    return `Bearer: ${result.data.signIn?.token}`
  }

  before(async () => {
    const getUser = function (token) {
      if (token) {
        try {
          token = token.split(' ')[1]
          return jwt.verify(token, process.env.JWT_SECRET)
        } catch (err) {
          return null
        }
      }
    }

    testServer = new ApolloServer({
      schema,
      context: ({ req }) => {
        const token = req?.headers?.authorization || ''
        const user = getUser(token)
        return {
          env: process.env,
          models,
          user,
        }
      },
    })

    // Create a new user which is a teacher.
    teacher = new models.User(user1)
    teacher.updateEmail(user1.email)
    await teacher.save()

    // Create a new competency.
    comp1 = new models.Competency(competency1)
    await comp1.save()

    // Create a new course which is published.
    C1 = new models.Course(course1)
    C1.competencies = [
      {
        competency: comp1._id,
        category: 'basic',
      },
    ]
    C1.coordinator = teacher._id
    C1.published = new Date()
    await C1.save()
  })

  after(() => {
    testServer.stop()
    disconnectDB()
  })

  it('should retrieve the correct course if it does exist and if it is published.', async () => {
    const result = await testServer.executeOperation({
      query: 'query GetCourse($code: ID!) { course(code: $code) { code } }',
      variables: { code: 'C1' },
    })

    expect(result.errors).to.be.undefined
    expect(result.data?.course?.code).to.equal('C1')
  })

  it("should return a GraphQLError with the 'BAD_USER_INPUT' code if the course does not exist", async () => {
    const result = await testServer.executeOperation({
      query: 'query GetCourse($code: ID!) { course(code: $code) { code } }',
      variables: { code: 'C0' },
    })

    expect(result.errors).to.be.an('array')
    expect(result.errors).to.have.lengthOf(1)
    expect(result.errors[0]).to.be.an.instanceof(GraphQLError)
    expect(result.errors[0]?.extensions?.code).to.equal('BAD_USER_INPUT')
  })

  it("should return an AuthenticationError when asking for the 'registration' field without being authenticated", async () => {
    const result = await testServer.executeOperation({
      query:
        'query GetCourse($code: ID!) { course(code: $code) { code, registration { datetime } } }',
      variables: { code: 'C1' },
    })

    expect(result.errors).to.be.an('array')
    expect(result.errors).to.have.lengthOf(1)
    expect(result.errors[0]).to.be.an.instanceof(GraphQLError)
    expect(result.errors[0]?.extensions?.code).to.equal('UNAUTHENTICATED')
  })

  it("should obtain 'null' when asking for the 'registration' field for an authenticated user that is not registered at all", async () => {
    const token = await signIn({
      usernameOrEmail: user1.email,
      password: user1.password,
    })
    const result = await testServer.executeOperation(
      {
        query:
          'query GetCourse($code: ID!) { course(code: $code) { code, registration { datetime } } }',
        variables: { code: 'C1' },
      },
      {
        req: {
          headers: {
            authorization: token,
          },
        },
      }
    )

    expect(result.errors).to.be.undefined
    expect(result.data?.course?.registration).to.be.null
  })
})
