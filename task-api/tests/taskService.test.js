/*
  what we are testing: taskService.js - all the service functions directly
  why: the service holds all the logic, testing it in isolation
  makes sure the core behavior is correct before we even touch the routes

  I think this is called unite testing, lol i dont even know the names
*/

const taskService = require('../src/services/taskService');

// avoids leaking tasks between tests
beforeEach(() => {
  taskService._reset();
});

//  getAll 

describe('getAll', () => {
  it('returns empty array when no tasks', () => {
    expect(taskService.getAll()).toEqual([]);
  });

  it('returns all created tasks', () => {
    taskService.create({ title: 'task one' });
    taskService.create({ title: 'task two' });
    expect(taskService.getAll()).toHaveLength(2);
  });
});

//  create 

describe('create', () => {
  it('creates a task with correct fields', () => {
    const task = taskService.create({ title: 'my task' });

    expect(task.title).toBe('my task');
    expect(task.status).toBe('todo');
    expect(task.priority).toBe('medium');
    expect(task.id).toBeDefined();
    expect(task.createdAt).toBeDefined();
    expect(task.completedAt).toBeNull();
  });

  it('stores custom status and priority', () => {
    const task = taskService.create({ title: 'urgent', status: 'in_progress', priority: 'high' });
    expect(task.status).toBe('in_progress');
    expect(task.priority).toBe('high');
  });

  it('defaults description to empty string', () => {
    const task = taskService.create({ title: 'no desc' });
    expect(task.description).toBe('');
  });
});

//  findById 

describe('findById', () => {
  it('returns the task when id exists', () => {
    const task = taskService.create({ title: 'find me' });
    expect(taskService.findById(task.id)).toEqual(task);
  });

  it('returns undefined when id does not exist', () => {
    expect(taskService.findById('fake-id-123')).toBeUndefined();
  });
});

//  update 

describe('update', () => {
  it('updates the task fields', () => {
    const task = taskService.create({ title: 'old title' });
    const updated = taskService.update(task.id, { title: 'new title' });
    expect(updated.title).toBe('new title');
  });

  it('returns null when task not found', () => {
    expect(taskService.update('bad-id', { title: 'x' })).toBeNull();
  });

  it('does not affect other fields when updating one field', () => {
    const task = taskService.create({ title: 'stable', priority: 'high' });
    const updated = taskService.update(task.id, { title: 'changed' });
    expect(updated.priority).toBe('high');
  });
});

//  remove 

describe('remove', () => {
  it('removes existing task and returns true', () => {
    const task = taskService.create({ title: 'delete me' });
    expect(taskService.remove(task.id)).toBe(true);
    expect(taskService.findById(task.id)).toBeUndefined();
  });

  it('returns false when task not found', () => {
    expect(taskService.remove('bad-id')).toBe(false);
  });
});

//  completeTask 

describe('completeTask', () => {
  it('sets status to done and sets completedAt', () => {
    const task = taskService.create({ title: 'finish this' });
    const completed = taskService.completeTask(task.id);
    expect(completed.status).toBe('done');
    expect(completed.completedAt).not.toBeNull();
  });

  it('returns null when task not found', () => {
    expect(taskService.completeTask('bad-id')).toBeNull();
  });

  // observation: completeTask always resets priority to medium
  // even if the task was high priority - prob not intentional
  it('resets priority to medium even if task was high priority', () => {
    const task = taskService.create({ title: 'high prio', priority: 'high' });
    const completed = taskService.completeTask(task.id);
    expect(completed.priority).toBe('medium'); // documenting this behavior
  });
});

//  getByStatus 

describe('getByStatus', () => {
  it('returns only tasks matching the status', () => {
    taskService.create({ title: 'a', status: 'todo' });
    taskService.create({ title: 'b', status: 'done' });
    const result = taskService.getByStatus('todo');
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('a');
  });

  // was a bug - .includes() matched partial strings like "tod" matching "todo"
  // fixed: changed to === so only exact status strings match now
  it('partial status string should not match any tasks', () => {
    taskService.create({ title: 'a', status: 'todo' });
    const result = taskService.getByStatus('tod');
    expect(result).toHaveLength(0); // no match, exact only
  });
});

//  getPaginated 

describe('getPaginated', () => {
  beforeEach(() => {
    for (let i = 1; i <= 5; i++) {
      taskService.create({ title: `task ${i}` });
    }
  });

  it('returns correct slice for page 0 limit 2', () => {
    const result = taskService.getPaginated(0, 2);
    expect(result).toHaveLength(2);
    expect(result[0].title).toBe('task 1');
  });

  // observation: pagination bug - offset = page * limit
  // so page 1 with limit 2 skips the first 2 items, not returns them
  it('bug: page 1 skips the first results instead of returning them', () => {
    const result = taskService.getPaginated(1, 2);
    expect(result[0].title).toBe('task 3'); // starts from index 2, not 0
  });
});

//  getStats 

describe('getStats', () => {
  it('counts tasks by status correctly', () => {
    taskService.create({ title: 'a', status: 'todo' });
    taskService.create({ title: 'b', status: 'todo' });
    taskService.create({ title: 'c', status: 'done' });

    const stats = taskService.getStats();
    expect(stats.todo).toBe(2);
    expect(stats.done).toBe(1);
    expect(stats.in_progress).toBe(0);
  });

  it('counts overdue tasks correctly', () => {
    taskService.create({ title: 'overdue', status: 'todo', dueDate: '2020-01-01' });
    taskService.create({ title: 'not overdue', status: 'todo', dueDate: '2099-01-01' });

    const stats = taskService.getStats();
    expect(stats.overdue).toBe(1);
  });

  it('does not count done tasks as overdue even with past dueDate', () => {
    taskService.create({ title: 'done task', status: 'done', dueDate: '2020-01-01' });
    const stats = taskService.getStats();
    expect(stats.overdue).toBe(0);
  });
});
