const taskService = require('../src/services/taskService');

const createTask = (overrides = {}) => taskService.create({ title: 'Write tests', ...overrides });

describe('taskService', () => {
  beforeEach(() => taskService._reset());

  describe('getAll', () => {
    it('returns an empty array when no tasks exist', () => {
      expect(taskService.getAll()).toEqual([]);
    });

    it('returns all created tasks without exposing the store array', () => {
      const task = createTask();
      const result = taskService.getAll();

      expect(result).toEqual([task]);
      expect(result).not.toBe(taskService.getAll());
    });
  });

  describe('findById', () => {
    it('finds a task by its id', () => {
      const task = createTask();

      expect(taskService.findById(task.id)).toEqual(task);
    });

    it('returns undefined for an unknown id', () => {
      expect(taskService.findById('does-not-exist')).toBeUndefined();
    });
  });

  describe('getByStatus', () => {
    it('returns tasks having the requested status', () => {
      const todo = createTask({ title: 'Todo', status: 'todo' });
      createTask({ title: 'Done', status: 'done' });

      expect(taskService.getByStatus('todo')).toEqual([todo]);
    });

    it('returns an empty array when no task has the status', () => {
      createTask({ status: 'todo' });

      expect(taskService.getByStatus('in_progress')).toEqual([]);
    });
  });

  describe('getPaginated', () => {
    it('uses one-based page numbers', () => {
      const first = createTask({ title: 'First' });
      const second = createTask({ title: 'Second' });
      createTask({ title: 'Third' });

      expect(taskService.getPaginated(1, 2)).toEqual([first, second]);
    });

    it('returns an empty array beyond the last page', () => {
      createTask();

      expect(taskService.getPaginated(10, 2)).toEqual([]);
    });
  });

  describe('getStats', () => {
    it('counts each status and only unfinished past-due tasks as overdue', () => {
      createTask({ title: 'Past todo', status: 'todo', dueDate: '2000-01-01T00:00:00.000Z' });
      createTask({ title: 'Future active', status: 'in_progress', dueDate: '2999-01-01T00:00:00.000Z' });
      createTask({ title: 'Past done', status: 'done', dueDate: '2000-01-01T00:00:00.000Z' });

      expect(taskService.getStats()).toEqual({ todo: 1, in_progress: 1, done: 1, overdue: 1 });
    });

    it('returns zero counts for an empty task list', () => {
      expect(taskService.getStats()).toEqual({ todo: 0, in_progress: 0, done: 0, overdue: 0 });
    });
  });

  describe('create', () => {
    it('creates a task with supplied fields and defaults', () => {
      const task = createTask({ title: 'Plan', dueDate: '2030-01-01T00:00:00.000Z' });

      expect(task).toMatchObject({
        title: 'Plan', description: '', status: 'todo', priority: 'medium',
        dueDate: '2030-01-01T00:00:00.000Z', completedAt: null,
      });
      expect(task.id).toEqual(expect.any(String));
      expect(new Date(task.createdAt).toString()).not.toBe('Invalid Date');
      expect(taskService.getAll()).toEqual([task]);
    });

    it('preserves supplied optional fields', () => {
      const task = createTask({ description: 'Details', status: 'in_progress', priority: 'high' });

      expect(task).toMatchObject({ description: 'Details', status: 'in_progress', priority: 'high' });
    });
  });

  describe('update', () => {
    it('updates the supplied fields while retaining the rest of the task', () => {
      const task = createTask({ description: 'Old', priority: 'low' });

      const updated = taskService.update(task.id, { title: 'New', priority: 'high' });

      expect(updated).toMatchObject({ id: task.id, title: 'New', description: 'Old', priority: 'high' });
      expect(taskService.findById(task.id)).toEqual(updated);
    });

    it('returns null when updating an unknown id', () => {
      expect(taskService.update('does-not-exist', { title: 'New' })).toBeNull();
    });
  });

  describe('remove', () => {
    it('removes an existing task', () => {
      const task = createTask();

      expect(taskService.remove(task.id)).toBe(true);
      expect(taskService.getAll()).toEqual([]);
    });

    it('returns false for an unknown id', () => {
      expect(taskService.remove('does-not-exist')).toBe(false);
    });
  });

  describe('completeTask', () => {
    it('marks an existing task done and records completion time', () => {
      const task = createTask({ priority: 'medium' });

      const completed = taskService.completeTask(task.id);

      expect(completed).toMatchObject({ id: task.id, status: 'done', priority: 'medium' });
      expect(new Date(completed.completedAt).toString()).not.toBe('Invalid Date');
      expect(taskService.findById(task.id)).toEqual(completed);
    });

    it('returns null for an unknown id', () => {
      expect(taskService.completeTask('does-not-exist')).toBeNull();
    });
  });

  describe('assignTask', () => {
    it('assigns and reassigns an existing task', () => {
      const task = createTask();

      expect(taskService.assignTask(task.id, 'Asha')).toMatchObject({ id: task.id, assignee: 'Asha' });
      expect(taskService.assignTask(task.id, 'Ben')).toMatchObject({ id: task.id, assignee: 'Ben' });
    });

    it('returns null for an unknown id', () => {
      expect(taskService.assignTask('does-not-exist', 'Asha')).toBeNull();
    });
  });
});
