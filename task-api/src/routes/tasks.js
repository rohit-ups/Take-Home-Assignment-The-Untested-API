const express = require('express');
const router = express.Router();
const taskService = require('../services/taskService');
const { validateCreateTask, validateUpdateTask } = require('../utils/validators');

router.get('/stats', (req, res) => {
  const stats = taskService.getStats();
  res.json(stats);
});

router.get('/', (req, res) => {
  const { status, page, limit } = req.query;

  // Start with all tasks or filtered tasks
  let tasks = status ? taskService.getByStatus(status) : taskService.getAll();

  // Apply pagination if page or limit parameters were provided
  if (page !== undefined || limit !== undefined) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);

    const offset = (pageNum - 1) * limitNum;
    tasks = tasks.slice(offset, offset + limitNum);
  }

  // Return the processed result
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

module.exports = router;
