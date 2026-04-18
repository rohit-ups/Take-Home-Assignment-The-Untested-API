const taskService = require('../src/services/taskService');

describe('taskService', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('create', () => {
    test('creates a task with defaults', () => {
      const task = taskService.create({
        title: 'Write tests',
      });

      expect(task).toEqual(
        expect.objectContaining({
          title: 'Write tests',
          description: '',
          status: 'todo',
          priority: 'medium',
          dueDate: null,
          completedAt: null,
          assignee: null,
        })
      );
      expect(task.id).toEqual(expect.any(String));
      expect(task.createdAt).toEqual(expect.any(String));
    });
  });

  describe('getByStatus', () => {
    test('returns only exact status matches', () => {
      const todoTask = taskService.create({ title: 'Todo item', status: 'todo' });
      const inProgressTask = taskService.create({ title: 'In progress item', status: 'in_progress' });

      const results = taskService.getByStatus('progress');

      expect(results).toEqual([]);
      expect(results).not.toContain(inProgressTask);
      expect(results).not.toContain(todoTask);
    });
  });

  describe('getPaginated', () => {
    test('returns the first page when page is 1', () => {
      const first = taskService.create({ title: 'First task' });
      const second = taskService.create({ title: 'Second task' });
      taskService.create({ title: 'Third task' });

      const results = taskService.getPaginated(1, 2);

      expect(results).toHaveLength(2);
      expect(results.map((task) => task.id)).toEqual([first.id, second.id]);
    });

    test('returns an empty array when the requested page is beyond the data set', () => {
      taskService.create({ title: 'Only task' });

      const results = taskService.getPaginated(3, 10);

      expect(results).toEqual([]);
    });
  });

  describe('getStats', () => {
    test('counts tasks by status and overdue tasks', () => {
      const overdueDate = new Date(Date.now() - 60_000).toISOString();
      const futureDate = new Date(Date.now() + 60_000).toISOString();

      taskService.create({ title: 'Todo overdue', status: 'todo', dueDate: overdueDate });
      taskService.create({ title: 'In progress', status: 'in_progress', dueDate: futureDate });
      taskService.create({ title: 'Done overdue but finished', status: 'done', dueDate: overdueDate });

      expect(taskService.getStats()).toEqual({
        todo: 1,
        in_progress: 1,
        done: 1,
        overdue: 1,
      });
    });
  });

  describe('update', () => {
    test('updates an existing task', () => {
      const task = taskService.create({ title: 'Original title', priority: 'low' });

      const updated = taskService.update(task.id, {
        title: 'Updated title',
        priority: 'high',
      });

      expect(updated).toEqual(
        expect.objectContaining({
          id: task.id,
          title: 'Updated title',
          priority: 'high',
        })
      );
    });

    test('returns null when the task does not exist', () => {
      expect(taskService.update('missing-id', { title: 'Nope' })).toBeNull();
    });
  });

  describe('remove', () => {
    test('removes an existing task', () => {
      const task = taskService.create({ title: 'Delete me' });

      const removed = taskService.remove(task.id);

      expect(removed).toBe(true);
      expect(taskService.findById(task.id)).toBeUndefined();
    });

    test('returns false when the task does not exist', () => {
      expect(taskService.remove('missing-id')).toBe(false);
    });
  });

  describe('completeTask', () => {
    test('marks a task as done without changing its priority', () => {
      const task = taskService.create({ title: 'Ship feature', priority: 'high' });

      const completed = taskService.completeTask(task.id);

      expect(completed).toEqual(
        expect.objectContaining({
          id: task.id,
          status: 'done',
          priority: 'high',
        })
      );
      expect(completed.completedAt).toEqual(expect.any(String));
    });

    test('returns null when the task does not exist', () => {
      expect(taskService.completeTask('missing-id')).toBeNull();
    });
  });

  describe('assignTask', () => {
    test('stores the trimmed assignee on the task', () => {
      const task = taskService.create({ title: 'Assign me' });

      const updated = taskService.assignTask(task.id, '  Priya  ');

      expect(updated).toEqual(
        expect.objectContaining({
          id: task.id,
          assignee: 'Priya',
        })
      );
    });

    test('returns null when the task does not exist', () => {
      expect(taskService.assignTask('missing-id', 'Priya')).toBeNull();
    });
  });
});
