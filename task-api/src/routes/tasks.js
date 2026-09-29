const express = require('express');
const router = express.Router();
const taskService = require('../services/taskService');
const { validateCreateTask, validateUpdateTask } = require('../utils/validators');


router.get('/stats', (req, res) => {
  try {
    const stats = taskService.getStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});


router.get('/', (req, res) => {
  const { status, page, limit } = req.query;
  let tasks = taskService.getAll();

  if (status) {
    tasks = taskService.getByStatus(status);
  }

  if (page !== undefined || limit !== undefined) {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;

    if (isNaN(pageNum) || isNaN(limitNum) || pageNum < 1 || limitNum < 1) {
      return res.status(400).json({ error: 'page and limit must be positive integers' });
    }

    const offset = (pageNum - 1) * limitNum;
    tasks = tasks.slice(offset, offset + limitNum);
  }

  res.json(tasks);
});

router.get('/:id', (req, res) => {
  const task = taskService.findById(req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  res.json(task);
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

  const { assignee, assignedTo, user } = req.body;
  const finalAssignee = assignee || assignedTo || user;

  if (!finalAssignee || typeof finalAssignee !== 'string' || finalAssignee.trim() === '') {
    return res.status(400).json({ error: 'assignee is required and must be a non-empty string' });
  }

  const task = taskService.assignTask(req.params.id, finalAssignee.trim());
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  res.json(task);
});

module.exports = router;
