import mongoose from 'mongoose'

// Connect to the MongoDB database.
export async function connectDB(databaseUrl) {
  try {
    await mongoose.connect(databaseUrl, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })

    console.log(`Connected to MongoDB at ${databaseUrl}.`)
  } catch (err) {
    console.error('Failed to connect to MongoDB.')
  }
}

export function disconnectDB() {
  mongoose.connection?.close()
}
