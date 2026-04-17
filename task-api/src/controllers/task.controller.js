import asyncHandler from 'express-async-handler';
import * as taskService from '../services/task.service.js';
import { pick } from '../utils/pick.js';

export const createTask = asyncHandler(async (req, res) => {
  const task = await taskService.createTask(req.body, req.user._id);
  res.status(201).json({
    success: true,
    message: 'Task created successfully',
    data: task,
  });
});

export const getTasks = asyncHandler(async (req, res) => {
  const filter = pick(req.query, ['status', 'priority', 'assignee']);
  if (req.query.search) {
    filter.$text = { $search: req.query.search };
  }
  
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  
  const result = await taskService.getTasks(filter, options);
  res.status(200).json({
    success: true,
    data: result.tasks,
    pagination: result.pagination,
  });
});

export const getTask = asyncHandler(async (req, res) => {
  const task = await taskService.getTaskById(req.params.id);
  res.status(200).json({
    success: true,
    data: task,
  });
});

export const updateTask = asyncHandler(async (req, res) => {
  const task = await taskService.updateTask(req.params.id, req.body, req.user._id);
  res.status(200).json({
    success: true,
    message: 'Task updated successfully',
    data: task,
  });
});

export const deleteTask = asyncHandler(async (req, res) => {
  await taskService.deleteTask(req.params.id);
  res.status(200).json({
    success: true,
    message: 'Task deleted successfully',
  });
});

export const assignTask = asyncHandler(async (req, res) => {
  const task = await taskService.assignTask(req.params.id, req.body.assigneeId);
  res.status(200).json({
    success: true,
    message: 'Task assigned successfully',
    data: task,
  });
});
