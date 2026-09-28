const taskService = require('../src/services/taskService');

const PAST = '2020-01-01T00:00:00.000Z';
const FUTURE = '2099-01-01T00:00:00.000Z';

describe('taskService', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('create', () => {
    test('applies defaults for omitted fields', () => {
      const task = taskService.create({ title: 'Only title' });
      expect(task.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(task.title).toBe('Only title');
      expect(task.description).toBe('');
      expect(task.status).toBe('todo');
      expect(task.priority).toBe('medium');
      expect(task.dueDate).toBeNull();
      expect(task.completedAt).toBeNull();
      expect(task.createdAt).toEqual(expect.any(String));
    });

    test('stores provided fields', () => {
      const task = taskService.create({
        title: 'Full',
        description: 'desc',
        status: 'in_progress',
        priority: 'high',
        dueDate: FUTURE,
      });
      expect(task.title).toBe('Full');
      expect(task.description).toBe('desc');
      expect(task.status).toBe('in_progress');
      expect(task.priority).toBe('high');
      expect(task.dueDate).toBe(FUTURE);
    });

    test('assigns unique ids', () => {
      const a = taskService.create({ title: 'a' });
      const b = taskService.create({ title: 'b' });
      expect(a.id).not.toBe(b.id);
    });
  });

  describe('getAll', () => {
    test('returns empty array when no tasks', () => {
      expect(taskService.getAll()).toEqual([]);
    });

    test('returns all created tasks', () => {
      taskService.create({ title: 'a' });
      taskService.create({ title: 'b' });
      expect(taskService.getAll()).toHaveLength(2);
    });
  });

  describe('findById', () => {
    test('returns the task when found', () => {
      const t = taskService.create({ title: 'a' });
      expect(taskService.findById(t.id)).toEqual(t);
    });

    test('returns undefined when not found', () => {
      expect(taskService.findById('nope')).toBeUndefined();
    });
  });

  describe('getByStatus', () => {
    test('returns only tasks with the exact status', () => {
      taskService.create({ title: 'todo', status: 'todo' });
      taskService.create({ title: 'done', status: 'done' });
      const result = taskService.getByStatus('todo');
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('todo');
    });

    // BUG 3: getByStatus uses `status.includes(query)` (substring match).
    // A query that is a substring of several statuses wrongly matches them.
    test('does not substring-match partial status values', () => {
      taskService.create({ title: 'todo', status: 'todo' });
      taskService.create({ title: 'prog', status: 'in_progress' });
      // 'o' is a substring of both 'todo' and 'in_progress'.
      // Correct behaviour: no task has status exactly 'o' -> [].
      expect(taskService.getByStatus('o')).toEqual([]);
    });
  });

  describe('getPaginated', () => {
    test('page 1 returns the first items', () => {
      // BUG 1 (fixed): offset was page * limit, so page 1 skipped the first page.
      for (let i = 1; i <= 4; i++) taskService.create({ title: `Task ${i}` });
      const page1 = taskService.getPaginated(1, 2);
      expect(page1.map((t) => t.title)).toEqual(['Task 1', 'Task 2']);
    });

    test('page 2 returns the next items', () => {
      for (let i = 1; i <= 4; i++) taskService.create({ title: `Task ${i}` });
      const page2 = taskService.getPaginated(2, 2);
      expect(page2.map((t) => t.title)).toEqual(['Task 3', 'Task 4']);
    });

    test('clamps a page below 1 to the first page', () => {
      for (let i = 1; i <= 4; i++) taskService.create({ title: `Task ${i}` });
      expect(taskService.getPaginated(0, 2).map((t) => t.title)).toEqual(['Task 1', 'Task 2']);
      expect(taskService.getPaginated(-3, 2).map((t) => t.title)).toEqual(['Task 1', 'Task 2']);
    });

    test('falls back to safe defaults for non-numeric input', () => {
      for (let i = 1; i <= 4; i++) taskService.create({ title: `Task ${i}` });
      expect(taskService.getPaginated('abc', 'abc')).toHaveLength(4);
      expect(taskService.getPaginated(undefined, undefined)).toHaveLength(4);
    });

    test('never returns an empty page for a non-positive limit', () => {
      for (let i = 1; i <= 3; i++) taskService.create({ title: `Task ${i}` });
      expect(taskService.getPaginated(1, 0).length).toBeGreaterThan(0);
      expect(taskService.getPaginated(1, -5).length).toBeGreaterThan(0);
    });

    test('returns empty when page is beyond range', () => {
      taskService.create({ title: 'a' });
      taskService.create({ title: 'b' });
      expect(taskService.getPaginated(2, 10)).toEqual([]);
    });
  });

  describe('getStats', () => {
    test('returns zero counts when empty', () => {
      expect(taskService.getStats()).toEqual({ todo: 0, in_progress: 0, done: 0, overdue: 0 });
    });

    test('counts tasks by status', () => {
      taskService.create({ title: 'a', status: 'todo' });
      taskService.create({ title: 'b', status: 'todo' });
      taskService.create({ title: 'c', status: 'in_progress' });
      taskService.create({ title: 'd', status: 'done' });
      expect(taskService.getStats()).toEqual({ todo: 2, in_progress: 1, done: 1, overdue: 0 });
    });

    test('counts overdue tasks (past due, not done)', () => {
      taskService.create({ title: 'overdue', status: 'todo', dueDate: PAST });
      taskService.create({ title: 'future', status: 'todo', dueDate: FUTURE });
      taskService.create({ title: 'done-overdue', status: 'done', dueDate: PAST });
      expect(taskService.getStats().overdue).toBe(1);
    });
  });

  describe('update', () => {
    test('updates provided fields and returns the task', () => {
      const t = taskService.create({ title: 'a' });
      const updated = taskService.update(t.id, { title: 'b', priority: 'high' });
      expect(updated.title).toBe('b');
      expect(updated.priority).toBe('high');
      expect(taskService.findById(t.id).title).toBe('b');
    });

    test('returns null when task not found', () => {
      expect(taskService.update('nope', { title: 'x' })).toBeNull();
    });

    // BUG 5: update spreads the whole body, so a client can overwrite `id`.
    test('does not allow overwriting the task id', () => {
      const t = taskService.create({ title: 'a' });
      const updated = taskService.update(t.id, { id: 'HACKED', title: 'b' });
      expect(updated.id).toBe(t.id);
      expect(taskService.findById(t.id)).toBeDefined();
    });

    // BUG 6: updating status to 'done' does not stamp completedAt.
    test('stamps completedAt when status becomes done', () => {
      const t = taskService.create({ title: 'a', status: 'todo' });
      const updated = taskService.update(t.id, { status: 'done' });
      expect(updated.status).toBe('done');
      expect(updated.completedAt).toEqual(expect.any(String));
    });
  });

  describe('remove', () => {
    test('removes the task and returns true', () => {
      const t = taskService.create({ title: 'a' });
      expect(taskService.remove(t.id)).toBe(true);
      expect(taskService.findById(t.id)).toBeUndefined();
    });

    test('returns false when task not found', () => {
      expect(taskService.remove('nope')).toBe(false);
    });
  });

  describe('completeTask', () => {
    test('marks the task done and stamps completedAt', () => {
      const t = taskService.create({ title: 'a' });
      const done = taskService.completeTask(t.id);
      expect(done.status).toBe('done');
      expect(done.completedAt).toEqual(expect.any(String));
    });

    test('returns null when task not found', () => {
      expect(taskService.completeTask('nope')).toBeNull();
    });

    // BUG 4: completeTask hardcodes priority to 'medium', clobbering the real value.
    test('preserves the task priority when completing', () => {
      const t = taskService.create({ title: 'a', priority: 'high' });
      const done = taskService.completeTask(t.id);
      expect(done.priority).toBe('high');
    });
  });
});