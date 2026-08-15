const taskService = require('../src/services/taskService');

describe('taskService', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('create', () => {
    it('creates a task with defaults applied', () => {
      const task = taskService.create({ title: 'Write tests' });

      expect(task.title).toBe('Write tests');
      expect(task.description).toBe('');
      expect(task.status).toBe('todo');
      expect(task.priority).toBe('medium');
      expect(task.dueDate).toBeNull();
      expect(task.completedAt).toBeNull();
      expect(task.id).toEqual(expect.any(String));
      expect(task.createdAt).toEqual(expect.any(String));
    });

    it('creates a task honoring provided fields', () => {
      const task = taskService.create({
        title: 'Ship feature',
        description: 'Important work',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2026-01-01T00:00:00.000Z',
      });

      expect(task.status).toBe('in_progress');
      expect(task.priority).toBe('high');
      expect(task.dueDate).toBe('2026-01-01T00:00:00.000Z');
    });

    it('assigns unique ids to each task', () => {
      const t1 = taskService.create({ title: 'A' });
      const t2 = taskService.create({ title: 'B' });
      expect(t1.id).not.toBe(t2.id);
    });
  });

  describe('findById', () => {
    it('finds an existing task', () => {
      const created = taskService.create({ title: 'Find me' });
      expect(taskService.findById(created.id)).toEqual(created);
    });

    it('returns undefined for a non-existent id', () => {
      expect(taskService.findById('does-not-exist')).toBeUndefined();
    });
  });

  describe('getAll', () => {
    it('returns an empty array when there are no tasks', () => {
      expect(taskService.getAll()).toEqual([]);
    });

    it('returns all created tasks', () => {
      taskService.create({ title: 'A' });
      taskService.create({ title: 'B' });
      expect(taskService.getAll()).toHaveLength(2);
    });

    it('returns a copy, not the live internal array', () => {
      taskService.create({ title: 'A' });
      const result = taskService.getAll();
      result.push({ title: 'Injected' });
      expect(taskService.getAll()).toHaveLength(1);
    });
  });

  describe('getByStatus', () => {
    it('returns tasks matching the given status exactly', () => {
      taskService.create({ title: 'A', status: 'todo' });
      taskService.create({ title: 'B', status: 'done' });

      const result = taskService.getByStatus('todo');
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('A');
    });

    // BUG: getByStatus uses String.includes(), which does substring
    // matching instead of exact matching. 'do' is a substring of both
    // 'todo' and 'done', so filtering by 'do' incorrectly returns both.
    // This test documents the current (buggy) behavior so it fails
    // once the bug is fixed -- see BUGS.md, Bug #1.
    it('BUG: incorrectly matches on substring instead of exact status', () => {
      taskService.create({ title: 'A', status: 'todo' });
      taskService.create({ title: 'B', status: 'done' });

      // 'do' is a substring of 'todo' AND 'done' -- exact matching
      // should return zero results since 'do' is not a valid status.
      const result = taskService.getByStatus('do');
      expect(result).toHaveLength(2); // documents the bug; should be 0
    });
  });

  describe('getPaginated', () => {
    beforeEach(() => {
      for (let i = 1; i <= 25; i++) {
        taskService.create({ title: `Task ${i}` });
      }
    });

    // FIXED (Bug #2): page=1 now correctly returns the first `limit`
    // items instead of skipping them. See BUGS.md, Bug #2.
    it('FIXED: page=1 returns the first `limit` items', () => {
      const page1 = taskService.getPaginated(1, 10);
      expect(page1).toHaveLength(10);
      expect(page1[0].title).toBe('Task 1');
      expect(page1[9].title).toBe('Task 10');
    });

    it('returns the correct slice for page 2', () => {
      const page2 = taskService.getPaginated(2, 10);
      expect(page2).toHaveLength(10);
      expect(page2[0].title).toBe('Task 11');
      expect(page2[9].title).toBe('Task 20');
    });

    it('returns a partial page for the last page', () => {
      const page3 = taskService.getPaginated(3, 10);
      expect(page3).toHaveLength(5);
      expect(page3[0].title).toBe('Task 21');
    });

    it('returns an empty array when the page is beyond available data', () => {
      const page = taskService.getPaginated(10, 10);
      expect(page).toEqual([]);
    });

    it('treats page=0 the same as page=1 (guard against invalid page)', () => {
      const page0 = taskService.getPaginated(0, 10);
      const page1 = taskService.getPaginated(1, 10);
      expect(page0).toEqual(page1);
    });
  });

  describe('getStats', () => {
    it('returns zero counts when there are no tasks', () => {
      expect(taskService.getStats()).toEqual({ todo: 0, in_progress: 0, done: 0, overdue: 0 });
    });

    it('counts tasks by status', () => {
      taskService.create({ title: 'A', status: 'todo' });
      taskService.create({ title: 'B', status: 'todo' });
      taskService.create({ title: 'C', status: 'done' });

      const stats = taskService.getStats();
      expect(stats.todo).toBe(2);
      expect(stats.done).toBe(1);
      expect(stats.in_progress).toBe(0);
    });

    it('counts a task with a past dueDate that is not done as overdue', () => {
      taskService.create({ title: 'Late', dueDate: '2000-01-01T00:00:00.000Z' });
      expect(taskService.getStats().overdue).toBe(1);
    });

    it('does not count a done task as overdue even if dueDate is in the past', () => {
      const task = taskService.create({ title: 'Late but done', dueDate: '2000-01-01T00:00:00.000Z' });
      taskService.completeTask(task.id);
      expect(taskService.getStats().overdue).toBe(0);
    });

    it('does not count a task with a future dueDate as overdue', () => {
      taskService.create({ title: 'Not due yet', dueDate: '2099-01-01T00:00:00.000Z' });
      expect(taskService.getStats().overdue).toBe(0);
    });

    it('does not count a task with no dueDate as overdue', () => {
      taskService.create({ title: 'No due date' });
      expect(taskService.getStats().overdue).toBe(0);
    });
  });

  describe('update', () => {
    it('updates only the provided fields', () => {
      const task = taskService.create({ title: 'Original', priority: 'low' });
      const updated = taskService.update(task.id, { title: 'Updated' });

      expect(updated.title).toBe('Updated');
      expect(updated.priority).toBe('low');
    });

    it('returns null when updating a non-existent task', () => {
      expect(taskService.update('does-not-exist', { title: 'X' })).toBeNull();
    });

    // BUG: update() spreads the entire fields object over the existing
    // task with no field allow-list, so server-owned fields like `id`
    // and `createdAt` can be overwritten by the caller. See BUGS.md, Bug #4.
    it('BUG: allows overwriting server-owned fields like id and createdAt', () => {
      const task = taskService.create({ title: 'Original' });
      const updated = taskService.update(task.id, { id: 'hijacked-id', createdAt: '2000-01-01' });

      // Documents current (buggy) behavior.
      expect(updated.id).toBe('hijacked-id');
      expect(updated.createdAt).toBe('2000-01-01');
    });
  });

  describe('remove', () => {
    it('removes an existing task and returns true', () => {
      const task = taskService.create({ title: 'To delete' });
      expect(taskService.remove(task.id)).toBe(true);
      expect(taskService.findById(task.id)).toBeUndefined();
    });

    it('returns false when removing a non-existent task', () => {
      expect(taskService.remove('does-not-exist')).toBe(false);
    });
  });

  describe('completeTask', () => {
    it('marks a task as done and sets completedAt', () => {
      const task = taskService.create({ title: 'Finish me' });
      const completed = taskService.completeTask(task.id);

      expect(completed.status).toBe('done');
      expect(completed.completedAt).toEqual(expect.any(String));
    });

    it('returns null for a non-existent task', () => {
      expect(taskService.completeTask('does-not-exist')).toBeNull();
    });

    // BUG: completeTask unconditionally resets priority to 'medium',
    // discarding whatever priority the task actually had. See BUGS.md, Bug #3.
    it('BUG: resets priority to medium even if it was high', () => {
      const task = taskService.create({ title: 'Urgent', priority: 'high' });
      const completed = taskService.completeTask(task.id);

      // Documents current (buggy) behavior; priority should stay 'high'.
      expect(completed.priority).toBe('medium');
    });
  });
});
