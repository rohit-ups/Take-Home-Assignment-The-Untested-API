const { v4: uuidv4 } = require('uuid');

let tasks = [];

/**
 * Returns a shallow copy of all tasks in memory.
 * @returns {Array<Object>}
 */
const getAll = () => [...tasks];

/**
 * Finds a task by its unique ID.
 * @param {string} id
 * @returns {Object|undefined}
 */
const findById = (id) => tasks.find((t) => t.id === id);

/**
 * Returns tasks matching exact status.
 * @param {string} status
 * @returns {Array<Object>}
 */
const getByStatus = (status) => tasks.filter((t) => t.status === status);

/**
 * Returns paginated slice of tasks using 1-based page index.
 * @param {number} page - Page number (1-based, default: 1)
 * @param {number} limit - Items per page (default: 10)
 * @returns {Array<Object>}
 */
const getPaginated = (page = 1, limit = 10) => {
  const parsedPage = parseInt(page, 10);
  const parsedLimit = parseInt(limit, 10);
  const pageNum = parsedPage > 0 ? parsedPage : 1;
  const limitNum = parsedLimit > 0 ? parsedLimit : 10;
  const offset = (pageNum - 1) * limitNum;
  return tasks.slice(offset, offset + limitNum);
};

/**
 * Queries tasks with optional filtering by status and/or pagination.
 * Allows status filtering and pagination to be applied simultaneously.
 * @param {Object} options
 * @param {string} [options.status]
 * @param {number|string} [options.page]
 * @param {number|string} [options.limit]
 * @returns {Array<Object>}
 */
const queryTasks = ({ status, page, limit } = {}) => {
  let result = [...tasks];

  if (status) {
    result = result.filter((t) => t.status === status);
  }

  if (page !== undefined || limit !== undefined) {
    const parsedPage = parseInt(page, 10);
    const parsedLimit = parseInt(limit, 10);
    const pageNum = parsedPage > 0 ? parsedPage : 1;
    const limitNum = parsedLimit > 0 ? parsedLimit : 10;
    const offset = (pageNum - 1) * limitNum;
    result = result.slice(offset, offset + limitNum);
  }

  return result;
};


/**
 * Computes task statistics (counts by status and count of overdue tasks).
 * @returns {{todo: number, in_progress: number, done: number, overdue: number}}
 */
const getStats = () => {
  const now = new Date();
  const counts = { todo: 0, in_progress: 0, done: 0 };
  let overdue = 0;

  tasks.forEach((t) => {
    if (counts[t.status] !== undefined) {
      counts[t.status]++;
    }
    if (t.dueDate && t.status !== 'done' && new Date(t.dueDate) < now) {
      overdue++;
    }
  });

  return { ...counts, overdue };
};

/**
 * Creates a new task and appends it to the store.
 * @param {Object} taskData
 * @returns {Object} Created task
 */
const create = ({ title, description = '', status = 'todo', priority = 'medium', dueDate = null, assignee = null }) => {
  const task = {
    id: uuidv4(),
    title: typeof title === 'string' ? title.trim() : title,
    description: description || '',
    status,
    priority,
    dueDate: dueDate || null,
    completedAt: status === 'done' ? new Date().toISOString() : null,
    createdAt: new Date().toISOString(),
    assignee: assignee ? assignee.trim() : null,
  };
  tasks.push(task);
  return task;
};

/**
 * Updates an existing task with given fields.
 * @param {string} id
 * @param {Object} fields
 * @returns {Object|null} Updated task or null if not found
 */
const update = (id, fields) => {
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) return null;

  const updated = { ...tasks[index], ...fields };
  tasks[index] = updated;
  return updated;
};

/**
 * Removes a task by ID.
 * @param {string} id
 * @returns {boolean} True if removed, false if task not found
 */
const remove = (id) => {
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) return false;

  tasks.splice(index, 1);
  return true;
};

/**
 * Marks a task as complete ('done') and sets completedAt timestamp.
 * Preserves the task's existing priority.
 * @param {string} id
 * @returns {Object|null} Updated task or null if not found
 */
const completeTask = (id) => {
  const task = findById(id);
  if (!task) return null;

  const updated = {
    ...task,
    status: 'done',
    completedAt: new Date().toISOString(),
  };

  const index = tasks.findIndex((t) => t.id === id);
  tasks[index] = updated;
  return updated;
};

/**
 * Assigns a user to a task.
 * @param {string} id
 * @param {string} assignee - Name of assignee
 * @returns {Object|null} Updated task or null if not found
 */
const assignTask = (id, assignee) => {
  const task = findById(id);
  if (!task) return null;

  const updated = {
    ...task,
    assignee: typeof assignee === 'string' ? assignee.trim() : assignee,
  };

  const index = tasks.findIndex((t) => t.id === id);
  tasks[index] = updated;
  return updated;
};

/**
 * Resets in-memory tasks array (primarily used in testing).
 */
const _reset = () => {
  tasks = [];
};

module.exports = {
  getAll,
  findById,
  getByStatus,
  getPaginated,
  queryTasks,
  getStats,
  create,
  update,
  remove,
  completeTask,
  assignTask,
  _reset,
};

