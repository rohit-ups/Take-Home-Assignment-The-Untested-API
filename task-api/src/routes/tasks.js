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

  if (status) {
    const tasks = taskService.getByStatus(status);
    return res.json(tasks);
  }

  if (page !== undefined || limit !== undefined) {
  const parsedPage = parseInt(page);
  const parsedLimit = parseInt(limit);

  const pageNum = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const limitNum = Number.isInteger(parsedLimit) && parsedLimit > 0 ? parsedLimit : 10;

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

router.patch("/:id/assign", (req, res) => {
  const { assignee } = req.body;

  if (
    typeof assignee !== "string" ||
    assignee.trim() === "" ||
    assignee.length > 100
  ) {
    return res.status(400).json({ error: "Invalid assignee" });
  }

  const task = taskService.assignTask(
    req.params.id,
    assignee.trim()
  );

  if (!task) {
    return res.status(404).json({ error: "Task not found" });
  }

  res.json(task);
});

module.exports = router;
