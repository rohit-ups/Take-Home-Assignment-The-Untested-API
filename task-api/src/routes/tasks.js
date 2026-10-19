const express = require('express');
const router = express.Router();
const taskService = require('../services/taskService');
const { validateCreateTask, validateUpdateTask, validateListQuery, validateAssignTask } = require('../utils/validators');

router.get('/stats', (req, res) => {
  const stats = taskService.getStats();
  res.json(stats);
});

router.get('/', (req, res) => {
  const { status, page, limit } = req.query;
  const error = validateListQuery(req.query);
  if (error) return res.status(400).json({ error });

  if (page !== undefined || limit !== undefined) {
    const pageNum = Number(page ?? 1);
    const limitNum = Number(limit ?? 10);
    const tasks = taskService.getPaginated(pageNum, limitNum, status);
    return res.json(tasks);
  }

  const tasks = status === undefined ? taskService.getAll() : taskService.getByStatus(status);
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

router.patch('/:id/assign', (req, res) => {
  const error = validateAssignTask(req.body);
  if (error) return res.status(400).json({ error });

  const task = taskService.assignTask(req.params.id, req.body.assignee.trim());
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
});

module.exports = router;
