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

  if (status) {
    const tasks = taskService.getByStatus(status);
    return res.json(tasks);
  }

  if (page !== undefined || limit !== undefined) {
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const tasks = taskService.getPaginated(pageNum, limitNum);
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

  const task = taskService.createTask(req.body);
  res.status(201).json(task);
});

router.put('/:id', (req, res) => {
  const error = validateUpdateTask(req.body);
  if (error) {
    return res.status(400).json({ error });
  }

  const updatedTask = taskService.editTask(req.params.id, req.body);
  if (!updatedTask) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.json(updatedTask);
});


router.delete('/:id', (req, res) => {
  const isDeleted = taskService.removeTask(req.params.id);
  if (!isDeleted) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.status(204).send();
});

router.patch('/:id/assign', (req, res) => {
  const error = validateAssignTask(req.body);
  if (error) {
    return res.status(400).json({ error });
  }

  const updatedTask = taskService.assignTask(req.params.id, req.body.assignee.trim());
  if (!updatedTask) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.json(updatedTask);
});

router.patch('/:id/complete', (req, res) => {
  const task = taskService.completeTask(req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.json(task);
});


module.exports = router;
