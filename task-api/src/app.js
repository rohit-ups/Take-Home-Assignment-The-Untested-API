/*
 * File Role:
 * This is the single Express application composition root. It wires middleware,
 * mounts feature routes, and defines global 404/error handlers.
 *
 * The app instance is exported directly (instead of a factory) so tests can import
 * one stable app object and send in-memory requests through supertest without opening
 * a real network port.
 */

const express = require('express');
const taskRoutes = require('./routes/tasks');

const app = express();

// Parse JSON request bodies before hitting route handlers.
app.use(express.json());

/*
 * All task API traffic enters the route module here; data then flows
 * request -> route validation -> task service -> HTTP response.
 */
app.use('/tasks', taskRoutes);

/*
 * 404 middleware must be after all route registrations so only truly unmatched
 * requests fall through to this handler.
 */
// Keep unknown endpoints consistent with API JSON error format.
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

/**
 * WHY: Express treats handlers with 4 arguments as error middleware and only calls them
 * when next(err) is triggered or an exception bubbles through async/sync route flow.
 * HOW: Captures unexpected failures into one consistent JSON 500 response.
 *
 * @param {Error} err - Error raised during middleware/route execution.
 * @param {import('express').Request} req - Current request object.
 * @param {import('express').Response} res - Response writer.
 * @param {import('express').NextFunction} next - Express continuation callback (unused).
 * @returns {void} Sends standardized internal server error payload.
 * @behavior Must retain 4-argument signature for Express to classify it as error middleware.
 */
// Centralized fallback error handler for uncaught route/service errors.
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;

/**
 * WHY: Tests need startup behavior verification (port binding and startup logging)
 * without executing the process entrypoint branch.
 * HOW: Exposes a callable startup helper as a property on the exported app object.
 *
 * @param {number|string} [port=PORT] - Listening port to bind.
 * @returns {import('http').Server} Node HTTP server instance from app.listen.
 * @behavior Called in production entrypoint and directly in bootstrap unit tests.
 */
// Exported helper improves testability while preserving runtime startup behavior.
const startServer = (port = PORT) =>
  app.listen(port, () => {
    console.log(`Task API running on port ${port}`);
  });

/* istanbul ignore next */
if (require.main === module) {
  startServer(PORT);
}

module.exports = app;
module.exports.startServer = startServer;
