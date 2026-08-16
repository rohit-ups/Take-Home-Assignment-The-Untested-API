const taskService = require('../src/services/taskService');

describe('taskService', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('create', () => {
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

    test('should create a task with provided values', () => {
      const task = taskService.create({
        title: 'Complete assignment',
        description: 'Write tests',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2026-08-20T00:00:00.000Z',
      });

      expect(task.title).toBe('Complete assignment');
      expect(task.description).toBe('Write tests');
      expect(task.status).toBe('in_progress');
      expect(task.priority).toBe('high');
      expect(task.dueDate).toBe('2026-08-20T00:00:00.000Z');
    });
  });

  describe('getAll', () => {
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

  describe('findById', () => {
    test('should find a task by id', () => {
      const created = taskService.create({ title: 'Find me' });

      const task = taskService.findById(created.id);

      expect(task).toEqual(created);
    });

    test('should return undefined for a non-existent id', () => {
      expect(taskService.findById('does-not-exist')).toBeUndefined();
    });
  });

  describe('getByStatus', () => {
    test('should return tasks matching the status', () => {
      taskService.create({ title: 'Todo task', status: 'todo' });
      taskService.create({ title: 'Done task', status: 'done' });

      const tasks = taskService.getByStatus('todo');

      expect(tasks).toHaveLength(1);
      expect(tasks[0].status).toBe('todo');
    });

    test('should return empty array when no tasks match', () => {
      taskService.create({ title: 'Todo task', status: 'todo' });

      expect(taskService.getByStatus('done')).toEqual([]);
    });
  });

  describe('getPaginated', () => {
    test('should return tasks for the requested page', () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });
      taskService.create({ title: 'Task 3' });
      taskService.create({ title: 'Task 4' });

      const tasks = taskService.getPaginated(1, 2);

      expect(tasks).toHaveLength(2);
      expect(tasks[0].title).toBe('Task 1');
      expect(tasks[1].title).toBe('Task 2');
    });

    test('should return an empty array when page is beyond available tasks', () => {
      taskService.create({ title: 'Task 1' });

      expect(taskService.getPaginated(5, 2)).toEqual([]);
    });
  });

  describe('update', () => {
    test('should update an existing task', () => {
      const created = taskService.create({
        title: 'Old title',
      });

      const updated = taskService.update(created.id, {
        title: 'New title',
      });

      expect(updated.title).toBe('New title');
      expect(updated.id).toBe(created.id);
    });

    test('should return null for a non-existent task', () => {
      expect(
        taskService.update('does-not-exist', { title: 'New title' })
      ).toBeNull();
    });
  });

  describe('remove', () => {
    test('should remove an existing task', () => {
      const created = taskService.create({
        title: 'Delete me',
      });

      expect(taskService.remove(created.id)).toBe(true);
      expect(taskService.findById(created.id)).toBeUndefined();
    });

    test('should return false for a non-existent task', () => {
      expect(taskService.remove('does-not-exist')).toBe(false);
    });
  });

  describe('completeTask', () => {
    test('should mark an existing task as completed', () => {
      const created = taskService.create({
        title: 'Complete me',
        priority: 'high',
      });

      const completed = taskService.completeTask(created.id);

      expect(completed.status).toBe('done');
      expect(completed.completedAt).not.toBeNull();
    });

    test('should return null for a non-existent task', () => {
      expect(taskService.completeTask('does-not-exist')).toBeNull();
    });
  });

  describe('getStats', () => {
    test('should return counts by status', () => {
      taskService.create({ title: 'Todo 1', status: 'todo' });
      taskService.create({ title: 'Todo 2', status: 'todo' });
      taskService.create({ title: 'Progress', status: 'in_progress' });
      taskService.create({ title: 'Done', status: 'done' });

      const stats = taskService.getStats();

      expect(stats.todo).toBe(2);
      expect(stats.in_progress).toBe(1);
      expect(stats.done).toBe(1);
      expect(stats.overdue).toBe(0);
    });

    test('should count unfinished overdue tasks', () => {
      taskService.create({
        title: 'Overdue task',
        dueDate: '2020-01-01T00:00:00.000Z',
        status: 'todo',
      });

      const stats = taskService.getStats();

      expect(stats.overdue).toBe(1);
    });

    test('should not count completed overdue tasks', () => {
      taskService.create({
        title: 'Completed task',
        dueDate: '2020-01-01T00:00:00.000Z',
        status: 'done',
      });

      const stats = taskService.getStats();

      expect(stats.overdue).toBe(0);
    });
  });
});