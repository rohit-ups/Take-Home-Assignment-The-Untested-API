const { v4: uuidv4 } = require('uuid');
const db = require('../utils/db');

const getAll = () => [...db.tasks];

const findById = (id) => db.tasks.find((t) => t.id === id);

// FIXED: Use strict equality instead of .includes()
const getByStatus = (status) => db.tasks.filter((t) => t.status === status);

const getPaginated = (page, limit) => {
  const offset = (page - 1) * limit;
  return db.tasks.slice(offset, offset + limit);
};

const getStats = () => {
  const now = new Date();
  const counts = { todo: 0, in_progress: 0, done: 0 };
  let overdue = 0;

  db.tasks.forEach((t) => {
    if (counts[t.status] !== undefined) counts[t.status]++;
    if (t.dueDate && t.status !== 'done' && new Date(t.dueDate) < now) {
      overdue++;
    }
  });

  return { ...counts, overdue };
};

const createTask = ({ title, description = '', status = 'todo', priority = 'medium', dueDate = null }) => {
  const task = {
    id: uuidv4(),
    title,
    description,
    status,
    priority,
    dueDate,
    completedAt: null,
    createdAt: new Date().toISOString()
  };

  db.tasks.push(task);
  return task;
};

const editTask = (id, fields) => {
  const index = db.tasks.findIndex((t) => t.id === id);
  if (index === -1) return null;

  // FIXED: Variable names now match exactly
  const updatedTask = { ...db.tasks[index], ...fields };
  db.tasks[index] = updatedTask;

  return updatedTask;
};

const removeTask = (id) => {
  const index = db.tasks.findIndex((t) => t.id === id);
  if (index === -1) return false;

  db.tasks.splice(index, 1);
  return true;
};

const completeTask = (id) => {
  const task = findById(id);
  if (!task) return null;

  const updatedTask = {
    ...task,
    status: 'done',
    completedAt: new Date().toISOString(),

  };

  const index = db.tasks.findIndex((t) => t.id === id);
  db.tasks[index] = updatedTask;

  return updatedTask;
};

const assignTask = (id, assigneeName) => {
  const index = db.tasks.findIndex((t) => t.id === id);
  if (index === -1) return null;

  const updatedTask = {
    ...db.tasks[index],
    assignee: assigneeName
  };
  
  db.tasks[index] = updatedTask;
  
  return updatedTask;
};


const _reset = () => {
  // Safely empties the array without breaking memory references
  db.tasks.length = 0;
};

module.exports = {
  getAll,
  findById,
  getByStatus,
  getPaginated,
  getStats,
  createTask,
  editTask,
  removeTask,
  completeTask,
  assignTask,
  _reset,
};