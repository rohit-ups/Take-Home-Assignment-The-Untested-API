import Task from '../models/Task.js';
import { ApiError } from '../utils/ApiError.js';

export const createTask = async (taskData, userId) => {
  return await Task.create({
    ...taskData,
    creator: userId,
  });
};

export const getTasks = async (filter, options) => {
  const { sortBy, limit = 10, page = 1 } = options;
  const skip = (page - 1) * limit;

  let query = Task.find({ ...filter, isDeleted: false });

  if (sortBy) {
    const sort = sortBy.split(',').join(' ');
    query = query.sort(sort);
  } else {
    query = query.sort('-createdAt');
  }

  const tasks = await query.skip(skip).limit(limit).populate('assignee creator', 'name email');
  const total = await Task.countDocuments({ ...filter, isDeleted: false });

  return {
    tasks,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / limit),
    },
  };
};

export const getTaskById = async (taskId) => {
  const task = await Task.findOne({ uuid: taskId, isDeleted: false }).populate('assignee creator', 'name email');
  if (!task) {
    throw new ApiError(404, 'Task not found');
  }
  return task;
};

export const updateTask = async (taskId, updateData, userId) => {
  const task = await Task.findOne({ uuid: taskId, isDeleted: false });
  if (!task) {
    throw new ApiError(404, 'Task not found');
  }

  // Check if user is creator or admin (optional requirement)
  // if (task.creator.toString() !== userId.toString()) {
  //   throw new ApiError(403, 'Forbidden');
  // }

  Object.assign(task, updateData);
  await task.save();
  return task;
};

export const deleteTask = async (taskId) => {
  const task = await Task.findOne({ uuid: taskId, isDeleted: false });
  if (!task) {
    throw new ApiError(404, 'Task not found');
  }

  task.isDeleted = true;
  await task.save();
  return task;
};

export const assignTask = async (taskId, assigneeId) => {
  const task = await Task.findOne({ uuid: taskId, isDeleted: false });
  if (!task) {
    throw new ApiError(404, 'Task not found');
  }

  task.assignee = assigneeId;
  await task.save();
  return task;
};

export const getStats = async () => {
  const stats = await Task.aggregate([
    { $match: { isDeleted: false } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  const overdueCount = await Task.countDocuments({
    isDeleted: false,
    status: { $ne: 'done' },
    dueDate: { $lt: new Date() },
  });

  const formattedStats = stats.reduce((acc, curr) => {
    acc[curr._id] = curr.count;
    return acc;
  }, {});

  return {
    counts: {
      todo: formattedStats.todo || 0,
      'in-progress': formattedStats['in-progress'] || 0,
      done: formattedStats.done || 0,
    },
    overdueCount,
  };
};
