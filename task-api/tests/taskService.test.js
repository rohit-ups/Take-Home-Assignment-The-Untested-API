const taskService = require('../src/services/taskService');

describe('taskService', () => {
  beforeEach(() => {
    taskService._reset();
  });

  // ─── create ──────────────────────────────────────────────────────

  describe('create', () => {
    it('should create a task with default values', () => {
      const task = taskService.create({ title: 'Test task' });

      expect(task).toMatchObject({
        title: 'Test task',
        description: '',
        status: 'todo',
        priority: 'medium',
        dueDate: null,
        completedAt: null,
      });
      expect(task.id).toBeDefined();
      expect(task.createdAt).toBeDefined();
    });

    it('should create a task with all fields provided', () => {
      const dueDate = '2026-12-31T00:00:00.000Z';
      const task = taskService.create({
        title: 'Full task',
        description: 'desc',
        status: 'in_progress',
        priority: 'high',
        dueDate,
      });

      expect(task).toMatchObject({
        title: 'Full task',
        description: 'desc',
        status: 'in_progress',
        priority: 'high',
        dueDate,
      });
    });

    it('should store the task so it appears in getAll', () => {
      taskService.create({ title: 'A' });
      taskService.create({ title: 'B' });

      expect(taskService.getAll()).toHaveLength(2);
    });
  });

  // ─── getAll ──────────────────────────────────────────────────────

  describe('getAll', () => {
    it('should return an empty array when no tasks exist', () => {
      expect(taskService.getAll()).toEqual([]);
    });

    it('should return a copy (mutations do not affect store)', () => {
      taskService.create({ title: 'A' });
      const list = taskService.getAll();
      list.push({ fake: true });
      expect(taskService.getAll()).toHaveLength(1);
    });
  });

  // ─── findById ────────────────────────────────────────────────────

  describe('findById', () => {
    it('should return the correct task', () => {
      const t = taskService.create({ title: 'Find me' });
      expect(taskService.findById(t.id)).toEqual(t);
    });

    it('should return undefined for non-existent id', () => {
      expect(taskService.findById('nope')).toBeUndefined();
    });
  });

  // ─── getByStatus ─────────────────────────────────────────────────
  // BUG: uses .includes() instead of strict equality – "do" matches "done" and "todo"

  describe('getByStatus', () => {
    it('should return tasks matching the exact status', () => {
      taskService.create({ title: 'A', status: 'todo' });
      taskService.create({ title: 'B', status: 'done' });
      taskService.create({ title: 'C', status: 'in_progress' });

      const todos = taskService.getByStatus('todo');
      expect(todos).toHaveLength(1);
      expect(todos[0].title).toBe('A');
    });

    it('should return empty array when no tasks match', () => {
      taskService.create({ title: 'A', status: 'todo' });
      expect(taskService.getByStatus('done')).toEqual([]);
    });

    it('should not partially match status strings (BUG test)', () => {
      taskService.create({ title: 'A', status: 'todo' });
      taskService.create({ title: 'B', status: 'done' });

      // "do" should NOT match anything – but the current bug causes partial matches
      const results = taskService.getByStatus('do');
      expect(results).toHaveLength(0);
    });
  });

  // ─── getPaginated ────────────────────────────────────────────────
  // BUG: offset should be (page - 1) * limit, not page * limit

  describe('getPaginated', () => {
    beforeEach(() => {
      for (let i = 1; i <= 5; i++) {
        taskService.create({ title: `Task ${i}` });
      }
    });

    it('should return the first page correctly', () => {
      const result = taskService.getPaginated(1, 2);
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Task 1');
      expect(result[1].title).toBe('Task 2');
    });

    it('should return the second page correctly', () => {
      const result = taskService.getPaginated(2, 2);
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Task 3');
      expect(result[1].title).toBe('Task 4');
    });

    it('should return remaining items on the last page', () => {
      const result = taskService.getPaginated(3, 2);
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Task 5');
    });

    it('should return empty array when page is past the end', () => {
      const result = taskService.getPaginated(10, 2);
      expect(result).toHaveLength(0);
    });
  });

  // ─── getStats ────────────────────────────────────────────────────

  describe('getStats', () => {
    it('should return all zeroes when there are no tasks', () => {
      expect(taskService.getStats()).toEqual({
        todo: 0,
        in_progress: 0,
        done: 0,
        overdue: 0,
      });
    });

    it('should count tasks by status', () => {
      taskService.create({ title: 'A', status: 'todo' });
      taskService.create({ title: 'B', status: 'todo' });
      taskService.create({ title: 'C', status: 'in_progress' });
      taskService.create({ title: 'D', status: 'done' });

      const stats = taskService.getStats();
      expect(stats.todo).toBe(2);
      expect(stats.in_progress).toBe(1);
      expect(stats.done).toBe(1);
    });

    it('should count overdue tasks (past dueDate, not done)', () => {
      taskService.create({
        title: 'Overdue',
        status: 'todo',
        dueDate: '2020-01-01T00:00:00.000Z',
      });
      taskService.create({
        title: 'Overdue but done',
        status: 'done',
        dueDate: '2020-01-01T00:00:00.000Z',
      });
      taskService.create({
        title: 'Not yet due',
        status: 'todo',
        dueDate: '2099-12-31T00:00:00.000Z',
      });

      const stats = taskService.getStats();
      expect(stats.overdue).toBe(1);
    });
  });

  // ─── update ──────────────────────────────────────────────────────

  describe('update', () => {
    it('should update specified fields', () => {
      const t = taskService.create({ title: 'Old' });
      const updated = taskService.update(t.id, { title: 'New', priority: 'high' });

      expect(updated.title).toBe('New');
      expect(updated.priority).toBe('high');
      expect(updated.id).toBe(t.id);
    });

    it('should return null for non-existent id', () => {
      expect(taskService.update('fake', { title: 'X' })).toBeNull();
    });

    it('should persist updates in the store', () => {
      const t = taskService.create({ title: 'Before' });
      taskService.update(t.id, { title: 'After' });
      expect(taskService.findById(t.id).title).toBe('After');
    });

    it('should allow overwriting id and createdAt via spread (potential bug)', () => {
      const t = taskService.create({ title: 'A' });
      const updated = taskService.update(t.id, { id: 'hacked', createdAt: 'tampered' });
      // Documenting this behavior — the spread allows internal field overwrites
      expect(updated.id).toBe('hacked');
    });
  });

  // ─── remove ──────────────────────────────────────────────────────

  describe('remove', () => {
    it('should remove an existing task and return true', () => {
      const t = taskService.create({ title: 'Bye' });
      expect(taskService.remove(t.id)).toBe(true);
      expect(taskService.getAll()).toHaveLength(0);
    });

    it('should return false for non-existent id', () => {
      expect(taskService.remove('nope')).toBe(false);
    });
  });

  // ─── completeTask ────────────────────────────────────────────────
  // BUG: resets priority to 'medium'

  describe('completeTask', () => {
    it('should mark a task as done with a completedAt timestamp', () => {
      const t = taskService.create({ title: 'Finish me' });
      const completed = taskService.completeTask(t.id);

      expect(completed.status).toBe('done');
      expect(completed.completedAt).toBeDefined();
      expect(new Date(completed.completedAt).getTime()).not.toBeNaN();
    });

    it('should return null for non-existent id', () => {
      expect(taskService.completeTask('nope')).toBeNull();
    });

    it('should preserve the original priority (BUG test)', () => {
      const t = taskService.create({ title: 'High priority', priority: 'high' });
      const completed = taskService.completeTask(t.id);

      expect(completed.priority).toBe('high');
    });

    it('should update the task in the store', () => {
      const t = taskService.create({ title: 'Store check' });
      taskService.completeTask(t.id);

      const stored = taskService.findById(t.id);
      expect(stored.status).toBe('done');
    });
  });

  // ─── assignTask ──────────────────────────────────────────────────

  describe('assignTask', () => {
    it('should assign a person to a task', () => {
      const t = taskService.create({ title: 'Assign me' });
      const result = taskService.assignTask(t.id, 'Alice');

      expect(result.assignee).toBe('Alice');
      expect(result.id).toBe(t.id);
    });

    it('should return null for non-existent id', () => {
      expect(taskService.assignTask('nope', 'Bob')).toBeNull();
    });

    it('should overwrite a previous assignee', () => {
      const t = taskService.create({ title: 'Reassign me' });
      taskService.assignTask(t.id, 'Alice');
      const result = taskService.assignTask(t.id, 'Bob');

      expect(result.assignee).toBe('Bob');
    });

    it('should persist the assignee in the store', () => {
      const t = taskService.create({ title: 'Persist me' });
      taskService.assignTask(t.id, 'Charlie');

      const stored = taskService.findById(t.id);
      expect(stored.assignee).toBe('Charlie');
    });
  });

  // ─── _reset ──────────────────────────────────────────────────────

  describe('_reset', () => {
    it('should clear all tasks', () => {
      taskService.create({ title: 'X' });
      taskService._reset();
      expect(taskService.getAll()).toEqual([]);
    });
  });
});
