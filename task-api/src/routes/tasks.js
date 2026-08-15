const express = require('express');
const router = express.Router();
const taskService = require('../services/taskService');
const { validateCreateTask, validateUpdateTask, validateStatus } = require('../utils/validators');

// Immutable task fields that callers must never be able to overwrite via PUT.
const IMMUTABLE_FIELDS = ['id', 'createdAt'];

router.get('/stats', (req, res) => {
  const stats = taskService.getStats();
  res.json(stats);
});

router.get('/', (req, res) => {
  const { status, page, limit } = req.query;

  // FM-A fix: validate the status query param before using it.
  if (status) {
    const statusError = validateStatus(status);
    if (statusError) {
      return res.status(400).json({ error: statusError });
    }
  }

  // FM-C fix: when both status and pagination params are present,
  // filter by status first, then slice the result for pagination.
  if (status && (page !== undefined || limit !== undefined)) {
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const filtered = taskService.getByStatus(status);
    const offset = (pageNum - 1) * limitNum;
    return res.json(filtered.slice(offset, offset + limitNum));
  }

  if (status) {
    return res.json(taskService.getByStatus(status));
  }

  if (page !== undefined || limit !== undefined) {
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    return res.json(taskService.getPaginated(pageNum, limitNum));
  }

  res.json(taskService.getAll());
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

  // FM-B fix: strip immutable fields so callers cannot overwrite id/createdAt.
  const safeFields = { ...req.body };
  IMMUTABLE_FIELDS.forEach((field) => delete safeFields[field]);

  const task = taskService.update(req.params.id, safeFields);
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

module.exports = router;
