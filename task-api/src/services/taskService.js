const { v4: uuidv4 } = require('uuid');

let tasks = [];

const getAll = () => [...tasks];

const findById = (id) => tasks.find((t) => t.id === id);

const getByStatus = (status) => tasks.filter((t) => t.status === status);

// `status` is optional; when given, only tasks with that status are paginated.
const getPaginated = (page, limit, status) => {
  const source = status ? getByStatus(status) : tasks;
  // Pages are 1-based (the route defaults to page 1), so page 1 starts at 0.
  const offset = (page - 1) * limit;
  return source.slice(offset, offset + limit);
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
    assignee: null,
  };
  tasks.push(task);
  return task;
};

// Fields a client may change. id, createdAt and completedAt are managed by the
// server, assignee is only set through assignTask() so its rules can't be
// bypassed, and anything else isn't part of the task shape (#5).
const EDITABLE_FIELDS = ['title', 'description', 'status', 'priority', 'dueDate'];

const update = (id, fields) => {
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) return null;

  const changes = {};
  EDITABLE_FIELDS.forEach((key) => {
    if (fields[key] !== undefined) changes[key] = fields[key];
  });

  const current = tasks[index];
  const updated = { ...current, ...changes };

  // Keep completedAt in step with status, like completeTask() does (#10).
  if (changes.status === 'done' && current.status !== 'done') {
    updated.completedAt = new Date().toISOString();
  } else if (changes.status !== undefined && changes.status !== 'done') {
    updated.completedAt = null;
  }

  tasks[index] = updated;
  return updated;
};

// Sets (or, with null, clears) the assignee. The rules for who may be
// assigned live in the route; this just records the change.
const assignTask = (id, assignee) => {
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) return null;

  const updated = { ...tasks[index], assignee };
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
    status: 'done',
    completedAt: new Date().toISOString(),
  };

  const index = tasks.findIndex((t) => t.id === id);
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
