const taskService = require('../src/services/taskService');

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const makeTask = (overrides = {}) =>
  taskService.create({ title: 'Test Task', status: 'todo', priority: 'medium', ...overrides });

// ─────────────────────────────────────────────────────────────────────────────
// Unit Tests — taskService.js
// ─────────────────────────────────────────────────────────────────────────────

describe('taskService', () => {
  beforeEach(() => {
    taskService._reset();
  });

  // ── getAll ──────────────────────────────────────────────────────────────────
  describe('getAll', () => {
    it('returns an empty array when no tasks exist', () => {
      expect(taskService.getAll()).toEqual([]);
    });

    it('returns all created tasks', () => {
      makeTask({ title: 'Task 1' });
      makeTask({ title: 'Task 2' });
      expect(taskService.getAll()).toHaveLength(2);
    });

    it('returns a copy — mutations do not affect the internal store', () => {
      const result = taskService.getAll();
      result.push({ fake: true });
      expect(taskService.getAll()).toHaveLength(0);
    });
  });

  // ── findById ────────────────────────────────────────────────────────────────
  describe('findById', () => {
    it('returns the correct task when found', () => {
      const task = makeTask({ title: 'Find me' });
      expect(taskService.findById(task.id)).toMatchObject({ title: 'Find me' });
    });

    it('returns undefined for a non-existent id', () => {
      expect(taskService.findById('does-not-exist')).toBeUndefined();
    });

    it('does not return a task when id is empty string', () => {
      makeTask();
      expect(taskService.findById('')).toBeUndefined();
    });
  });

  // ── getByStatus ─────────────────────────────────────────────────────────────
  describe('getByStatus', () => {
    it('returns only tasks matching the exact status', () => {
      makeTask({ title: 'Todo', status: 'todo' });
      makeTask({ title: 'Done', status: 'done' });

      const result = taskService.getByStatus('todo');
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Todo');
    });

    it('does not match tasks via substring (e.g. "do" should not match "done")', () => {
      makeTask({ title: 'Done task', status: 'done' });
      expect(taskService.getByStatus('do')).toHaveLength(0);
    });

    it('returns an empty array when no tasks match the status', () => {
      makeTask({ status: 'todo' });
      expect(taskService.getByStatus('done')).toEqual([]);
    });

    it('returns multiple tasks when all share the same status', () => {
      makeTask({ status: 'in_progress' });
      makeTask({ status: 'in_progress' });
      expect(taskService.getByStatus('in_progress')).toHaveLength(2);
    });
  });

  // ── getPaginated ────────────────────────────────────────────────────────────
  describe('getPaginated', () => {
    beforeEach(() => {
      for (let i = 1; i <= 15; i++) {
        taskService.create({ title: `Task ${i}`, status: 'todo' });
      }
    });

    it('returns the correct items for page 1', () => {
      const result = taskService.getPaginated(1, 10);
      expect(result).toHaveLength(10);
      expect(result[0].title).toBe('Task 1');
      expect(result[9].title).toBe('Task 10');
    });

    it('returns the correct items for page 2', () => {
      const result = taskService.getPaginated(2, 10);
      expect(result).toHaveLength(5);
      expect(result[0].title).toBe('Task 11');
    });

    it('respects a custom limit', () => {
      const result = taskService.getPaginated(1, 5);
      expect(result).toHaveLength(5);
      expect(result[0].title).toBe('Task 1');
      expect(result[4].title).toBe('Task 5');
    });

    it('returns an empty array for an out-of-range page', () => {
      expect(taskService.getPaginated(99, 10)).toEqual([]);
    });

    it('page 2 does not overlap with page 1', () => {
      const page1 = taskService.getPaginated(1, 5).map((t) => t.title);
      const page2 = taskService.getPaginated(2, 5).map((t) => t.title);
      const overlap = page1.filter((t) => page2.includes(t));
      expect(overlap).toHaveLength(0);
    });
  });

  // ── getStats ────────────────────────────────────────────────────────────────
  describe('getStats', () => {
    it('returns all zeros when no tasks exist', () => {
      expect(taskService.getStats()).toEqual({ todo: 0, in_progress: 0, done: 0, overdue: 0 });
    });

    it('counts tasks by each status correctly', () => {
      makeTask({ status: 'todo' });
      makeTask({ status: 'todo' });
      makeTask({ status: 'in_progress' });
      makeTask({ status: 'done' });

      expect(taskService.getStats()).toEqual({ todo: 2, in_progress: 1, done: 1, overdue: 0 });
    });

    it('counts a non-done task with a past dueDate as overdue', () => {
      makeTask({ status: 'todo', dueDate: '2000-01-01T00:00:00.000Z' });
      expect(taskService.getStats().overdue).toBe(1);
    });

    it('does not count a done task as overdue even with a past dueDate', () => {
      makeTask({ status: 'done', dueDate: '2000-01-01T00:00:00.000Z' });
      expect(taskService.getStats().overdue).toBe(0);
    });

    it('does not count a task with a future dueDate as overdue', () => {
      const futureDate = new Date(Date.now() + 86_400_000).toISOString();
      makeTask({ status: 'todo', dueDate: futureDate });
      expect(taskService.getStats().overdue).toBe(0);
    });

    it('does not count tasks with no dueDate as overdue', () => {
      makeTask({ status: 'todo', dueDate: null });
      expect(taskService.getStats().overdue).toBe(0);
    });
  });

  // ── create ──────────────────────────────────────────────────────────────────
  describe('create', () => {
    it('returns a task with the provided title', () => {
      const task = taskService.create({ title: 'My Task' });
      expect(task.title).toBe('My Task');
    });

    it('assigns a unique uuid id', () => {
      const t1 = taskService.create({ title: 'T1' });
      const t2 = taskService.create({ title: 'T2' });
      expect(t1.id).toBeDefined();
      expect(t2.id).toBeDefined();
      expect(t1.id).not.toBe(t2.id);
    });

    it('applies correct defaults when optional fields are omitted', () => {
      const task = taskService.create({ title: 'Defaults' });
      expect(task.description).toBe('');
      expect(task.status).toBe('todo');
      expect(task.priority).toBe('medium');
      expect(task.dueDate).toBeNull();
      expect(task.completedAt).toBeNull();
    });

    it('stores all provided optional fields', () => {
      const task = taskService.create({
        title: 'Full',
        description: 'A description',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2030-12-31T00:00:00.000Z',
      });

      expect(task).toMatchObject({
        description: 'A description',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2030-12-31T00:00:00.000Z',
      });
    });

    it('sets createdAt to a valid ISO string', () => {
      const task = taskService.create({ title: 'Timestamped' });
      expect(new Date(task.createdAt).toISOString()).toBe(task.createdAt);
    });

    it('adds the created task to the store', () => {
      const task = taskService.create({ title: 'Stored' });
      expect(taskService.findById(task.id)).toBeDefined();
      expect(taskService.getAll()).toHaveLength(1);
    });
  });

  // ── update ──────────────────────────────────────────────────────────────────
  describe('update', () => {
    it('returns the updated task with new field values', () => {
      const task = makeTask({ title: 'Original', status: 'todo' });
      const updated = taskService.update(task.id, { title: 'Updated', status: 'in_progress' });
      expect(updated).toMatchObject({ title: 'Updated', status: 'in_progress' });
    });

    it('preserves fields not included in the update', () => {
      const task = makeTask({ title: 'Keep priority', priority: 'high' });
      const updated = taskService.update(task.id, { title: 'New title' });
      expect(updated.priority).toBe('high');
    });

    it('returns null for a non-existent task id', () => {
      expect(taskService.update('no-such-id', { title: 'Nope' })).toBeNull();
    });

    it('does not allow overwriting the task id via fields', () => {
      const task = makeTask();
      const originalId = task.id;
      taskService.update(task.id, { id: 'hacked-id', title: 'Changed' });
      expect(taskService.findById(originalId)).toBeDefined();
      expect(taskService.findById('hacked-id')).toBeUndefined();
    });

    it('does not allow overwriting createdAt via fields', () => {
      const task = makeTask();
      const originalCreatedAt = task.createdAt;
      taskService.update(task.id, { createdAt: '2000-01-01T00:00:00.000Z', title: 'Changed' });
      expect(taskService.findById(task.id).createdAt).toBe(originalCreatedAt);
    });

    it('does not allow overwriting completedAt via fields', () => {
      const task = makeTask();
      taskService.update(task.id, { completedAt: '2000-01-01T00:00:00.000Z', title: 'Changed' });
      expect(taskService.findById(task.id).completedAt).toBeNull();
    });

    it('persists the update in the store', () => {
      const task = makeTask({ title: 'Before' });
      taskService.update(task.id, { title: 'After' });
      expect(taskService.findById(task.id).title).toBe('After');
    });
  });

  // ── remove ──────────────────────────────────────────────────────────────────
  describe('remove', () => {
    it('removes the task from the store and returns true', () => {
      const task = makeTask();
      const result = taskService.remove(task.id);
      expect(result).toBe(true);
      expect(taskService.findById(task.id)).toBeUndefined();
      expect(taskService.getAll()).toHaveLength(0);
    });

    it('returns false for a non-existent id', () => {
      expect(taskService.remove('does-not-exist')).toBe(false);
    });

    it('only removes the targeted task and leaves others intact', () => {
      const t1 = makeTask({ title: 'Keep' });
      const t2 = makeTask({ title: 'Remove' });
      taskService.remove(t2.id);
      expect(taskService.findById(t1.id)).toBeDefined();
      expect(taskService.getAll()).toHaveLength(1);
    });
  });

  // ── completeTask ────────────────────────────────────────────────────────────
  describe('completeTask', () => {
    it('sets status to "done"', () => {
      const task = makeTask({ status: 'todo' });
      const result = taskService.completeTask(task.id);
      expect(result.status).toBe('done');
    });

    it('sets completedAt to a valid ISO date string', () => {
      const task = makeTask();
      const result = taskService.completeTask(task.id);
      expect(result.completedAt).not.toBeNull();
      expect(new Date(result.completedAt).toISOString()).toBe(result.completedAt);
    });

    it('preserves the original priority (does not reset to medium)', () => {
      const task = makeTask({ priority: 'high' });
      const result = taskService.completeTask(task.id);
      expect(result.priority).toBe('high');
    });

    it('preserves the original low priority', () => {
      const task = makeTask({ priority: 'low' });
      const result = taskService.completeTask(task.id);
      expect(result.priority).toBe('low');
    });

    it('returns null for a non-existent task id', () => {
      expect(taskService.completeTask('no-such-id')).toBeNull();
    });

    it('persists the completed state in the store', () => {
      const task = makeTask();
      taskService.completeTask(task.id);
      const stored = taskService.findById(task.id);
      expect(stored.status).toBe('done');
      expect(stored.completedAt).not.toBeNull();
    });
  });

  // ── changeAssignee ──────────────────────────────────────────────────────────
  describe('changeAssignee', () => {
    it('sets the assignee on the task and returns the updated task', () => {
      const task = makeTask();
      const result = taskService.changeAssignee(task.id, 'Alice');
      expect(result.assignee).toBe('Alice');
    });

    it('returns the updated task object (not a stale snapshot)', () => {
      const task = makeTask();
      const result = taskService.changeAssignee(task.id, 'Bob');
      // The returned object must already contain the new assignee
      expect(result.assignee).toBe('Bob');
    });

    it('persists the assignee in the store', () => {
      const task = makeTask();
      taskService.changeAssignee(task.id, 'Carol');
      expect(taskService.findById(task.id).assignee).toBe('Carol');
    });

    it('overwrites a previously set assignee', () => {
      const task = makeTask();
      taskService.changeAssignee(task.id, 'Alice');
      taskService.changeAssignee(task.id, 'Bob');
      expect(taskService.findById(task.id).assignee).toBe('Bob');
    });

    it('returns null for a non-existent task id', () => {
      expect(taskService.changeAssignee('no-such-id', 'Alice')).toBeNull();
    });

    it('does not modify any other task in the store', () => {
      const t1 = makeTask({ title: 'Task 1' });
      const t2 = makeTask({ title: 'Task 2' });
      taskService.changeAssignee(t1.id, 'Alice');
      expect(taskService.findById(t2.id).assignee).toBeNull();
    });

    it('new tasks start with assignee set to null', () => {
      const task = makeTask();
      expect(task.assignee).toBeNull();
    });
  });
});
