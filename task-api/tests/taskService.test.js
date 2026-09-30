const service = require('../src/services/taskService');

beforeEach(() => service._reset());

describe('taskService.create', () => {
  test('applies defaults', () => {
    const t = service.create({ title: 'A' });
    expect(t).toMatchObject({
      title: 'A', description: '', status: 'todo', priority: 'medium',
      dueDate: null, completedAt: null, assignee: null,
    });
    expect(typeof t.id).toBe('string');
    expect(new Date(t.createdAt).toString()).not.toBe('Invalid Date');
  });

  test('keeps provided fields', () => {
    const t = service.create({ title: 'A', description: 'd', status: 'in_progress', priority: 'high', dueDate: '2030-01-01T00:00:00.000Z' });
    expect(t).toMatchObject({ description: 'd', status: 'in_progress', priority: 'high', dueDate: '2030-01-01T00:00:00.000Z' });
  });

  test('generates unique ids', () => {
    expect(service.create({ title: 'a' }).id).not.toBe(service.create({ title: 'b' }).id);
  });
});

describe('taskService.getAll / findById', () => {
  test('getAll returns empty array initially', () => {
    expect(service.getAll()).toEqual([]);
  });

  test('getAll returns a copy, not the internal array', () => {
    service.create({ title: 'a' });
    const list = service.getAll();
    list.pop();
    expect(service.getAll()).toHaveLength(1);
  });

  test('findById finds existing and returns undefined for missing', () => {
    const t = service.create({ title: 'a' });
    expect(service.findById(t.id)).toEqual(t);
    expect(service.findById('nope')).toBeUndefined();
  });
});

describe('taskService.getByStatus', () => {
  beforeEach(() => {
    service.create({ title: 'a', status: 'todo' });
    service.create({ title: 'b', status: 'in_progress' });
    service.create({ title: 'c', status: 'done' });
  });

  test('returns exact matches', () => {
    expect(service.getByStatus('todo').map((t) => t.title)).toEqual(['a']);
    expect(service.getByStatus('done').map((t) => t.title)).toEqual(['c']);
  });

  test('returns empty for unknown status', () => {
    expect(service.getByStatus('bogus')).toEqual([]);
  });

  // BUG: uses String.includes, so partial strings match ("do" matches todo & done)
  test.failing('does not partially match status strings', () => {
    expect(service.getByStatus('do')).toEqual([]);
  });
});

describe('taskService.getPaginated', () => {
  beforeEach(() => {
    for (let i = 1; i <= 5; i++) service.create({ title: `t${i}` });
  });

  test('page 1 returns the first items', () => {
    expect(service.getPaginated(1, 2).map((t) => t.title)).toEqual(['t1', 't2']);
  });

  test('page 2 returns the next items', () => {
    expect(service.getPaginated(2, 2).map((t) => t.title)).toEqual(['t3', 't4']);
  });

  test('returns empty array past the last page', () => {
    expect(service.getPaginated(50, 10)).toEqual([]);
  });

  // Fixed bug: page <= 0 used to produce a negative/zero offset; now clamps to page 1
  test('page 0 or negative falls back to page 1', () => {
    expect(service.getPaginated(0, 2).map((t) => t.title)).toEqual(['t1', 't2']);
  });
});

describe('taskService.getStats', () => {
  test('empty store gives zeros', () => {
    expect(service.getStats()).toEqual({ todo: 0, in_progress: 0, done: 0, overdue: 0 });
  });

  test('counts by status and overdue', () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    const future = new Date(Date.now() + 86400000).toISOString();
    service.create({ title: 'a', status: 'todo', dueDate: past });          // overdue
    service.create({ title: 'b', status: 'in_progress', dueDate: past });   // overdue
    service.create({ title: 'c', status: 'done', dueDate: past });          // done -> not overdue
    service.create({ title: 'd', status: 'todo', dueDate: future });        // not yet due
    service.create({ title: 'e', status: 'todo' });                         // no due date
    expect(service.getStats()).toEqual({ todo: 3, in_progress: 1, done: 1, overdue: 2 });
  });
});

describe('taskService.update', () => {
  test('merges fields and persists', () => {
    const t = service.create({ title: 'a' });
    const u = service.update(t.id, { title: 'b', priority: 'high' });
    expect(u).toMatchObject({ id: t.id, title: 'b', priority: 'high', status: 'todo' });
    expect(service.findById(t.id).title).toBe('b');
  });

  test('returns null for unknown id', () => {
    expect(service.update('nope', { title: 'x' })).toBeNull();
  });
});

describe('taskService.remove', () => {
  test('removes existing task', () => {
    const t = service.create({ title: 'a' });
    expect(service.remove(t.id)).toBe(true);
    expect(service.getAll()).toEqual([]);
  });

  test('returns false for unknown id', () => {
    expect(service.remove('nope')).toBe(false);
  });
});

describe('taskService.assignTask', () => {
  test('sets the assignee on an existing task', () => {
    const t = service.create({ title: 'a' });
    const updated = service.assignTask(t.id, 'Alice');
    expect(updated.assignee).toBe('Alice');
    expect(service.findById(t.id).assignee).toBe('Alice');
  });

  test('returns null for unknown id', () => {
    expect(service.assignTask('nope', 'Alice')).toBeNull();
  });

  test('overwrites an existing assignee', () => {
    const t = service.create({ title: 'a' });
    service.assignTask(t.id, 'Alice');
    const updated = service.assignTask(t.id, 'Bob');
    expect(updated.assignee).toBe('Bob');
  });
});

describe('taskService.completeTask', () => {
  test('marks done and sets completedAt', () => {
    const t = service.create({ title: 'a' });
    const c = service.completeTask(t.id);
    expect(c.status).toBe('done');
    expect(new Date(c.completedAt).toString()).not.toBe('Invalid Date');
    expect(service.findById(t.id).status).toBe('done');
  });

  test('returns null for unknown id', () => {
    expect(service.completeTask('nope')).toBeNull();
  });

  // BUG: completeTask hard-codes priority: 'medium', overwriting the real priority
  test.failing('preserves the task priority', () => {
    const t = service.create({ title: 'a', priority: 'high' });
    expect(service.completeTask(t.id).priority).toBe('high');
  });
});
