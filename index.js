import { ApolloServer } from 'apollo-server'
import dotenv from 'dotenv'
import jwt from 'jsonwebtoken'

import { schema, models } from './data/schema.js'
import { connectDB } from './lib/mongoose.js'

dotenv.config({ path: `.env.${process.env.NODE_ENV}` })

// Connect to MongoDB.
await connectDB(process.env.MONGODB_URI)

// Extract the user from the token for authentication.
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

// Create and configure the Apollo server.
const server = new ApolloServer({
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

// Launch the apollo server.
server.listen({ port: 4001 }).then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`)
})
