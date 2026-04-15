const express = require("express");
const router = express.Router();
const taskService = require("../services/taskService");
const {
  validateCreateTask,
  validateUpdateTask,
  validateAssignee,
} = require("../utils/validators");

const VALID_STATUS = ["todo", "in_progress", "done"];

router.get("/stats", (req, res) => {
  const stats = taskService.getStats();
  res.json(stats);
});

router.get("/", (req, res) => {
  const { status, page, limit } = req.query;

  if (status) {
    if (!VALID_STATUS.includes(status)) {
      return res.status(400).json({ error: "invalid status query parameter" });
    }
    const tasks = taskService.getByStatus(status);
    return res.json(tasks);
  }

  if (page !== undefined || limit !== undefined) {
    const pageNum = page !== undefined ? parseInt(page, 10) : 1;
    const limitNum = limit !== undefined ? parseInt(limit, 10) : 10;
    if (
      (page !== undefined && (Number.isNaN(pageNum) || pageNum < 1)) ||
      (limit !== undefined && (Number.isNaN(limitNum) || limitNum < 1))
    ) {
      return res
        .status(400)
        .json({ error: "page and limit must be positive integers" });
    }
    const tasks = taskService.getPaginated(pageNum, limitNum);
    return res.json(tasks);
  }

  const tasks = taskService.getAll();
  res.json(tasks);
});

router.post("/", (req, res) => {
  const error = validateCreateTask(req.body);
  if (error) {
    return res.status(400).json({ error });
  }

  const task = taskService.create(req.body);
  res.status(201).json(task);
});

router.put("/:id", (req, res) => {
  const error = validateUpdateTask(req.body);
  if (error) {
    return res.status(400).json({ error });
  }

  const task = taskService.update(req.params.id, req.body);
  if (!task) {
    return res.status(404).json({ error: "Task not found" });
  }

  res.json(task);
});

router.delete("/:id", (req, res) => {
  const deleted = taskService.remove(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: "Task not found" });
  }

  res.status(204).send();
});

router.patch("/:id/complete", (req, res) => {
  const task = taskService.completeTask(req.params.id);
  if (!task) {
    return res.status(404).json({ error: "Task not found" });
  }

  res.json(task);
});

router.patch("/:id/assign", (req, res) => {
  const error = validateAssignee(req.body);
  if (error) {
    return res.status(400).json({ error });
  }

  const assignee = req.body.assignee.trim();
  const task = taskService.assignTask(req.params.id, assignee);
  if (!task) {
    return res.status(404).json({ error: "Task not found" });
  }

  // Overwrite existing assignee when present because reassignment should update the task assignee.
  res.json(task);
});

module.exports = router;
