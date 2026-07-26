const taskService = require('../services/taskService');
const { validateCreateTask, validateUpdateTask } = require('../utils/validators');

const getStats = (req, res) => {
  const stats = taskService.getStats();
  res.json(stats);
};

const getTasks = (req, res) => {
  let { status, page, limit } = req.query;

  if (status) {
    status = status.toLowerCase();
    const tasks = taskService.getByStatus(status);
    return res.json(tasks);
  }

  if (page !== undefined || limit !== undefined) {
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({ error: 'page must be a positive integer' });
    }
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({ error: 'limit must be a positive integer between 1 and 100' });
    }

    const tasks = taskService.getPaginated(pageNum, limitNum);
    return res.json(tasks);
  }

  const tasks = taskService.getAll();
  res.json(tasks);
};

const createTask = (req, res) => {
  if (req.body.status) req.body.status = req.body.status.toLowerCase();
  if (req.body.priority) req.body.priority = req.body.priority.toLowerCase();

  const error = validateCreateTask(req.body);
  if (error) {
    return res.status(400).json({ error });
  }

  const task = taskService.create(req.body);
  res.status(201).json(task);
};

const updateTask = (req, res) => {
  if (req.body.status) req.body.status = req.body.status.toLowerCase();
  if (req.body.priority) req.body.priority = req.body.priority.toLowerCase();

  const error = validateUpdateTask(req.body);
  if (error) {
    return res.status(400).json({ error });
  }

  const task = taskService.update(req.params.id, req.body);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.json(task);
};

const deleteTask = (req, res) => {
  const deleted = taskService.remove(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.status(204).send();
};

const completeTask = (req, res) => {
  const task = taskService.completeTask(req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.json(task);
};

const assignTask = (req, res) => {
  const { assignee } = req.body;

  if (!assignee || typeof assignee !== 'string' || assignee.trim() === '') {
    return res.status(400).json({ error: 'assignee is required and must be a non-empty string' });
  }

  const task = taskService.assignTask(req.params.id, assignee.trim());
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.json(task);
};

module.exports = {
  getStats,
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  completeTask,
  assignTask,
};
