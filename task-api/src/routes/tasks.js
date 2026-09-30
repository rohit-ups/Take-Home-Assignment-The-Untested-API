const express = require('express');
const router = express.Router();
const taskService = require('../services/taskService');
const { VALID_STATUSES, validateCreateTask, validateUpdateTask, validateAssignTask } = require('../utils/validators');

const parsePositiveInteger = (value, fallback) => {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) ? number : null;
};

router.get('/stats', (req, res) => {
  const stats = taskService.getStats();
  res.json(stats);
});

router.get('/', (req, res) => {
  const { status, page, limit } = req.query;

  if (status !== undefined &&
      (typeof status !== 'string' || !VALID_STATUSES.includes(status))) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  let tasks = status === undefined
    ? taskService.getAll()
    : taskService.getByStatus(status);

  if (page !== undefined || limit !== undefined) {
    const pageNum = parsePositiveInteger(page, 1);
    const limitNum = parsePositiveInteger(limit, 10);
    if (pageNum === null || limitNum === null) {
      return res.status(400).json({ error: 'page and limit must be positive safe integers' });
    }
    const offset = (pageNum - 1) * limitNum;
    tasks = tasks.slice(offset, offset + limitNum);
  }

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
  return res.json(task);
});

module.exports = router;
