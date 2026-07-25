const express = require('express');
const router = express.Router();
const taskService = require('../services/taskService');
const { validateCreateTask, validateUpdateTask, validateAssignTask } = require('../utils/validators');

/**
 * GET /tasks/stats
 * Retrieves task statistics (counts by status and overdue count).
 */
router.get('/stats', (req, res) => {
  const stats = taskService.getStats();
  res.json(stats);
});

/**
 * GET /tasks
 * Retrieves tasks with optional status filter and/or pagination.
 */
router.get('/', (req, res) => {
  const { status, page, limit } = req.query;
  const tasks = taskService.queryTasks({ status, page, limit });
  res.json(tasks);
});

/**
 * GET /tasks/:id
 * Retrieves a single task by ID.
 */
router.get('/:id', (req, res) => {
  const task = taskService.findById(req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  res.json(task);
});

/**
 * POST /tasks
 * Creates a new task.
 */
router.post('/', (req, res) => {
  const error = validateCreateTask(req.body);
  if (error) {
    return res.status(400).json({ error });
  }

  const task = taskService.create(req.body);
  res.status(201).json(task);
});

/**
 * PUT /tasks/:id
 * Fully updates a task.
 */
router.put('/:id', (req, res) => {
  const error = validateUpdateTask(req.body);
  if (error) {
    return res.status(400).json({ error });
  }

  const task = taskService.update(req.params.id, req.body);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.json(task);
});

/**
 * DELETE /tasks/:id
 * Deletes a task by ID.
 */
router.delete('/:id', (req, res) => {
  const deleted = taskService.remove(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.status(204).send();
});

/**
 * PATCH /tasks/:id/complete
 * Marks a task as complete ('done').
 */
router.patch('/:id/complete', (req, res) => {
  const task = taskService.completeTask(req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.json(task);
});

/**
 * PATCH /tasks/:id/assign
 * Assigns a user to a task.
 */
router.patch('/:id/assign', (req, res) => {
  const error = validateAssignTask(req.body);
  if (error) {
    return res.status(400).json({ error });
  }

  const task = taskService.assignTask(req.params.id, req.body.assignee);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.json(task);
});

module.exports = router;

