const taskService = require('../src/services/taskService');

beforeEach(() => {
  taskService._reset();
});

describe('Task Service', () => {
  describe('create()', () => {
    test('should create a task with default values', () => {
      const task = taskService.create({
        title: 'Learn Jest',
      });

      expect(task).toEqual(
        expect.objectContaining({
          title: 'Learn Jest',
          description: '',
          status: 'todo',
          priority: 'medium',
          dueDate: null,
          completedAt: null,
        })
      );

      expect(task.id).toBeDefined();
      expect(task.createdAt).toBeDefined();
    });

    test('should create a task with supplied values', () => {
      const task = taskService.create({
        title: 'Build API',
        description: 'Task manager API',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2026-12-01T00:00:00.000Z',
      });

      expect(task.title).toBe('Build API');
      expect(task.description).toBe('Task manager API');
      expect(task.status).toBe('in_progress');
      expect(task.priority).toBe('high');
      expect(task.dueDate).toBe('2026-12-01T00:00:00.000Z');
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
  });

  describe('findById()', () => {
    test('should return a task when the id exists', () => {
      const created = taskService.create({ title: 'Find me' });

      expect(taskService.findById(created.id)).toEqual(created);
    });

    test('should return undefined when the id does not exist', () => {
      expect(taskService.findById('does-not-exist')).toBeUndefined();
    });
  });

  describe('getByStatus()', () => {
    test('should return tasks matching the status', () => {
      taskService.create({ title: 'Todo task', status: 'todo' });
      taskService.create({ title: 'Progress task', status: 'in_progress' });
      taskService.create({ title: 'Another todo', status: 'todo' });

      const tasks = taskService.getByStatus('todo');

      expect(tasks).toHaveLength(2);
      expect(tasks.every((task) => task.status === 'todo')).toBe(true);
    });

    test('should return an empty array when no task matches', () => {
      taskService.create({ title: 'Todo task', status: 'todo' });

      expect(taskService.getByStatus('done')).toEqual([]);
    });
  });

  describe('getPaginated()', () => {
    test('should return the first page of tasks', () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });
      taskService.create({ title: 'Task 3' });

      const tasks = taskService.getPaginated(1, 2);

      expect(tasks).toHaveLength(2);
      expect(tasks[0].title).toBe('Task 1');
      expect(tasks[1].title).toBe('Task 2');
    });

    test('should return the second page of tasks', () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });
      taskService.create({ title: 'Task 3' });

      const tasks = taskService.getPaginated(2, 2);

      expect(tasks).toHaveLength(1);
      expect(tasks[0].title).toBe('Task 3');
    });
  });

  describe('update()', () => {
    test('should update an existing task', () => {
      const created = taskService.create({ title: 'Old title' });

      const updated = taskService.update(created.id, {
        title: 'New title',
        priority: 'high',
      });

      expect(updated.title).toBe('New title');
      expect(updated.priority).toBe('high');
      expect(updated.id).toBe(created.id);
    });

    test('should return null when updating a nonexistent task', () => {
      expect(
        taskService.update('does-not-exist', { title: 'Test' })
      ).toBeNull();
    });
  });

  describe('remove()', () => {
    test('should remove an existing task', () => {
      const created = taskService.create({ title: 'Delete me' });

      expect(taskService.remove(created.id)).toBe(true);
      expect(taskService.findById(created.id)).toBeUndefined();
    });

    test('should return false for a nonexistent task', () => {
      expect(taskService.remove('does-not-exist')).toBe(false);
    });
  });

  describe('completeTask()', () => {
    test('should mark a task as done', () => {
      const created = taskService.create({
        title: 'Complete me',
        priority: 'high',
      });

      const completed = taskService.completeTask(created.id);

      expect(completed.status).toBe('done');
      expect(completed.priority).toBe('medium');
      expect(completed.completedAt).toBeDefined();
    });

    test('should return null for a nonexistent task', () => {
      expect(taskService.completeTask('does-not-exist')).toBeNull();
    });
  });

  describe('getStats()', () => {
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
  });
});