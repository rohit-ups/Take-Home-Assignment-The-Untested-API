const service = require('../src/services/taskService');

beforeEach(() => service._reset());

describe('create', () => {
  test('applies defaults and generates id/createdAt', () => {
    const t = service.create({ title: 'A' });
    expect(t).toMatchObject({
      title: 'A', description: '', status: 'todo', priority: 'medium',
      dueDate: null, completedAt: null, assignee: null,
    });
    expect(t.id).toEqual(expect.any(String));
    expect(new Date(t.createdAt).toString()).not.toBe('Invalid Date');
  });

  test('respects provided fields', () => {
    const t = service.create({ title: 'B', status: 'in_progress', priority: 'high', dueDate: '2030-01-01' });
    expect(t).toMatchObject({ status: 'in_progress', priority: 'high', dueDate: '2030-01-01' });
  });
});

describe('getAll / findById', () => {
  test('getAll returns a copy of the list', () => {
    service.create({ title: 'A' });
    const list = service.getAll();
    list.pop();
    expect(service.getAll()).toHaveLength(1);
  });

  test('findById returns task or undefined', () => {
    const t = service.create({ title: 'A' });
    expect(service.findById(t.id)).toEqual(t);
    expect(service.findById('nope')).toBeUndefined();
  });
});

describe('getByStatus', () => {
  beforeEach(() => {
    service.create({ title: 'a', status: 'todo' });
    service.create({ title: 'b', status: 'in_progress' });
    service.create({ title: 'c', status: 'done' });
  });

  test('returns only exact matches', () => {
    expect(service.getByStatus('done').map((t) => t.title)).toEqual(['c']);
    expect(service.getByStatus('in_progress').map((t) => t.title)).toEqual(['b']);
  });

  test('does not substring-match (regression: "do" used to match todo AND done)', () => {
    expect(service.getByStatus('do')).toEqual([]);
  });

  test('unknown status returns empty array', () => {
    expect(service.getByStatus('bogus')).toEqual([]);
  });
});

describe('getPaginated', () => {
  beforeEach(() => {
    for (let i = 1; i <= 5; i++) service.create({ title: `T${i}` });
  });

  test('page 1 returns the first items (regression: used to skip first page)', () => {
    expect(service.getPaginated(1, 2).map((t) => t.title)).toEqual(['T1', 'T2']);
  });

  test('later pages and partial last page', () => {
    expect(service.getPaginated(2, 2).map((t) => t.title)).toEqual(['T3', 'T4']);
    expect(service.getPaginated(3, 2).map((t) => t.title)).toEqual(['T5']);
  });

  test('page beyond the end returns empty array', () => {
    expect(service.getPaginated(10, 2)).toEqual([]);
  });
});

describe('getStats', () => {
  test('empty store', () => {
    expect(service.getStats()).toEqual({ todo: 0, in_progress: 0, done: 0, overdue: 0 });
  });

  test('counts by status and overdue (excludes done and future/no due date)', () => {
    service.create({ title: '1', status: 'todo', dueDate: '2000-01-01T00:00:00Z' });        // overdue
    service.create({ title: '2', status: 'in_progress', dueDate: '2000-01-01T00:00:00Z' }); // overdue
    service.create({ title: '3', status: 'done', dueDate: '2000-01-01T00:00:00Z' });        // done -> not overdue
    service.create({ title: '4', status: 'todo', dueDate: '2999-01-01T00:00:00Z' });        // future
    service.create({ title: '5', status: 'todo' });                                          // no due date
    expect(service.getStats()).toEqual({ todo: 3, in_progress: 1, done: 1, overdue: 2 });
  });
});

describe('update', () => {
  test('merges fields and returns updated task', () => {
    const t = service.create({ title: 'A' });
    const u = service.update(t.id, { title: 'B', priority: 'high' });
    expect(u).toMatchObject({ id: t.id, title: 'B', priority: 'high' });
    expect(service.findById(t.id).title).toBe('B');
  });

  test('returns null for unknown id', () => {
    expect(service.update('nope', { title: 'x' })).toBeNull();
  });

  // fields are spread without a whitelist.
  test.failing('should not allow overwriting id', () => {
    const t = service.create({ title: 'A' });
    const u = service.update(t.id, { id: 'hacked' });
    expect(u.id).toBe(t.id);
  });
});

describe('remove', () => {
  test('removes existing task', () => {
    const t = service.create({ title: 'A' });
    expect(service.remove(t.id)).toBe(true);
    expect(service.getAll()).toHaveLength(0);
  });

  test('returns false for unknown id', () => {
    expect(service.remove('nope')).toBe(false);
  });
});

describe('completeTask', () => {
  test('sets status done and completedAt', () => {
    const t = service.create({ title: 'A' });
    const c = service.completeTask(t.id);
    expect(c.status).toBe('done');
    expect(new Date(c.completedAt).toString()).not.toBe('Invalid Date');
  });

  test('returns null for unknown id', () => {
    expect(service.completeTask('nope')).toBeNull();
  });


  test.failing('should preserve priority', () => {
    const t = service.create({ title: 'A', priority: 'high' });
    expect(service.completeTask(t.id).priority).toBe('high');
  });

  // re-completing overwrites the original completion time
  test.failing('completing twice should not change completedAt', () => {
    jest.useFakeTimers();
    try {
      jest.setSystemTime(new Date('2030-01-01T00:00:00Z'));
      const t = service.create({ title: 'A' });
      const first = service.completeTask(t.id);
      jest.setSystemTime(new Date('2030-01-02T00:00:00Z'));
      const second = service.completeTask(t.id);
      expect(second.completedAt).toBe(first.completedAt);
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('assign', () => {
  test('stores trimmed assignee and returns updated task', () => {
    const t = service.create({ title: 'A' });
    const a = service.assign(t.id, '  Alice  ');
    expect(a.assignee).toBe('Alice');
    expect(service.findById(t.id).assignee).toBe('Alice');
  });

  test('returns null for unknown id', () => {
    expect(service.assign('nope', 'Bob')).toBeNull();
  });

  test('reassigning replaces the previous assignee', () => {
    const t = service.create({ title: 'A' });
    service.assign(t.id, 'Alice');
    expect(service.assign(t.id, 'Bob').assignee).toBe('Bob');
  });
});
