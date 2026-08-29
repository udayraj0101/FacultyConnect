import mongoose from 'mongoose';
import { createLogger } from '../utils/logger.js';

let cached = global._mongoose || { conn: null, promise: null };
global._mongoose = cached;
const logger = createLogger('db');

export async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }
  if (!cached.promise) {
    logger.info('connecting to MongoDB');
    cached.promise = mongoose.connect(process.env.MONGODB_URI);
  }
  cached.conn = await cached.promise;
  logger.info('MongoDB connected');
  return cached.conn;
}
