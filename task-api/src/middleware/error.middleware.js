import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

export const errorMiddleware = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  if (env.NODE_ENV === 'development') {
    logger.error(`[${req.method}] ${req.path} >> ${statusCode} ${message}\n${err.stack}`);
  } else {
    logger.error(`[${req.method}] ${req.path} >> ${statusCode} ${message}`);
  }

  res.status(statusCode).json({
    success: false,
    message,
    error: env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};
