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
    if (!tasks) {
      return res.status(400).json({ error: 'Invalid status' });
    }
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

//-------------------
router.patch('/:id/assign', (req, res) => {
  const error = validateAssignTask(req.body); //Validates if the assignee field is present is a valid value
  if (error) {
    return res.status(400).json({ error }); //If it fails validation, throws an error with status code 400
  }

  const { assignee } = req.body; //Retrives assignee from the req body
  
  const task = taskService.assignTask(req.params.id, assignee); //Calls the service and passes the required fields
  if (!task) {
    return res.status(404).json({ error: 'Task not found/Finished task can\'t be assigned to ' }); //If it returns null, throws an error with status 404 (There can be a better way to separate each error, however I combined them into one for simplicity's sake)
  }

  res.json(task); //returns the updated task object
});

module.exports = router;
