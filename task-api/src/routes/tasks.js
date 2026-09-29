const express = require('express');
const router = express.Router();
const taskService = require('../services/taskService');
const { validateCreateTask, validateUpdateTask } = require('../utils/validators');

router.get('/stats', (req, res) => {
  const stats = taskService.getStats();
  // 1. missing return
  return res.json(stats);
});

router.get('/', (req, res) => {
  const { status, page, limit } = req.query;

  if (status) {
    // 1. no validation on status value here, invalid status just returns empty array
    const tasks = taskService.getByStatus(status);
    return res.json(tasks);
  }

  if (page !== undefined || limit !== undefined) {
    // 1. parseInt(page) || 1 defaults to 1 but service math treats page as 0-indexed
    // 2. this is the root of the pagination bug, page 1 skips first results
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

  const task = taskService.create(req.body);

  // 1. missing return  
  return res.status(201).json(task);
});

//  1. maybe due to missing url endocing hook
//  2. maybe not delete method is working
//  3. damn this is a put method but i was using it as a post
//  4. this is working
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

  // 1. no try catch here, if service throws this will crash
  res.json(task);
});

// 1. new feature - assign a task to someone
router.patch('/:id/assign', (req, res) => {
  const { assignee } = req.body;

  // 1. assignee must be a non empty string
  if (!assignee || typeof assignee !== 'string' || assignee.trim() === '') {
    return res.status(400).json({ error: 'assignee is required and must be a non-empty string' });
  }

  const task = taskService.assignTask(req.params.id, assignee.trim());
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.json(task);
});

// 1. GET /:id is missing, findById exists in service but no route uses it
module.exports = router;
