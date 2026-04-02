const { v4: uuidv4 } = require('uuid');

let tasks = [];

const getAll = () => [...tasks];

const findById = (id) => tasks.find((t) => t.id === id);

// BUG: Below line also give results when status === to that must not be the case
// const getByStatus = (status) => tasks.filter((t) => t.status.includes(status));

// FIX: it filter only the defined status
const getByStatus = (status) => tasks.filter((t) => t.status===status);

const getPaginated = (page, limit) => {

  // BUG:
  // negative index not handled:
  // const offset = page * limit;

  // FIX:
  page = Math.max(1, Number(page));
  limit = Math.max(1, Number(limit));
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

const create = ({ title, description = '', status = 'todo', priority = 'medium', dueDate = null, assignee}) => {
  const task = {
    id: uuidv4(),
    title,
    description,
    status,
    priority,
    dueDate,
    assignee,
    completedAt: null,
    createdAt: new Date().toISOString(),
  };
  tasks.push(task);
  return task;
};

const update = (id, fields) => {
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) return null;

  // const updated = { ...tasks[index], ...fields };

  // above line update sensitive info also like _id which must not be updated by anyone

  // below code only allows [allowedFields] to modfiy:
  const allowedFields = ['title', 'description', 'status', 'priority', 'dueDate', 'assignee'];

  const filteredFields = {};
  for (let key of allowedFields) {
    if (fields[key] !== undefined) {
      filteredFields[key] = fields[key];
    }
  }

  const updated = { ...tasks[index], ...filteredFields };
  tasks[index] = updated;
  return updated;
};

const remove = (id) => {
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) return false;

  tasks.splice(index, 1);
  return true;
};

const assignTask = (id, assignee) => {
  const task = findById(id);
  if (!task) return null;

  const updated = {
    ...task,
    assignee
  };

  const index = tasks.findIndex((t) => t.id === id);
  tasks[index] = updated;

  return updated;
};

const completeTask = (id) => {
  const task = findById(id);
  if (!task) return null;

  const updated = {
    ...task,
    // BUG/FIX:
    // priority: 'medium',
    // during completion of task only status should be modified not priority
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
  assignTask,
  completeTask,
  _reset,
};
