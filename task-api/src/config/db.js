import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(env.MONGODB_URI);
    logger.info(`🚀 MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    logger.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
