const taskService = require('../src/services/taskService');

describe('taskService', () => {
  beforeEach(() => {
    taskService._reset();
  });

  // ─── create ────────────────────────────────────────────────
  describe('create', () => {
    test('creates a task with all required fields', () => {
      const task = taskService.create({ title: 'Test task' });
      expect(task.id).toBeDefined();
      expect(task.title).toBe('Test task');
      expect(task.description).toBe('');
      expect(task.status).toBe('todo');
      expect(task.priority).toBe('medium');
      expect(task.dueDate).toBeNull();
      expect(task.completedAt).toBeNull();
      expect(task.createdAt).toBeDefined();
    });

    test('creates a task with custom fields', () => {
      const task = taskService.create({
        title: 'Custom task',
        description: 'A description',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2026-12-31T00:00:00.000Z',
      });
      expect(task.status).toBe('in_progress');
      expect(task.priority).toBe('high');
      expect(task.dueDate).toBe('2026-12-31T00:00:00.000Z');
    });

    test('generates unique IDs for each task', () => {
      const t1 = taskService.create({ title: 'Task 1' });
      const t2 = taskService.create({ title: 'Task 2' });
      expect(t1.id).not.toBe(t2.id);
    });
  });

  // ─── getAll ────────────────────────────────────────────────
  describe('getAll', () => {
    test('returns empty array when no tasks', () => {
      expect(taskService.getAll()).toEqual([]);
    });

    test('returns all created tasks', () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });
      expect(taskService.getAll()).toHaveLength(2);
    });
  });

  // ─── findById ──────────────────────────────────────────────
  describe('findById', () => {
    test('finds a task by id', () => {
      const task = taskService.create({ title: 'Find me' });
      expect(taskService.findById(task.id).title).toBe('Find me');
    });

    test('returns undefined for non-existent id', () => {
      expect(taskService.findById('non-existent')).toBeUndefined();
    });
  });

  // ─── getByStatus ──────────────────────────────────────────
  describe('getByStatus', () => {
    beforeEach(() => {
      taskService.create({ title: 'Task 1', status: 'todo' });
      taskService.create({ title: 'Task 2', status: 'in_progress' });
      taskService.create({ title: 'Task 3', status: 'done' });
    });

    test('returns tasks matching the exact status', () => {
      const tasks = taskService.getByStatus('todo');
      expect(tasks).toHaveLength(1);
      expect(tasks[0].title).toBe('Task 1');
    });

    test('returns empty array for status with no matches', () => {
      expect(taskService.getByStatus('unknown')).toEqual([]);
    });

    test('does NOT match partial status strings (bug: uses .includes)', () => {
      // getByStatus('in') should return [] but currently returns in_progress tasks
      const tasks = taskService.getByStatus('in');
      // This test documents the bug — it should be 0 but is 1
      expect(tasks).toHaveLength(0);
    });
  });

  // ─── getPaginated ──────────────────────────────────────────
  describe('getPaginated', () => {
    beforeEach(() => {
      for (let i = 1; i <= 25; i++) {
        taskService.create({ title: `Task ${i}` });
      }
    });

    test('returns correct page of results (bug: offset is page*limit)', () => {
      const page1 = taskService.getPaginated(1, 10);
      // Bug: offset = 1 * 10 = 10, so it skips the first 10 tasks
      // Expected: first 10 tasks (Task 1-10)
      expect(page1).toHaveLength(10);
      expect(page1[0].title).toBe('Task 1');
    });

    test('returns second page correctly', () => {
      const page2 = taskService.getPaginated(2, 10);
      expect(page2).toHaveLength(10);
      expect(page2[0].title).toBe('Task 11');
    });

    test('returns remaining items on last page', () => {
      const page3 = taskService.getPaginated(3, 10);
      expect(page3).toHaveLength(5);
      expect(page3[0].title).toBe('Task 21');
    });
  });

  // ─── getStats ─────────────────────────────────────────────
  describe('getStats', () => {
    test('returns zero counts when no tasks', () => {
      const stats = taskService.getStats();
      expect(stats).toEqual({ todo: 0, in_progress: 0, done: 0, overdue: 0 });
    });

    test('counts tasks by status', () => {
      taskService.create({ title: 'T1', status: 'todo' });
      taskService.create({ title: 'T2', status: 'todo' });
      taskService.create({ title: 'T3', status: 'in_progress' });
      taskService.create({ title: 'T4', status: 'done' });
      const stats = taskService.getStats();
      expect(stats.todo).toBe(2);
      expect(stats.in_progress).toBe(1);
      expect(stats.done).toBe(1);
    });

    test('counts overdue tasks (past dueDate, not done)', () => {
      const past = new Date(Date.now() - 86400000).toISOString();
      const future = new Date(Date.now() + 86400000).toISOString();
      taskService.create({ title: 'Overdue', status: 'todo', dueDate: past });
      taskService.create({ title: 'Future', status: 'todo', dueDate: future });
      taskService.create({ title: 'Done overdue', status: 'done', dueDate: past });
      const stats = taskService.getStats();
      expect(stats.overdue).toBe(1);
    });
  });

  // ─── update ────────────────────────────────────────────────
  describe('update', () => {
    test('updates task fields', () => {
      const task = taskService.create({ title: 'Original' });
      const updated = taskService.update(task.id, { title: 'Updated', priority: 'high' });
      expect(updated.title).toBe('Updated');
      expect(updated.priority).toBe('high');
    });

    test('returns null for non-existent task', () => {
      expect(taskService.update('non-existent', { title: 'Nope' })).toBeNull();
    });

    test('does not allow overwriting id (bug: spread allows it)', () => {
      const task = taskService.create({ title: 'Original' });
      const originalId = task.id;
      const updated = taskService.update(task.id, { id: 'hacked-id' });
      expect(updated.id).toBe(originalId);
    });
  });

  // ─── remove ────────────────────────────────────────────────
  describe('remove', () => {
    test('removes a task and returns true', () => {
      const task = taskService.create({ title: 'Delete me' });
      expect(taskService.remove(task.id)).toBe(true);
      expect(taskService.findById(task.id)).toBeUndefined();
    });

    test('returns false for non-existent task', () => {
      expect(taskService.remove('non-existent')).toBe(false);
    });
  });

  // ─── completeTask ─────────────────────────────────────────
  describe('completeTask', () => {
    test('marks task as done and sets completedAt', () => {
      const task = taskService.create({ title: 'Complete me' });
      const completed = taskService.completeTask(task.id);
      expect(completed.status).toBe('done');
      expect(completed.completedAt).toBeDefined();
    });

    test('returns null for non-existent task', () => {
      expect(taskService.completeTask('non-existent')).toBeNull();
    });

    test('does NOT reset priority (bug: resets to medium)', () => {
      const task = taskService.create({ title: 'High priority', priority: 'high' });
      const completed = taskService.completeTask(task.id);
      expect(completed.priority).toBe('high');
    });
  });
});
