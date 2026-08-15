const taskService = require('../src/services/taskService');

beforeEach(() => {
  taskService._reset();
});

describe('create()', () => {
  it('creates a task with all fields provided', () => {
    const task = taskService.create({
      title: 'Test Task',
      description: 'A description',
      status: 'in_progress',
      priority: 'high',
      dueDate: '2026-12-31T00:00:00.000Z',
    });

    expect(task).toMatchObject({
      title: 'Test Task',
      description: 'A description',
      status: 'in_progress',
      priority: 'high',
      dueDate: '2026-12-31T00:00:00.000Z',
      completedAt: null,
    });
    expect(task.id).toBeDefined();
    expect(task.createdAt).toBeDefined();
  });

  it('applies defaults for optional fields', () => {
    const task = taskService.create({ title: 'Minimal' });

    expect(task.status).toBe('todo');
    expect(task.priority).toBe('medium');
    expect(task.description).toBe('');
    expect(task.dueDate).toBeNull();
    expect(task.assignee).toBeNull();
    expect(task.completedAt).toBeNull();
  });
});

describe('getAll()', () => {
  it('returns all tasks', () => {
    taskService.create({ title: 'One' });
    taskService.create({ title: 'Two' });

    expect(taskService.getAll()).toHaveLength(2);
  });

  it('returns empty array when no tasks exist', () => {
    expect(taskService.getAll()).toEqual([]);
  });

  it('returns a copy, not a reference to the internal array', () => {
    taskService.create({ title: 'One' });
    const result = taskService.getAll();
    result.push({ title: 'Injected' });

    expect(taskService.getAll()).toHaveLength(1);
  });
});

describe('findById()', () => {
  it('finds an existing task', () => {
    const created = taskService.create({ title: 'Find me' });
    const found = taskService.findById(created.id);

    expect(found.title).toBe('Find me');
  });

  it('returns undefined for a non-existent id', () => {
    expect(taskService.findById('no-such-id')).toBeUndefined();
  });
});

describe('getByStatus()', () => {
  beforeEach(() => {
    taskService.create({ title: 'Todo task', status: 'todo' });
    taskService.create({ title: 'Done task', status: 'done' });
    taskService.create({ title: 'In progress', status: 'in_progress' });
  });

  it('returns tasks matching the given status', () => {
    const todos = taskService.getByStatus('todo');
    expect(todos).toHaveLength(1);
    expect(todos[0].title).toBe('Todo task');
  });

  // BUG: getByStatus uses .includes() instead of ===, so partial strings match.
  // "do" is a substring of both "todo" and "done", so this returns 2 results
  // instead of 0. Once fixed, this test should assert length 0.
  it('matches substrings due to .includes() bug', () => {
    const results = taskService.getByStatus('do');
    expect(results.length).toBeGreaterThan(0);
  });
});

describe('getPaginated()', () => {
  beforeEach(() => {
    taskService.create({ title: 'Task 1' });
    taskService.create({ title: 'Task 2' });
    taskService.create({ title: 'Task 3' });
    taskService.create({ title: 'Task 4' });
    taskService.create({ title: 'Task 5' });
  });

  // Fixed: page 1 now correctly returns the first 2 items
  it('page 1 returns the first page of results', () => {
    const page1 = taskService.getPaginated(1, 2);
    expect(page1).toHaveLength(2);
    expect(page1[0].title).toBe('Task 1');
    expect(page1[1].title).toBe('Task 2');
  });

  it('returns empty array for page beyond data range', () => {
    const page = taskService.getPaginated(100, 2);
    expect(page).toEqual([]);
  });
});

