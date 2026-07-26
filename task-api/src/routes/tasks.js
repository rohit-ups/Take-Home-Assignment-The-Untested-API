const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');

router.get('/stats', taskController.getStats);
router.get('/', taskController.getTasks);
router.post('/', taskController.createTask);
router.put('/:id', taskController.updateTask);
router.delete('/:id', taskController.deleteTask);
router.patch('/:id/complete', taskController.completeTask);
router.patch('/:id/assign', taskController.assignTask);

module.exports = router;
