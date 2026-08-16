const express = require('express');
const router = express.Router();
const taskService = require('../services/taskService');
const { validateCreateTask, validateUpdateTask, validateAssignTask } = require('../utils/validators');

router.get('/stats', (req, res) => {
  const stats = taskService.getStats();
  res.json(stats);
});

// here i add new feature filter by priority,assignee
router.get('/', (req, res) => {
  const { status, page, limit, priority, assignee, search } = req.query;

  // Filter tasks using multiple filters
  if (status || priority || assignee || search) {
    const tasks = taskService.filterTasks({
      status,
      priority,
      assignee,
      search
    })

    return res.json(tasks)
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


//add new feature here

//for assign task if not assign to anyone
router.patch('/:id/assign', (req, res) => {
  const { assignee } = req.body

  const error = validateAssignTask(assignee)

  if (error) {
    return res.status(400).json({ error })
  }

  const task = taskService.assignTask(
    req.params.id,
    assignee.trim()
  )

  if (!task) {
    return res.status(404).json({
      error: "Task not found"
    })
  }

  if (task.alreadyAssigned) {
    return res.status(409).json({
      error: "Task is already assigned"
    })
  }

  res.json(task)
})


//get task by id
router.get('/:id', (req, res) => {
  const task = taskService.findById(req.params.id)

  if (!task) {
    return res.status(404).json({
      error: "Task not found"
    })
  }

  res.json(task)
})

module.exports = router;
