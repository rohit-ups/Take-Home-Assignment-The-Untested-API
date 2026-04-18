const { v4: uuidv4 } = require('uuid');

let tasks = [];

const getAll = () => [...tasks];

const findById = (id) => tasks.find((t) => t.id === id);

const getByStatus = (status) => tasks.filter((t) => t.status.includes(status));

/**
 * Returns a paginated slice of the tasks array.
 *
 * FIX: Changed `page * limit` to `(page - 1) * limit`.
 * Pages are 1-indexed (page=1 is the first page), so we need to subtract 1
 * before multiplying to calculate the correct zero-based offset.
 *
 * Before the fix, page 1 with limit 10 would start at index 10,
 * completely skipping the first 10 tasks.
 */
const getPaginated = (page, limit) => {
  const offset = (page - 1) * limit;
  return tasks.slice(offset, offset + limit);
};

const getStats = () => {
  const now = new Date();
  const counts = { todo: 0, in_progress: 0, done: 0 };
  let overdue = 0;

  tasks.forEach((t) => {
    if (counts[t.status] !== undefined) counts[t.status]++;
    if (t.dueDate && t.status !== 'done' && new Date(t.dueDate) < now) {
      overdue++;
    }
  });

  return { ...counts, overdue };
};

const create = ({ title, description = '', status = 'todo', priority = 'medium', dueDate = null }) => {
  const task = {
    id: uuidv4(),
    title,
    description,
    status,
    priority,
    dueDate,
    completedAt: null,
    createdAt: new Date().toISOString(),
  };
  tasks.push(task);
  return task;
};

const update = (id, fields) => {
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) return null;

  const updated = { ...tasks[index], ...fields };
  tasks[index] = updated;
  return updated;
};

const remove = (id) => {
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) return false;

  tasks.splice(index, 1);
  return true;
};

const completeTask = (id) => {
  const task = findById(id);
  if (!task) return null;

  const updated = {
    ...task,
    priority: 'medium',
    status: 'done',
    completedAt: new Date().toISOString(),
  };

  const index = tasks.findIndex((t) => t.id === id);
  tasks[index] = updated;
  return updated;
};

/**
 * Assigns a user to an existing task.
 *
 * Design decisions:
 * - Reassignment is allowed: if the task already has an assignee, it is
 *   overwritten. This mirrors real workflows where tasks get reassigned.
 * - Completed tasks can be assigned: no restriction on task status, because
 *   assignment is metadata — useful for auditing or retrospectives.
 * - The assignee string is stored as-is (trimming is handled at the route
 *   layer to keep the service layer focused on data operations).
 *
 * @param {string} id - UUID of the task to assign
 * @param {string} assignee - Name of the person to assign the task to
 * @returns {object|null} The updated task, or null if not found
 */
const assignTask = (id, assignee) => {
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) return null;

  const updated = { ...tasks[index], assignee };
  tasks[index] = updated;
  return updated;
};

const _reset = () => {
  tasks = [];
};

module.exports = {
  getAll,
  findById,
  getByStatus,
  getPaginated,
  getStats,
  create,
  update,
  remove,
  completeTask,
  assignTask,
  _reset,
};
