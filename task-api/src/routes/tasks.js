const express = require('express');
const router = express.Router();

const taskService = require('../services/taskService');

const {
  validateCreateTask,
  validateUpdateTask,
  validateAssignTask,
} = require('../utils/validators');


// GET /tasks/stats
router.get('/stats', (req, res) => {
  const stats = taskService.getStats();
  res.json(stats);
});


// GET /tasks
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


// POST /tasks
router.post('/', (req, res) => {
  const error = validateCreateTask(req.body);

  if (error) {
    return res.status(400).json({ error });
  }

  const task = taskService.create(req.body);

  res.status(201).json(task);
});


// PUT /tasks/:id
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


// DELETE /tasks/:id
router.delete('/:id', (req, res) => {
  const deleted = taskService.remove(req.params.id);

  if (!deleted) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.status(204).send();
});


// PATCH /tasks/:id/complete
router.patch('/:id/complete', (req, res) => {
  const task = taskService.completeTask(req.params.id);

  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.json(task);
});


// PATCH /tasks/:id/assign
router.patch('/:id/assign', (req, res) => {
  const error = validateAssignTask(req.body);

  if (error) {
    return res.status(400).json({ error });
  }

  const task = taskService.assignTask(
    req.params.id,
    req.body.assignee.trim()
  );

  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.json(task);
});


module.exports = router;