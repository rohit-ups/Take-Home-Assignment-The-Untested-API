const express = require('express');
const router = express.Router();
const taskService = require('../services/taskService');
const { validateCreateTask, validateUpdateTask, validateAssignTask } = require('../utils/validators');

router.get('/stats', (req, res) => {
  const stats = taskService.getStats();
  res.json(stats);
});

router.get('/', (req, res) => {
  const { status, page, limit } = req.query;

  // Pagination is checked first so it also applies to filtered results (#6).
  if (page !== undefined || limit !== undefined) {
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const tasks = taskService.getPaginated(pageNum, limitNum, status);
    return res.json(tasks);
  }

  if (status) {
    const tasks = taskService.getByStatus(status);
    return res.json(tasks);
  }

  const tasks = taskService.getAll();
  res.json(tasks);
});

router.post('/', (req, res) => {
  const error = validateCreateTask(req.body);
  if (error) {
    return res.status(400).json({ error });
  }

  const task = taskService.create(req.body);
  res.status(201).json(task);
});

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

router.delete('/:id', (req, res) => {
  const deleted = taskService.remove(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.status(204).send();
});

router.patch('/:id/complete', (req, res) => {
  const task = taskService.completeTask(req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.json(task);
});

// Assigning never silently takes a task from someone: a different name on an
// already-assigned task is a 409, and the client must unassign it first with
// { "assignee": null }. Sending the current assignee again is a harmless 200,
// so retries are safe.
router.patch('/:id/assign', (req, res) => {
  const error = validateAssignTask(req.body);
  if (error) {
    return res.status(400).json({ error });
  }

  const task = taskService.findById(req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const assignee = req.body.assignee === null ? null : req.body.assignee.trim();
  if (task.assignee && assignee !== null && assignee !== task.assignee) {
    return res.status(409).json({ error: `Task is already assigned to ${task.assignee}` });
  }

  res.json(taskService.assignTask(task.id, assignee));
});

module.exports = router;