describe('getStats()', () => {
  it('returns correct counts by status', () => {
    taskService.create({ title: 'T1', status: 'todo' });
    taskService.create({ title: 'T2', status: 'todo' });
    taskService.create({ title: 'T3', status: 'in_progress' });
    taskService.create({ title: 'T4', status: 'done' });

    const stats = taskService.getStats();
    expect(stats).toEqual({ todo: 2, in_progress: 1, done: 1, overdue: 0 });
  });

  it('counts overdue tasks (past dueDate, not done)', () => {
    taskService.create({ title: 'Overdue', status: 'todo', dueDate: '2020-01-01T00:00:00.000Z' });
    taskService.create({ title: 'Not overdue', status: 'todo', dueDate: '2099-01-01T00:00:00.000Z' });

    const stats = taskService.getStats();
    expect(stats.overdue).toBe(1);
  });

  it('does not count done tasks as overdue', () => {
    taskService.create({ title: 'Done overdue', status: 'done', dueDate: '2020-01-01T00:00:00.000Z' });

    const stats = taskService.getStats();
    expect(stats.overdue).toBe(0);
  });

  it('does not count tasks without dueDate as overdue', () => {
    taskService.create({ title: 'No due date', status: 'todo' });

    const stats = taskService.getStats();
    expect(stats.overdue).toBe(0);
  });

  it('returns zeroes when no tasks exist', () => {
    const stats = taskService.getStats();
    expect(stats).toEqual({ todo: 0, in_progress: 0, done: 0, overdue: 0 });
  });
});

describe('update()', () => {
  it('updates specified fields and preserves others', () => {
    const task = taskService.create({ title: 'Original', priority: 'high' });
    const updated = taskService.update(task.id, { title: 'Updated' });

    expect(updated.title).toBe('Updated');
    expect(updated.priority).toBe('high');
  });

  it('returns null for non-existent id', () => {
    expect(taskService.update('no-such-id', { title: 'X' })).toBeNull();
  });

  // BUG: update() spreads all fields without stripping, so id and createdAt
  // can be overwritten by the client.
  it('allows overwriting id due to unsanitized spread bug', () => {
    const task = taskService.create({ title: 'Original' });
    const updated = taskService.update(task.id, { id: 'hacked-id' });

    expect(updated.id).toBe('hacked-id');
  });
});

describe('remove()', () => {
  it('removes an existing task and returns true', () => {
    const task = taskService.create({ title: 'To remove' });
    expect(taskService.remove(task.id)).toBe(true);
    expect(taskService.getAll()).toHaveLength(0);
  });

  it('returns false for non-existent id', () => {
    expect(taskService.remove('no-such-id')).toBe(false);
  });
});

describe('completeTask()', () => {
  it('sets status to done and adds completedAt', () => {
    const task = taskService.create({ title: 'Complete me' });
    const completed = taskService.completeTask(task.id);

    expect(completed.status).toBe('done');
    expect(completed.completedAt).toBeDefined();
    expect(new Date(completed.completedAt).getTime()).not.toBeNaN();
  });

  it('returns null for non-existent id', () => {
    expect(taskService.completeTask('no-such-id')).toBeNull();
  });

  // BUG: completeTask() hardcodes priority: 'medium', overwriting the original.
  it('resets priority to medium due to hardcoded priority bug', () => {
    const task = taskService.create({ title: 'High priority', priority: 'high' });
    const completed = taskService.completeTask(task.id);

    // Buggy behavior: priority is reset to 'medium' instead of staying 'high'
    expect(completed.priority).toBe('medium');
  });
});

describe('assignTask()', () => {
  it('assigns an assignee to a task', () => {
    const task = taskService.create({ title: 'Assign me' });
    const assigned = taskService.assignTask(task.id, 'Alice');

    expect(assigned.assignee).toBe('Alice');
    expect(assigned.title).toBe('Assign me');
  });

  it('returns null for non-existent id', () => {
    expect(taskService.assignTask('no-such-id', 'Alice')).toBeNull();
  });

  it('allows reassignment to a different user', () => {
    const task = taskService.create({ title: 'Reassign me' });
    taskService.assignTask(task.id, 'Alice');
    const reassigned = taskService.assignTask(task.id, 'Bob');

    expect(reassigned.assignee).toBe('Bob');
  });
});

describe('_reset()', () => {
  it('clears all tasks', () => {
    taskService.create({ title: 'One' });
    taskService.create({ title: 'Two' });
    taskService._reset();

    expect(taskService.getAll()).toEqual([]);
  });
});
