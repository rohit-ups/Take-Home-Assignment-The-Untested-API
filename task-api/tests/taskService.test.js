const taskService = require('../src/services/taskService');

describe('taskService', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('create', () => {
    test('creates a task with default values', () => {
      const task = taskService.create({
        title: 'Write API tests',
      });

      expect(task).toMatchObject({
        title: 'Write API tests',
        description: '',
        status: 'todo',
        priority: 'medium',
        dueDate: null,
        completedAt: null,
      });

      expect(task.id).toBeDefined();
      expect(task.createdAt).toBeDefined();
    });

    test('creates a task with custom values', () => {
      const task = taskService.create({
        title: 'Complete assignment',
        description: 'Finish before deadline',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2026-07-26T17:30:00.000Z',
      });

      expect(task.title).toBe('Complete assignment');
      expect(task.status).toBe('in_progress');
      expect(task.priority).toBe('high');
    });
  });

  describe('getAll', () => {
    test('returns all created tasks', () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });

      const tasks = taskService.getAll();

      expect(tasks).toHaveLength(2);
    });

    test('returns an empty array when there are no tasks', () => {
      expect(taskService.getAll()).toEqual([]);
    });
  });

  describe('findById', () => {
    test('returns a task for a valid ID', () => {
      const created = taskService.create({
        title: 'Find this task',
      });

      expect(taskService.findById(created.id)).toEqual(created);
    });

    test('returns undefined for an unknown ID', () => {
      expect(taskService.findById('unknown-id')).toBeUndefined();
    });
  });

  describe('getByStatus', () => {
    test('returns tasks matching the exact status', () => {
      taskService.create({
        title: 'Todo task',
        status: 'todo',
      });

      taskService.create({
        title: 'Done task',
        status: 'done',
      });

      const tasks = taskService.getByStatus('todo');

      expect(tasks).toHaveLength(1);
      expect(tasks[0].status).toBe('todo');
    });
  });

  describe('getPaginated', () => {
    test('returns the first page correctly', () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });
      taskService.create({ title: 'Task 3' });

      const page = taskService.getPaginated(1, 2);

      expect(page).toHaveLength(2);
      expect(page[0].title).toBe('Task 1');
      expect(page[1].title).toBe('Task 2');
    });

    test('returns the second page correctly', () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });
      taskService.create({ title: 'Task 3' });

      const page = taskService.getPaginated(2, 2);

      expect(page).toHaveLength(1);
      expect(page[0].title).toBe('Task 3');
    });
  });

  describe('update', () => {
    test('updates an existing task', () => {
      const task = taskService.create({
        title: 'Old title',
      });

      const updated = taskService.update(task.id, {
        title: 'New title',
        priority: 'high',
      });

      expect(updated.title).toBe('New title');
      expect(updated.priority).toBe('high');
    });

    test('returns null for an unknown task', () => {
      const result = taskService.update('unknown-id', {
        title: 'New title',
      });

      expect(result).toBeNull();
    });
  });

  describe('remove', () => {
    test('deletes an existing task', () => {
      const task = taskService.create({
        title: 'Delete me',
      });

      expect(taskService.remove(task.id)).toBe(true);
      expect(taskService.getAll()).toHaveLength(0);
    });

    test('returns false for an unknown task', () => {
      expect(taskService.remove('unknown-id')).toBe(false);
    });
  });

  describe('completeTask', () => {
    test('marks the task as done', () => {
      const task = taskService.create({
        title: 'Finish task',
        priority: 'high',
      });

      const completed = taskService.completeTask(task.id);

      expect(completed.status).toBe('done');
      expect(completed.completedAt).toBeDefined();
    });

    test('preserves the original priority', () => {
      const task = taskService.create({
        title: 'High priority task',
        priority: 'high',
      });

      const completed = taskService.completeTask(task.id);

      expect(completed.priority).toBe('high');
    });

    test('returns null for an unknown task', () => {
      expect(taskService.completeTask('unknown-id')).toBeNull();
    });
  });

  describe('getStats', () => {
    test('returns task counts by status', () => {
      taskService.create({
        title: 'Task 1',
        status: 'todo',
      });

      taskService.create({
        title: 'Task 2',
        status: 'in_progress',
      });

      taskService.create({
        title: 'Task 3',
        status: 'done',
      });

      expect(taskService.getStats()).toMatchObject({
        todo: 1,
        in_progress: 1,
        done: 1,
      });
    });

    test('counts overdue unfinished tasks', () => {
      taskService.create({
        title: 'Overdue task',
        dueDate: '2020-01-01T00:00:00.000Z',
      });

      expect(taskService.getStats().overdue).toBe(1);
    });
  });

  describe('assignTask', () => {
    test('assigns a task to a user', () => {
      const task = taskService.create({
        title: 'Task to assign',
      });

      const assigned = taskService.assignTask(task.id, 'John Doe');

      expect(assigned.assignee).toBe('John Doe');
    });

    test('reassigns a task to a different user', () => {
      const task = taskService.create({
        title: 'Task to reassign',
      });

      taskService.assignTask(task.id, 'John Doe');
      const reassigned = taskService.assignTask(task.id, 'Jane Doe');

      expect(reassigned.assignee).toBe('Jane Doe');
    });

    test('returns null for an unknown task', () => {
      expect(taskService.assignTask('unknown-id', 'John Doe')).toBeNull();
    });
  });
});