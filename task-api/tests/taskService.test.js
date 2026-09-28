const taskService = require('../src/services/taskService');

beforeEach(() => {
  taskService._reset();
});

const createSampleTask = (overrides = {}) =>
  taskService.create({ title: 'Sample Task', ...overrides });

// getAll
describe('getAll', () => {
  test('returns empty array when no tasks exist', () => {
    expect(taskService.getAll()).toEqual([]);
  });

  test('returns all created tasks', () => {
    createSampleTask({ title: 'Task 1' });
    createSampleTask({ title: 'Task 2' });
    const all = taskService.getAll();
    expect(all).toHaveLength(2);
    expect(all[0].title).toBe('Task 1');
    expect(all[1].title).toBe('Task 2');
  });

  test('returns a copy, not the internal array', () => {
    createSampleTask();
    const all = taskService.getAll();
    all.push({ fake: true });
    expect(taskService.getAll()).toHaveLength(1);
  });
});

// findById
describe('findById', () => {
  test('returns the task when id matches', () => {
    const created = createSampleTask();
    const found = taskService.findById(created.id);
    expect(found).toEqual(created);
  });

  test('returns undefined for non-existent id', () => {
    expect(taskService.findById('non-existent')).toBeUndefined();
  });
});

// create
describe('create', () => {
  test('creates a task with defaults', () => {
    const task = createSampleTask();
    expect(task).toMatchObject({
      title: 'Sample Task',
      description: '',
      status: 'todo',
      priority: 'medium',
      dueDate: null,
      completedAt: null,
    });
    expect(task.id).toBeDefined();
    expect(task.createdAt).toBeDefined();
  });

  test('creates a task with all fields', () => {
    const task = taskService.create({
      title: 'Full',
      description: 'desc',
      status: 'in_progress',
      priority: 'high',
      dueDate: '2025-12-31T00:00:00.000Z',
    });
    expect(task.status).toBe('in_progress');
    expect(task.priority).toBe('high');
    expect(task.dueDate).toBe('2025-12-31T00:00:00.000Z');
  });

  test('each task gets a unique id', () => {
    const t1 = createSampleTask();
    const t2 = createSampleTask();
    expect(t1.id).not.toBe(t2.id);
  });
});

// update
describe('update', () => {
  test('updates fields and returns updated task', () => {
    const task = createSampleTask();
    const updated = taskService.update(task.id, { title: 'Updated' });
    expect(updated.title).toBe('Updated');
    expect(updated.id).toBe(task.id);
  });

  test('returns null when task does not exist', () => {
    expect(taskService.update('no-id', { title: 'X' })).toBeNull();
  });

  test('preserves fields not in the update', () => {
    const task = createSampleTask({ description: 'keep me' });
    const updated = taskService.update(task.id, { title: 'Changed' });
    expect(updated.description).toBe('keep me');
  });
});

// remove
describe('remove', () => {
  test('removes a task and returns true', () => {
    const task = createSampleTask();
    expect(taskService.remove(task.id)).toBe(true);
    expect(taskService.getAll()).toHaveLength(0);
  });

  test('returns false for non-existent id', () => {
    expect(taskService.remove('no-id')).toBe(false);
  });
});

// completeTask
describe('completeTask', () => {
  test('marks a task as done with completedAt', () => {
    const task = createSampleTask();
    const completed = taskService.completeTask(task.id);
    expect(completed.status).toBe('done');
    expect(completed.completedAt).toBeDefined();
  });

  test('returns null for non-existent task', () => {
    expect(taskService.completeTask('no-id')).toBeNull();
  });

  // bug: completeTask resets priority to 'medium'
  test('resets priority to medium (bug)', () => {
    const task = createSampleTask({ priority: 'high' });
    const completed = taskService.completeTask(task.id);
    expect(completed.priority).toBe('medium');
  });
});

// getByStatus
describe('getByStatus', () => {
  test('filters tasks by status', () => {
    createSampleTask({ title: 'A', status: 'todo' });
    createSampleTask({ title: 'B', status: 'in_progress' });
    createSampleTask({ title: 'C', status: 'done' });
    const todos = taskService.getByStatus('todo');
    expect(todos).toHaveLength(1);
    expect(todos[0].title).toBe('A');
  });

  test('returns empty when no tasks match', () => {
    createSampleTask({ status: 'todo' });
    expect(taskService.getByStatus('done')).toEqual([]);
  });

  // bug: uses includes() so partial strings like "in" match "in_progress"
  test('partial match bug with includes()', () => {
    createSampleTask({ title: 'IP', status: 'in_progress' });
    const result = taskService.getByStatus('in');
    expect(result).toHaveLength(1);
  });
});

// getPaginated
describe('getPaginated', () => {
  beforeEach(() => {
    for (let i = 1; i <= 15; i++) {
      createSampleTask({ title: `Task ${i}` });
    }
  });

  // bug: offset = page * limit instead of (page-1) * limit
  test('page 1 skips first items (offset bug)', () => {
    const page1 = taskService.getPaginated(1, 5);
    expect(page1[0].title).toBe('Task 6'); // should be Task 1
    expect(page1).toHaveLength(5);
  });

  test('returns empty for out-of-range page', () => {
    const result = taskService.getPaginated(100, 5);
    expect(result).toEqual([]);
  });
});

// getStats
describe('getStats', () => {
  test('returns zeroes when no tasks exist', () => {
    expect(taskService.getStats()).toEqual({
      todo: 0,
      in_progress: 0,
      done: 0,
      overdue: 0,
    });
  });

  test('counts tasks by status', () => {
    createSampleTask({ status: 'todo' });
    createSampleTask({ status: 'todo' });
    createSampleTask({ status: 'in_progress' });
    createSampleTask({ status: 'done' });
    const stats = taskService.getStats();
    expect(stats.todo).toBe(2);
    expect(stats.in_progress).toBe(1);
    expect(stats.done).toBe(1);
  });

  test('counts overdue tasks (past due, not done)', () => {
    createSampleTask({ status: 'todo', dueDate: '2020-01-01T00:00:00.000Z' });
    createSampleTask({ status: 'done', dueDate: '2020-01-01T00:00:00.000Z' });
    const stats = taskService.getStats();
    expect(stats.overdue).toBe(1);
  });

  test('future due date is not overdue', () => {
    createSampleTask({ status: 'todo', dueDate: '2099-12-31T00:00:00.000Z' });
    expect(taskService.getStats().overdue).toBe(0);
  });
});

// _reset
describe('_reset', () => {
  test('clears all tasks', () => {
    createSampleTask();
    createSampleTask();
    taskService._reset();
    expect(taskService.getAll()).toEqual([]);
  });
});
