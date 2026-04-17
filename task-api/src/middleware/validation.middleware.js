import { ApiError } from '../utils/ApiError.js';

export const validate = (schema) => (req, res, next) => {
  try {
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    next();
  } catch (error) {
    const errorMessage = error.errors
      .map((details) => details.message)
      .join(', ');
    next(new ApiError(400, errorMessage));
  }
};
