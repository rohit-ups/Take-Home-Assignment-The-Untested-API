const taskService = require('../src/services/taskService');

describe('taskService - Unit Tests', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('create()', () => {
    it('should create a task with default values', () => {
      const task = taskService.create({ title: 'Unit Task' });

      expect(task).toHaveProperty('id');
      expect(task.title).toBe('Unit Task');
      expect(task.description).toBe('');
      expect(task.status).toBe('todo');
      expect(task.priority).toBe('medium');
      expect(task.dueDate).toBeNull();
      expect(task.completedAt).toBeNull();
      expect(task).toHaveProperty('createdAt');
    });

    it('should create a task with provided values', () => {
      const taskData = {
        title: 'Custom Task',
        description: 'Detailed description',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2026-12-31',
      };
      const task = taskService.create(taskData);

      expect(task.title).toBe(taskData.title);
      expect(task.description).toBe(taskData.description);
      expect(task.status).toBe(taskData.status);
      expect(task.priority).toBe(taskData.priority);
      expect(task.dueDate).toBe(taskData.dueDate);
    });
  });

  describe('getAll()', () => {
    it('should return a shallow copy of tasks array', () => {
      taskService.create({ title: 'Task 1' });
      const tasks = taskService.getAll();

      expect(tasks.length).toBe(1);
      expect(tasks[0].title).toBe('Task 1');
    });
  });

  describe('findById()', () => {
    it('should find a task by valid ID', () => {
      const created = taskService.create({ title: 'Task 1' });
      const found = taskService.findById(created.id);

      expect(found).toBeDefined();
      expect(found.id).toBe(created.id);
    });

    it('should return undefined for a non-existent ID', () => {
      const found = taskService.findById('non-existent-id');
      expect(found).toBeUndefined();
    });
  });

  describe('getByStatus()', () => {
    it('should filter tasks by status', () => {
      taskService.create({ title: 'Task 1', status: 'todo' });
      taskService.create({ title: 'Task 2', status: 'done' });

      const doneTasks = taskService.getByStatus('done');
      expect(doneTasks.length).toBe(1);
      expect(doneTasks[0].title).toBe('Task 2');
    });
  });

  describe('getPaginated()', () => {
    it('should return paginated slice of tasks', () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });

      const page = taskService.getPaginated(0, 1);
      expect(page.length).toBe(1);
      expect(page[0].title).toBe('Task 1');
    });
  });

  describe('getStats()', () => {
    it('should count statuses and identify overdue tasks correctly', () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString(); // 1 day ago
      const futureDate = new Date(Date.now() + 86400000).toISOString(); // 1 day ahead

      taskService.create({ title: 'Task 1', status: 'todo', dueDate: pastDate });
      taskService.create({ title: 'Task 2', status: 'in_progress', dueDate: futureDate });
      taskService.create({ title: 'Task 3', status: 'done', dueDate: pastDate }); // Done tasks are not overdue

      const stats = taskService.getStats();

      expect(stats.todo).toBe(1);
      expect(stats.in_progress).toBe(1);
      expect(stats.done).toBe(1);
      expect(stats.overdue).toBe(1);
    });
  });

  describe('update()', () => {
    it('should update fields on an existing task', () => {
      const task = taskService.create({ title: 'Old Title' });
      const updated = taskService.update(task.id, { title: 'New Title' });

      expect(updated.title).toBe('New Title');
    });

    it('should return null when updating a non-existent task', () => {
      const result = taskService.update('non-existent-id', { title: 'New Title' });
      expect(result).toBeNull();
    });
  });

  describe('remove()', () => {
    it('should remove an existing task', () => {
      const task = taskService.create({ title: 'Delete Me' });
      const deleted = taskService.remove(task.id);

      expect(deleted).toBe(true);
      expect(taskService.getAll().length).toBe(0);
    });

    it('should return false when removing a non-existent task', () => {
      const deleted = taskService.remove('non-existent-id');
      expect(deleted).toBe(false);
    });
  });

  describe('completeTask()', () => {
    it('should mark an existing task as complete', () => {
      const task = taskService.create({ title: 'To Complete', priority: 'high' });
      const completed = taskService.completeTask(task.id);

      expect(completed.status).toBe('done');
      expect(completed.completedAt).not.toBeNull();
    });

    it('should return null when completing a non-existent task', () => {
      const result = taskService.completeTask('non-existent-id');
      expect(result).toBeNull();
    });
  });
});