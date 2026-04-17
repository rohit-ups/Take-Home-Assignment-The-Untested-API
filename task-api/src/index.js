import app from './app.js';
import connectDB from './config/db.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';

const start = async () => {
  try {
    await connectDB();
    app.listen(env.PORT, () => {
      logger.info(`✨ Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
      logger.info(`📖 API Documentation: http://localhost:${env.PORT}/api-docs`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

start();
