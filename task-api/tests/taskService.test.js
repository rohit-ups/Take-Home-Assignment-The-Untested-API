const taskService = require('../src/services/taskService');

describe('taskService', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('create and read operations', () => {
    test('create should apply defaults and return new task', () => {
      const task = taskService.create({ title: 'Write tests' });

      expect(task.id).toBeDefined();
      expect(task.title).toBe('Write tests');
      expect(task.description).toBe('');
      expect(task.status).toBe('todo');
      expect(task.priority).toBe('medium');
      expect(task.dueDate).toBeNull();
      expect(task.completedAt).toBeNull();
      expect(task.createdAt).toBeDefined();
    });

    test('getAll should return a copy, not the internal array', () => {
      taskService.create({ title: 'Task 1' });
      const all = taskService.getAll();

      all.push({ id: 'x', title: 'Injected' });

      expect(taskService.getAll()).toHaveLength(1);
    });

    test('findById returns task when it exists', () => {
      const created = taskService.create({ title: 'Find me' });

      const found = taskService.findById(created.id);

      expect(found).toBeDefined();
      expect(found.id).toBe(created.id);
    });
  });

  describe('filtering and pagination', () => {
    test('getByStatus should return only exact status matches', () => {
      taskService.create({ title: 'Todo task', status: 'todo' });
      taskService.create({ title: 'Done task', status: 'done' });

      const tasks = taskService.getByStatus('done');

      expect(tasks).toHaveLength(1);
      expect(tasks[0].status).toBe('done');
    });

    test('getPaginated should return first page when page=1', () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });
      taskService.create({ title: 'Task 3' });

      const page1 = taskService.getPaginated(1, 2);

      expect(page1).toHaveLength(2);
      expect(page1[0].title).toBe('Task 1');
      expect(page1[1].title).toBe('Task 2');
    });
  });

  describe('update and delete operations', () => {
    test('update should merge fields and return updated task', () => {
      const created = taskService.create({ title: 'Old', priority: 'low' });

      const updated = taskService.update(created.id, { title: 'New', status: 'in_progress' });

      expect(updated).toBeDefined();
      expect(updated.title).toBe('New');
      expect(updated.status).toBe('in_progress');
      expect(updated.priority).toBe('low');
    });

    test('update should return null for missing task', () => {
      const updated = taskService.update('missing-id', { title: 'Nope' });
      expect(updated).toBeNull();
    });

    test('remove should delete existing task and return true', () => {
      const created = taskService.create({ title: 'Delete me' });

      const deleted = taskService.remove(created.id);

      expect(deleted).toBe(true);
      expect(taskService.findById(created.id)).toBeUndefined();
    });

    test('remove should return false for missing task', () => {
      const deleted = taskService.remove('missing-id');
      expect(deleted).toBe(false);
    });
  });

  describe('completion and stats', () => {
    test('completeTask should mark task as done and set completedAt', () => {
      const created = taskService.create({ title: 'Complete me', priority: 'high' });

      const completed = taskService.completeTask(created.id);

      expect(completed).toBeDefined();
      expect(completed.status).toBe('done');
      expect(completed.completedAt).toBeDefined();
    });

    test('completeTask should return null for missing task', () => {
      const completed = taskService.completeTask('missing-id');
      expect(completed).toBeNull();
    });

    test('getStats should return status counts and overdue count', () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      taskService.create({ title: 'Todo overdue', status: 'todo', dueDate: yesterday });
      taskService.create({ title: 'In progress due later', status: 'in_progress', dueDate: tomorrow });
      taskService.create({ title: 'Done overdue but completed', status: 'done', dueDate: yesterday });

      const stats = taskService.getStats();

      expect(stats.todo).toBe(1);
      expect(stats.in_progress).toBe(1);
      expect(stats.done).toBe(1);
      expect(stats.overdue).toBe(1);
    });
  });
});
