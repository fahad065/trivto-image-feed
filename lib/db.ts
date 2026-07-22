import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

// Reused across hot reloads in dev so we don't open a new connection per request.
const globalForMongoose = globalThis as unknown as { mongoose?: MongooseCache };
const cache: MongooseCache = globalForMongoose.mongoose ?? { conn: null, promise: null };
globalForMongoose.mongoose = cache;

export async function connectToDatabase() {
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not set. Add it to .env.local (see .env.example).");
  }

  if (cache.conn) {
    return cache.conn;
  }

  if (!cache.promise) {
    // Set explicitly so we land on the intended database regardless of whether
    // the connection string's path segment specifies one (Atlas's copy-paste
    // URI omits it and Mongoose would otherwise default to "test").
    cache.promise = mongoose.connect(MONGODB_URI, { dbName: "trivto" });
  }

  cache.conn = await cache.promise;
  return cache.conn;
}
