const taskService = require('../src/services/taskService');

describe('taskService', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('create', () => {
    test('creates a task with default values', () => {
      const task = taskService.create({
        title: 'Learn Jest',
      });

      expect(task.title).toBe('Learn Jest');
      expect(task.description).toBe('');
      expect(task.status).toBe('todo');
      expect(task.priority).toBe('medium');
      expect(task.dueDate).toBe(null);
      expect(task.completedAt).toBe(null);
      expect(task.id).toBeDefined();
      expect(task.createdAt).toBeDefined();
    });

    test('creates a task with provided values', () => {
      const task = taskService.create({
        title: 'Write tests',
        description: 'Test the API',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2030-01-01T00:00:00.000Z',
      });

      expect(task.title).toBe('Write tests');
      expect(task.description).toBe('Test the API');
      expect(task.status).toBe('in_progress');
      expect(task.priority).toBe('high');
      expect(task.dueDate).toBe('2030-01-01T00:00:00.000Z');
    });
  });

  describe('getAll', () => {
    test('returns all tasks', () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });

      const tasks = taskService.getAll();

      expect(tasks).toHaveLength(2);
    });

    test('returns empty array when there are no tasks', () => {
      expect(taskService.getAll()).toEqual([]);
    });
  });

  describe('findById', () => {
    test('finds an existing task', () => {
      const created = taskService.create({
        title: 'Find me',
      });

      const task = taskService.findById(created.id);

      expect(task).toEqual(created);
    });

    test('returns undefined when task does not exist', () => {
      const task = taskService.findById('invalid-id');

      expect(task).toBeUndefined();
    });
  });

  describe('getByStatus', () => {
    test('returns tasks with the requested status', () => {
      taskService.create({
        title: 'Todo',
        status: 'todo',
      });

      taskService.create({
        title: 'Progress',
        status: 'in_progress',
      });

      const tasks = taskService.getByStatus('todo');

      expect(tasks).toHaveLength(1);
      expect(tasks[0].status).toBe('todo');
    });

    test('does not return tasks with a different status', () => {
      taskService.create({
        title: 'Progress',
        status: 'in_progress',
      });

      const tasks = taskService.getByStatus('todo');

      expect(tasks).toHaveLength(0);
    });
  });

  describe('getPaginated', () => {
    test('returns the first page correctly', () => {
      for (let i = 1; i <= 15; i++) {
        taskService.create({
          title: `Task ${i}`,
        });
      }

      const tasks = taskService.getPaginated(1, 10);

      expect(tasks).toHaveLength(10);
      expect(tasks[0].title).toBe('Task 1');
      expect(tasks[9].title).toBe('Task 10');
    });

    test('returns the second page correctly', () => {
      for (let i = 1; i <= 15; i++) {
        taskService.create({
          title: `Task ${i}`,
        });
      }

      const tasks = taskService.getPaginated(2, 10);

      expect(tasks).toHaveLength(5);
      expect(tasks[0].title).toBe('Task 11');
    });
  });

  describe('update', () => {
    test('updates an existing task', () => {
      const created = taskService.create({
        title: 'Old title',
      });

      const updated = taskService.update(created.id, {
        title: 'New title',
      });

      expect(updated.title).toBe('New title');
      expect(updated.id).toBe(created.id);
    });

    test('returns null when task does not exist', () => {
      const result = taskService.update('invalid-id', {
        title: 'New title',
      });

      expect(result).toBeNull();
    });
  });

  describe('remove', () => {
    test('removes an existing task', () => {
      const created = taskService.create({
        title: 'Delete me',
      });

      const result = taskService.remove(created.id);

      expect(result).toBe(true);
      expect(taskService.findById(created.id)).toBeUndefined();
    });

    test('returns false when task does not exist', () => {
      const result = taskService.remove('invalid-id');

      expect(result).toBe(false);
    });
  });

  describe('completeTask', () => {
    test('marks a task as completed', () => {
      const created = taskService.create({
        title: 'Complete me',
        priority: 'high',
      });

      const completed = taskService.completeTask(created.id);

      expect(completed.status).toBe('done');
      expect(completed.completedAt).toBeDefined();

      // Priority should not change when completing a task.
      expect(completed.priority).toBe('high');
    });

    test('returns null when task does not exist', () => {
      const result = taskService.completeTask('invalid-id');

      expect(result).toBeNull();
    });
  });

  describe('getStats', () => {
    test('returns counts by status', () => {
      taskService.create({
        title: 'Todo',
        status: 'todo',
      });

      taskService.create({
        title: 'Progress',
        status: 'in_progress',
      });

      taskService.create({
        title: 'Done',
        status: 'done',
      });

      const stats = taskService.getStats();

      expect(stats.todo).toBe(1);
      expect(stats.in_progress).toBe(1);
      expect(stats.done).toBe(1);
      expect(stats.overdue).toBe(0);
    });

    test('counts overdue unfinished tasks', () => {
      taskService.create({
        title: 'Overdue',
        dueDate: '2020-01-01T00:00:00.000Z',
      });

      const stats = taskService.getStats();

      expect(stats.overdue).toBe(1);
    });

    test('does not count completed overdue tasks', () => {
      taskService.create({
        title: 'Completed overdue',
        status: 'done',
        dueDate: '2020-01-01T00:00:00.000Z',
      });

      const stats = taskService.getStats();

      expect(stats.overdue).toBe(0);
    });
  });

  describe('assignTask', () => {
    test('assigns a task to a user', () => {
      const created = taskService.create({
        title: 'Assign me',
      });

      const updated = taskService.assignTask(
        created.id,
        'Alice'
      );

      expect(updated.assignee).toBe('Alice');
    });

    test('returns null when task does not exist', () => {
      const result = taskService.assignTask(
        'invalid-id',
        'Alice'
      );

      expect(result).toBeNull();
    });
  });
});