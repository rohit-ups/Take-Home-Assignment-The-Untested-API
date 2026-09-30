// Unit tests for the service layer. The store is module-level state, so every
// test starts from a clean slate via _reset().
const taskService = require('../src/services/taskService');

beforeEach(() => taskService._reset());

const seed = (n) =>
  Array.from({ length: n }, (_, i) => taskService.create({ title: `task ${i + 1}` }));

describe('create', () => {
  test('applies defaults for optional fields', () => {
    const t = taskService.create({ title: 'a' });
    expect(t).toMatchObject({
      title: 'a', description: '', status: 'todo', priority: 'medium',
      dueDate: null, completedAt: null,
    });
    expect(t.id).toEqual(expect.any(String));
    expect(new Date(t.createdAt).toString()).not.toBe('Invalid Date');
  });

  test('keeps provided fields and generates unique ids', () => {
    const a = taskService.create({ title: 'a', priority: 'high', status: 'in_progress' });
    const b = taskService.create({ title: 'b' });
    expect(a.priority).toBe('high');
    expect(a.status).toBe('in_progress');
    expect(a.id).not.toBe(b.id);
  });
});

describe('getAll / findById', () => {
  test('getAll returns every task, and mutating the returned array does not touch the store', () => {
    seed(2);
    const all = taskService.getAll();
    expect(all).toHaveLength(2);
    all.pop();
    expect(taskService.getAll()).toHaveLength(2);
  });

  test('findById returns the task or undefined', () => {
    const [t] = seed(1);
    expect(taskService.findById(t.id)).toEqual(t);
    expect(taskService.findById('nope')).toBeUndefined();
  });
});

describe('getByStatus', () => {
  test('returns only tasks with the exact status', () => {
    taskService.create({ title: 'a', status: 'todo' });
    taskService.create({ title: 'b', status: 'done' });
    expect(taskService.getByStatus('done')).toHaveLength(1);
    expect(taskService.getByStatus('in_progress')).toHaveLength(0);
  });
});

describe('getPaginated', () => {
  test('page 1 is the FIRST page (1-indexed, as the API docs imply)', () => {
    seed(5);
    const page = taskService.getPaginated(1, 2);
    expect(page.map((t) => t.title)).toEqual(['task 1', 'task 2']);
  });

  test('page 2 continues where page 1 stopped', () => {
    seed(5);
    expect(taskService.getPaginated(2, 2).map((t) => t.title)).toEqual(['task 3', 'task 4']);
  });

  test('a page past the end is empty', () => {
    seed(3);
    expect(taskService.getPaginated(5, 10)).toEqual([]);
  });
});

describe('getStats', () => {
  test('counts by status and counts overdue only for unfinished tasks', () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    const future = new Date(Date.now() + 86400000).toISOString();
    taskService.create({ title: 'a', status: 'todo', dueDate: past });          // overdue
    taskService.create({ title: 'b', status: 'in_progress', dueDate: past });   // overdue
    taskService.create({ title: 'c', status: 'done', dueDate: past });          // finished -> not overdue
    taskService.create({ title: 'd', status: 'todo', dueDate: future });        // not due yet
    taskService.create({ title: 'e', status: 'todo' });                         // no due date
    expect(taskService.getStats()).toEqual({ todo: 3, in_progress: 1, done: 1, overdue: 2 });
  });

  test('empty store gives all zeros', () => {
    expect(taskService.getStats()).toEqual({ todo: 0, in_progress: 0, done: 0, overdue: 0 });
  });
});

describe('update', () => {
  test('merges fields into the existing task', () => {
    const [t] = seed(1);
    const u = taskService.update(t.id, { title: 'new', priority: 'high' });
    expect(u).toMatchObject({ id: t.id, title: 'new', priority: 'high' });
    expect(taskService.findById(t.id).title).toBe('new');
  });

  test('returns null for an unknown id', () => {
    expect(taskService.update('nope', { title: 'x' })).toBeNull();
  });
});

describe('remove', () => {
  test('deletes an existing task', () => {
    const [t] = seed(1);
    expect(taskService.remove(t.id)).toBe(true);
    expect(taskService.getAll()).toHaveLength(0);
  });

  test('returns false for an unknown id', () => {
    expect(taskService.remove('nope')).toBe(false);
  });
});

describe('completeTask', () => {
  test('sets status done and completedAt', () => {
    const [t] = seed(1);
    const done = taskService.completeTask(t.id);
    expect(done.status).toBe('done');
    expect(new Date(done.completedAt).toString()).not.toBe('Invalid Date');
  });

  test('returns null for an unknown id', () => {
    expect(taskService.completeTask('nope')).toBeNull();
  });
});
