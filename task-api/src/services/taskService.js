const { v4: uuidv4 } = require('uuid');

let tasks = [];

const getAll = () => [...tasks];

const findById = (id) => tasks.find((t) => t.id === id);

const getByStatus = (status) => tasks.filter((t) => t.status.includes(status));

const getPaginated = (page, limit) => {

  // Pagination is 1-based:
  // page 1 -> index 0
  // page 2 -> index 10
  // page 3 -> index 20

  // Subtract 1 because JavaScript arrays use zero-based indexing
  // Using page * limit would make page 1 start at index 10
  // incorrectly returning Task 11 instead of Task 1

  // The current API treats page=0 as page=1 because the route
  // uses: parseInt(page) || 1

  // If page=0 should be supported as a valid first page
  // the API pagination convention would need to be changed
  // to zero-based pagination consistently in the route and service
  const offset = (page - 1) * limit

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

const _reset = () => {
  tasks = [];
};


//add new feature here

// Assign a task only if it has not assigned
const assignTask = (id, assignee) => {
  const task = findById(id)

  // Task does not exist
  if (!task) return null

  // already assign task
  if (task.assignee) {
    return { alreadyAssigned: true }
  }

  const updated = {
    ...task,
    assignee
  }

  const index = tasks.findIndex((t) => t.id === id);
  tasks[index] = updated

  return updated
}

// Filter tasks by priority
const getByPriority = (priority) => tasks.filter((t) => t.priority === priority)

// Get tasks by assignee
const getByAssignee = (assignee) => tasks.filter((t) => t.assignee === assignee)

//Get task by search
const searchTasks = (search) => {
  return tasks.filter((task) =>
    task.title.toLowerCase().includes(search.toLowerCase())
  )
}

// Filter tasks using multiple filters
const filterTasks = ({ status, priority, assignee, search }) => {
  return tasks.filter((task) => {

    if (status && task.status !== status) {
      return false
    }

    if (priority && task.priority !== priority) {
      return false
    }

    if (assignee && task.assignee !== assignee) {
      return false
    }

    if (
      search &&
      !task.title.toLowerCase().includes(search.toLowerCase())
    ) {
      return false
    }

    return true
  })
}

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
  _reset,
  assignTask,
  getByPriority,
  getByAssignee,
  searchTasks,
  filterTasks
};
