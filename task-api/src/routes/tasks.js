const express = require('express');
const router = express.Router();
const taskService = require('../services/taskService');
const { validateCreateTask, validateUpdateTask, validateGetTask, validateAssignee } = require('../utils/validators');

router.get('/stats', (req, res) => {
  const stats = taskService.getStats();
  res.json(stats);
});

router.get('/', (req, res) => {
  const { status, page, limit } = req.query;
// validating if the status is correct
  const error = validateGetTask(status);
  if (error) {
    return res.status(400).json({ error });
  }

  if (status) {
    const tasks = taskService.getByStatus(status);
    return res.json(tasks);
  }

  // added a ternary operator so that the values can't be null 
  if (page !== undefined || limit !== undefined) {
    const pageNum = parseInt(page) > 0? parseInt(page) : 1;
    const limitNum = parseInt(limit) > 0? parseInt(limit) : 10;
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

// new route patch for assignee
router.patch('/:id/assign', (req, res) => {
  const id = req.params.id;
  const assignee = req.body.assignee;

  const error = validateAssignee(assignee);
  if(error) {
    return res.status(400).json({ error });
  }

  const task = taskService.changeAssignee(id, assignee);
  if(!task) {
    return res.status(404).json({ error: 'Task not found'});
  }

  res.json(task);
});

module.exports = router;
