const taskService = require('../src/services/taskService');

beforeEach(() => taskService._reset());

describe('taskService', () => {
  describe('create / getAll / findById', () => {
    test('creates a task with defaults', () => {
      const t = taskService.create({ title: 'A' });
      expect(t).toMatchObject({
        title: 'A', description: '', status: 'todo',
        priority: 'medium', dueDate: null, completedAt: null,
      });
      expect(t.id).toBeDefined();
      expect(taskService.findById(t.id)).toEqual(t);
    });

    test('getAll returns a copy, not the internal array', () => {
      taskService.create({ title: 'A' });
      const list = taskService.getAll();
      list.pop();
      expect(taskService.getAll()).toHaveLength(1);
    });

    test('findById returns undefined for unknown id', () => {
      expect(taskService.findById('nope')).toBeUndefined();
    });
  });

  describe('getByStatus', () => {
    beforeEach(() => {
      taskService.create({ title: 'a', status: 'todo' });
      taskService.create({ title: 'b', status: 'done' });
      taskService.create({ title: 'c', status: 'in_progress' });
    });

    test('filters by exact status', () => {
      expect(taskService.getByStatus('done')).toHaveLength(1);
    });

    // BUG #2: substring match. Remove .failing once fixed.
    test.failing('does not match partial status strings', () => {
      expect(taskService.getByStatus('do')).toHaveLength(0);
    });
  });

  describe('getPaginated', () => {
    beforeEach(() => {
      for (let i = 1; i <= 5; i++) taskService.create({ title: `t${i}` });
    });

    test('page 1 returns the first items', () => {
      const r = taskService.getPaginated(1, 2);
      expect(r.map((t) => t.title)).toEqual(['t1', 't2']);
    });

    test('page 2 returns the next items', () => {
      const r = taskService.getPaginated(2, 2);
      expect(r.map((t) => t.title)).toEqual(['t3', 't4']);
    });

    test('last page may be partial', () => {
      expect(taskService.getPaginated(3, 2).map((t) => t.title)).toEqual(['t5']);
    });

    test('page beyond the end returns empty array', () => {
      expect(taskService.getPaginated(10, 2)).toEqual([]);
    });
  });

  describe('getStats', () => {
    test('counts by status and overdue', () => {
      const past = new Date(Date.now() - 86400000).toISOString();
      const future = new Date(Date.now() + 86400000).toISOString();
      taskService.create({ title: 'a', status: 'todo', dueDate: past });        // overdue
      taskService.create({ title: 'b', status: 'in_progress', dueDate: future });
      taskService.create({ title: 'c', status: 'done', dueDate: past });        // done, not overdue
      expect(taskService.getStats()).toEqual({ todo: 1, in_progress: 1, done: 1, overdue: 1 });
    });

    test('empty store gives zeros', () => {
      expect(taskService.getStats()).toEqual({ todo: 0, in_progress: 0, done: 0, overdue: 0 });
    });
  });

  describe('update', () => {
    test('merges fields and returns updated task', () => {
      const t = taskService.create({ title: 'A' });
      const u = taskService.update(t.id, { title: 'B' });
      expect(u.title).toBe('B');
      expect(taskService.findById(t.id).title).toBe('B');
    });

    test('returns null for unknown id', () => {
      expect(taskService.update('nope', { title: 'x' })).toBeNull();
    });

    // BUG #4
    test.failing('cannot overwrite id', () => {
      const t = taskService.create({ title: 'A' });
      const u = taskService.update(t.id, { id: 'hacked' });
      expect(u.id).toBe(t.id);
    });
  });

  describe('remove', () => {
    test('removes existing task', () => {
      const t = taskService.create({ title: 'A' });
      expect(taskService.remove(t.id)).toBe(true);
      expect(taskService.getAll()).toHaveLength(0);
    });

    test('returns false for unknown id', () => {
      expect(taskService.remove('nope')).toBe(false);
    });
  });

  describe('completeTask', () => {
    test('sets status done and completedAt', () => {
      const t = taskService.create({ title: 'A' });
      const c = taskService.completeTask(t.id);
      expect(c.status).toBe('done');
      expect(new Date(c.completedAt).toString()).not.toBe('Invalid Date');
    });

    test('returns null for unknown id', () => {
      expect(taskService.completeTask('nope')).toBeNull();
    });

    // BUG #3
    test.failing('preserves priority when completing', () => {
      const t = taskService.create({ title: 'A', priority: 'high' });
      expect(taskService.completeTask(t.id).priority).toBe('high');
    });
  });
});