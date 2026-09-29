const taskService = require('../src/services/taskService');

describe('taskService', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('create()', () => {
    test('should create a task with default values', () => {
      const task = taskService.create({
        title: 'Test task',
      });

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

    test('should create a task with custom values', () => {
      const task = taskService.create({
        title: 'Important task',
        description: 'Test description',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2026-10-01T10:00:00.000Z',
      });

      expect(task.title).toBe('Important task');
      expect(task.description).toBe('Test description');
      expect(task.status).toBe('in_progress');
      expect(task.priority).toBe('high');
      expect(task.dueDate).toBe('2026-10-01T10:00:00.000Z');
    });
  });

  describe('getAll()', () => {
    test('should return all created tasks', () => {
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
    test('should return a task when the ID exists', () => {
      const created = taskService.create({ title: 'Find me' });

      const found = taskService.findById(created.id);

      expect(found).toEqual(created);
    });

    test('should return undefined when the ID does not exist', () => {
      expect(taskService.findById('non-existent-id')).toBeUndefined();
    });
  });

  describe('getByStatus()', () => {
    test('should return tasks matching the status', () => {
      taskService.create({ title: 'Todo task', status: 'todo' });
      taskService.create({ title: 'Done task', status: 'done' });

      const result = taskService.getByStatus('done');

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Done task');
    });
  });

  describe('getPaginated()', () => {
    test('should return the correct page of tasks', () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });
      taskService.create({ title: 'Task 3' });

      const result = taskService.getPaginated(1, 2);

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Task 1');
      expect(result[1].title).toBe('Task 2');
    });

    test('should return the second page correctly', () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });
      taskService.create({ title: 'Task 3' });

      const result = taskService.getPaginated(2, 2);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Task 3');
    });
  });

  describe('update()', () => {
    test('should update an existing task', () => {
      const created = taskService.create({
        title: 'Original title',
        priority: 'low',
      });

      const updated = taskService.update(created.id, {
        title: 'Updated title',
        priority: 'high',
      });

      expect(updated.title).toBe('Updated title');
      expect(updated.priority).toBe('high');
      expect(updated.id).toBe(created.id);
    });

    test('should return null when updating a non-existent task', () => {
      const result = taskService.update('non-existent-id', {
        title: 'Updated',
      });

      expect(result).toBeNull();
    });
  });

  describe('remove()', () => {
    test('should remove an existing task', () => {
      const created = taskService.create({ title: 'Delete me' });

      expect(taskService.remove(created.id)).toBe(true);
      expect(taskService.findById(created.id)).toBeUndefined();
    });

    test('should return false for a non-existent task', () => {
      expect(taskService.remove('non-existent-id')).toBe(false);
    });
  });

  describe('completeTask()', () => {
    test('should mark an existing task as done', () => {
      const created = taskService.create({
        title: 'Complete me',
        status: 'in_progress',
        priority: 'high',
      });

      const completed = taskService.completeTask(created.id);

      expect(completed.status).toBe('done');
      expect(completed.completedAt).toBeDefined();
    });

    test('should return null for a non-existent task', () => {
      expect(taskService.completeTask('non-existent-id')).toBeNull();
    });
  });

  describe('assignTask()', () => {
    test('should assign an existing task to an assignee', () => {
      const created = taskService.create({
        title: 'Assign me',
      });

      const updated = taskService.assignTask(created.id, 'Ayush');

      expect(updated).not.toBeNull();
      expect(updated.id).toBe(created.id);
      expect(updated.title).toBe('Assign me');
      expect(updated.assignee).toBe('Ayush');
    });

    test('should return null when assigning a non-existent task', () => {
      const result = taskService.assignTask(
        'non-existent-id',
        'Ayush'
      );

      expect(result).toBeNull();
    });

    test('should replace the existing assignee when reassigning a task', () => {
      const created = taskService.create({
        title: 'Reassign me',
      });

      taskService.assignTask(created.id, 'Rahul');

      const updated = taskService.assignTask(
        created.id,
        'Ayush'
      );

      expect(updated.assignee).toBe('Ayush');
    });
  });

  describe('getStats()', () => {
    test('should return task status counts', () => {
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
  });
});