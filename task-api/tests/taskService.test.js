const taskService = require('../src/services/taskService');

describe('taskService', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('create', () => {
    it('creates a task with defaults', () => {
      const task = taskService.create({ title: 'Write tests' });

      expect(task).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          title: 'Write tests',
          description: '',
          status: 'todo',
          priority: 'medium',
          dueDate: null,
          completedAt: null,
          createdAt: expect.any(String),
        })
      );
    });

    it('creates a task with provided fields', () => {
      const dueDate = '2030-01-01T00:00:00.000Z';
      const task = taskService.create({
        title: 'Ship feature',
        description: 'Implement endpoint',
        status: 'in_progress',
        priority: 'high',
        dueDate,
      });

      expect(task).toEqual(
        expect.objectContaining({
          title: 'Ship feature',
          description: 'Implement endpoint',
          status: 'in_progress',
          priority: 'high',
          dueDate,
        })
      );
    });
  });

  describe('getAll', () => {
    it('returns all tasks in insertion order', () => {
      const first = taskService.create({ title: 'First' });
      const second = taskService.create({ title: 'Second' });

      expect(taskService.getAll()).toEqual([first, second]);
    });
  });

  describe('findById', () => {
    it('returns the matching task', () => {
      const task = taskService.create({ title: 'Find me' });

      expect(taskService.findById(task.id)).toEqual(task);
    });

    it('returns undefined when the task does not exist', () => {
      expect(taskService.findById('missing-id')).toBeUndefined();
    });
  });

  describe('getByStatus', () => {
    it('returns only tasks whose status exactly matches the requested status', () => {
      const todoTask = taskService.create({ title: 'Todo task', status: 'todo' });
      taskService.create({ title: 'In progress task', status: 'in_progress' });
      taskService.create({ title: 'Done task', status: 'done' });

      expect(taskService.getByStatus('todo')).toEqual([todoTask]);
    });

    it('does not treat partial strings as valid status matches', () => {
      taskService.create({ title: 'In progress task', status: 'in_progress' });

      expect(taskService.getByStatus('progress')).toEqual([]);
    });
  });

  describe('getPaginated', () => {
    it('returns the first page when page is 1', () => {
      const first = taskService.create({ title: 'First' });
      const second = taskService.create({ title: 'Second' });
      taskService.create({ title: 'Third' });

      expect(taskService.getPaginated(1, 2)).toEqual([first, second]);
    });

    it('returns an empty array when the page is beyond the end of the list', () => {
      taskService.create({ title: 'Only task' });

      expect(taskService.getPaginated(5, 10)).toEqual([]);
    });
  });

  describe('getStats', () => {
    it('returns status counts and overdue count', () => {
      taskService.create({
        title: 'Overdue task',
        status: 'todo',
        dueDate: '2000-01-01T00:00:00.000Z',
      });
      taskService.create({
        title: 'In progress task',
        status: 'in_progress',
        dueDate: '2100-01-01T00:00:00.000Z',
      });
      taskService.create({
        title: 'Done task',
        status: 'done',
        dueDate: '2000-01-01T00:00:00.000Z',
      });

      expect(taskService.getStats()).toEqual({
        todo: 1,
        in_progress: 1,
        done: 1,
        overdue: 1,
      });
    });
  });

  describe('update', () => {
    it('updates an existing task', () => {
      const task = taskService.create({ title: 'Before', priority: 'low' });

      const updated = taskService.update(task.id, {
        title: 'After',
        priority: 'high',
      });

      expect(updated).toEqual(
        expect.objectContaining({
          id: task.id,
          title: 'After',
          priority: 'high',
        })
      );
      expect(taskService.findById(task.id)).toEqual(updated);
    });

    it('returns null when updating a missing task', () => {
      expect(taskService.update('missing-id', { title: 'Nope' })).toBeNull();
    });
  });

  describe('remove', () => {
    it('removes an existing task', () => {
      const task = taskService.create({ title: 'Delete me' });

      expect(taskService.remove(task.id)).toBe(true);
      expect(taskService.findById(task.id)).toBeUndefined();
    });

    it('returns false when removing a missing task', () => {
      expect(taskService.remove('missing-id')).toBe(false);
    });
  });

  describe('completeTask', () => {
    it('marks a task as done and records completion time', () => {
      const task = taskService.create({ title: 'Finish me', priority: 'high' });

      const completed = taskService.completeTask(task.id);

      expect(completed).toEqual(
        expect.objectContaining({
          id: task.id,
          title: 'Finish me',
          status: 'done',
          completedAt: expect.any(String),
        })
      );
    });

    it('preserves the existing priority when a task is completed', () => {
      const task = taskService.create({ title: 'Keep priority', priority: 'high' });

      const completed = taskService.completeTask(task.id);

      expect(completed.priority).toBe('high');
    });

    it('returns null when completing a missing task', () => {
      expect(taskService.completeTask('missing-id')).toBeNull();
    });
  });

  describe('_reset', () => {
    it('clears all tasks', () => {
      taskService.create({ title: 'Task one' });
      taskService.create({ title: 'Task two' });

      taskService._reset();

      expect(taskService.getAll()).toEqual([]);
    });
  });
});
