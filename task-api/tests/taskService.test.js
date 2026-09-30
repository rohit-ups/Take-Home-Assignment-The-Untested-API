const taskService = require('../src/services/taskService');

describe('Task Service', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('create()', () => {
    test('should create a task with default values', () => {
      const task = taskService.create({
        title: 'Learn Jest',
      });

      expect(task).toHaveProperty('id');
      expect(task.title).toBe('Learn Jest');
      expect(task.description).toBe('');
      expect(task.status).toBe('todo');
      expect(task.priority).toBe('medium');
      expect(task.dueDate).toBeNull();
      expect(task.completedAt).toBeNull();
      expect(task).toHaveProperty('createdAt');
    });

    test('should create a task with custom values', () => {
      const task = taskService.create({
        title: 'Build API',
        description: 'Build a Task Manager API',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2026-10-10T00:00:00.000Z',
      });

      expect(task.title).toBe('Build API');
      expect(task.description).toBe('Build a Task Manager API');
      expect(task.status).toBe('in_progress');
      expect(task.priority).toBe('high');
      expect(task.dueDate).toBe('2026-10-10T00:00:00.000Z');
    });
  });

  describe('getAll()', () => {
    test('should return all tasks', () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });

      const tasks = taskService.getAll();

      expect(tasks).toHaveLength(2);
      expect(tasks[0].title).toBe('Task 1');
      expect(tasks[1].title).toBe('Task 2');
    });

    test('should return an empty array when there are no tasks', () => {
      expect(taskService.getAll()).toEqual([]);
    });
  });

  describe('findById()', () => {
    test('should find a task by id', () => {
      const task = taskService.create({ title: 'Find me' });

      const result = taskService.findById(task.id);

      expect(result).toEqual(task);
    });

    test('should return undefined for a non-existent id', () => {
      expect(taskService.findById('invalid-id')).toBeUndefined();
    });
  });

  describe('getByStatus()', () => {
    test('should return tasks matching the status', () => {
      taskService.create({ title: 'Todo task', status: 'todo' });
      taskService.create({
        title: 'Progress task',
        status: 'in_progress',
      });
      taskService.create({ title: 'Done task', status: 'done' });

      const result = taskService.getByStatus('todo');

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Todo task');
    });

    test('should return an empty array when no task matches', () => {
      taskService.create({ title: 'Todo task', status: 'todo' });

      expect(taskService.getByStatus('done')).toEqual([]);
    });
  });

  describe('getPaginated()', () => {
    beforeEach(() => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });
      taskService.create({ title: 'Task 3' });
      taskService.create({ title: 'Task 4' });
      taskService.create({ title: 'Task 5' });
    });

    test('should return the first page of tasks', () => {
      const result = taskService.getPaginated(1, 2);

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Task 1');
      expect(result[1].title).toBe('Task 2');
    });

    test('should return the second page of tasks', () => {
      const result = taskService.getPaginated(2, 2);

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Task 3');
      expect(result[1].title).toBe('Task 4');
    });
  });

  describe('update()', () => {
    test('should update an existing task', () => {
      const task = taskService.create({ title: 'Old title' });

      const updated = taskService.update(task.id, {
        title: 'New title',
        priority: 'high',
      });

      expect(updated.title).toBe('New title');
      expect(updated.priority).toBe('high');
    });

    test('should return null when task does not exist', () => {
      const result = taskService.update('invalid-id', {
        title: 'New title',
      });

      expect(result).toBeNull();
    });
  });

  describe('remove()', () => {
    test('should remove an existing task', () => {
      const task = taskService.create({ title: 'Delete me' });

      const result = taskService.remove(task.id);

      expect(result).toBe(true);
      expect(taskService.getAll()).toHaveLength(0);
    });

    test('should return false when task does not exist', () => {
      expect(taskService.remove('invalid-id')).toBe(false);
    });
  });

  describe('completeTask()', () => {
    test('should mark a task as completed', () => {
      const task = taskService.create({
        title: 'Complete me',
        priority: 'high',
      });

      const completed = taskService.completeTask(task.id);

      expect(completed.status).toBe('done');
      expect(completed.completedAt).not.toBeNull();
      expect(completed.priority).toBe('medium');
    });

    test('should return null when task does not exist', () => {
      expect(taskService.completeTask('invalid-id')).toBeNull();
    });
  });

  describe('getStats()', () => {
    test('should return correct task statistics', () => {
      taskService.create({ title: 'Todo', status: 'todo' });
      taskService.create({
        title: 'Progress',
        status: 'in_progress',
      });
      taskService.create({ title: 'Done', status: 'done' });

      const stats = taskService.getStats();

      expect(stats.todo).toBe(1);
      expect(stats.in_progress).toBe(1);
      expect(stats.done).toBe(1);
      expect(stats.overdue).toBe(0);
    });

    test('should count overdue unfinished tasks', () => {
      taskService.create({
        title: 'Overdue task',
        status: 'todo',
        dueDate: '2020-01-01T00:00:00.000Z',
      });

      const stats = taskService.getStats();

      expect(stats.overdue).toBe(1);
    });

    test('should not count completed overdue tasks as overdue', () => {
      taskService.create({
        title: 'Completed old task',
        status: 'done',
        dueDate: '2020-01-01T00:00:00.000Z',
      });

      const stats = taskService.getStats();

      expect(stats.overdue).toBe(0);
    });
  });
});