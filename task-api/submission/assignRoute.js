/**
 * New feature: PATCH /tasks/:id/assign
 *
 * This file is deliberately separate from src/routes/tasks.js. The take-home
 * requested a new endpoint while the review constraint says not to alter the
 * existing source files.
 *
 * Business decision documented here:
 * - assignee must be a non-empty string after trimming;
 * - an already-assigned task may be reassigned;
 * - a missing task returns 404.
 */
const taskService = require('../src/services/taskService');

function registerAssignRoute(app) {
  app.patch('/tasks/:id/assign', (req, res) => {
    // `req.body || {}` prevents a null body from causing a TypeError here.
    const { assignee } = req.body || {};

    // Validate at the HTTP boundary so invalid values never reach the service.
    if (typeof assignee !== 'string' || assignee.trim() === '') {
      return res.status(400).json({
        error: 'assignee is required and must be a non-empty string',
      });
    }

    // Reuse the existing service/data path rather than creating another store.
    const task = taskService.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Store the normalized value. Reassignment is intentionally allowed.
    const updatedTask = taskService.update(req.params.id, {
      assignee: assignee.trim(),
    });

    return res.json(updatedTask);
  });
}

module.exports = registerAssignRoute;
