const { v4: uuidv4 } = require('uuid');

let tasks = [];

const getAll = () => [...tasks];

const findById = (id) => tasks.find((t) => t.id === id);

/* BUG #1: getByStatus uses .includes() instead of exact match
Expected: Filter tasks by exact status (e.g., "todo" returns only "todo" tasks)
Actually happens: Partial matches break filtering - searching "in" matches "in_progress" AND "todo" and "done" if those chars exist
Example: filter for status="do" would return both "done" and "todo" tasks (both contain "do")
Discovered: By testing with filter query - realized partial strings were matching
Fix: Change t.status.includes(status) to t.status === status */

const getByStatus = (status) => tasks.filter((t) => t.status.includes(status));

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

/* BUG #4: update function allows changing immutable fields like createdAt and arbitrarily setting completedAt
Expected: Only allow updating mutable fields (title, description, status, priority, dueDate); preserve createdAt and validate completedAt
Actually happens: Client can update ANY field including createdAt timestamp, making task history unreliable
Example: Sending { createdAt: "2020-01-01T00:00:00Z", completedAt: "2099-12-31T00:00:00Z" } would be accepted
Discovered: By testing update endpoint - realized I could manipulate timestamps that should be protected
Fix: Whitelist allowed update fields or prevent certain fields from being overwritten */

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

/* BUG #3: completeTask resets priority to 'medium' unexpectedly
Expected: When marking a task as complete, its priority should remain unchanged (preserve original priority)
Actually happens: Task priority is forcibly set to 'medium' when completing, losing original priority value
Example: A high-priority task marked complete becomes medium priority - data loss
Discovered: By testing complete endpoint - noticed completed task has different priority than before
Fix: Remove the priority: 'medium' line, only update status and completedAt */

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

const assignTask = (id, assignee) => {
  const task = findById(id);
  if (!task) return null;

  const updated = {
    ...task,
    assignee,
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
