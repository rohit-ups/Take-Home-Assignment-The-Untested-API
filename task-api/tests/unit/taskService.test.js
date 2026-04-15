const taskService = require('../../src/services/taskService');

describe('taskService', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('create', () => {
    it('should create a new task with default values', () => {
      const task = taskService.create({ title: 'Test Task' });
      expect(task).toHaveProperty('id');
      expect(task.title).toBe('Test Task');
      expect(task.status).toBe('todo');
      expect(task.priority).toBe('medium');
      expect(task.description).toBe('');
      expect(task.dueDate).toBeNull();
      expect(task.createdAt).toBeDefined();
    });

    it('should create a new task with provided values', () => {
      const data = {
        title: 'Task 2',
        description: 'Details',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2026-12-31T00:00:00.000Z',
      };
      const task = taskService.create(data);
      expect(task.title).toBe(data.title);
      expect(task.description).toBe(data.description);
      expect(task.status).toBe(data.status);
      expect(task.priority).toBe(data.priority);
      expect(task.dueDate).toBe(data.dueDate);
    });
  });

  describe('getAll', () => {
    it('should return an empty array initially', () => {
      expect(taskService.getAll()).toEqual([]);
    });

    it('should return all created tasks', () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });
      expect(taskService.getAll().length).toBe(2);
    });
  });

  describe('findById', () => {
    it('should find a task by id', () => {
      const task = taskService.create({ title: 'Task' });
      const found = taskService.findById(task.id);
      expect(found).toEqual(task);
    });

    it('should return undefined if task not found', () => {
      expect(taskService.findById('non-existent')).toBeUndefined();
    });
  });

  describe('getByStatus', () => {
    it('should filter tasks by exact status', () => {
      taskService.create({ title: 'T1', status: 'todo' });
      taskService.create({ title: 'T2', status: 'done' });

      // This is expected to FAIL because the current implementation uses .includes()
      const results = taskService.getByStatus('do');
      expect(results.length).toBe(0);
    });
  });

  describe('getPaginated', () => {
    it('should return the first page of results (page 1)', () => {
      for (let i = 0; i < 10; i++) {
        taskService.create({ title: `Task ${i}` });
      }

      // This is expected to FAIL because current offset is page * limit (1 * 5 = 5)
      const page1 = taskService.getPaginated(1, 5);
      expect(page1.length).toBe(5);
      expect(page1[0].title).toBe('Task 0');
    });
  });

  describe('update', () => {
    it('should update a task', () => {
      const task = taskService.create({ title: 'Old Title' });
      const updated = taskService.update(task.id, { title: 'New Title' });
      expect(updated.title).toBe('New Title');
      expect(taskService.findById(task.id).title).toBe('New Title');
    });

    it('should return null if task to update not found', () => {
      expect(taskService.update('none', { title: 'X' })).toBeNull();
    });
  });

  describe('remove', () => {
    it('should remove a task', () => {
      const task = taskService.create({ title: 'Task' });
      const result = taskService.remove(task.id);
      expect(result).toBe(true);
      expect(taskService.getAll().length).toBe(0);
    });

    it('should return false if task to remove not found', () => {
      expect(taskService.remove('none')).toBe(false);
    });
  });

  describe('completeTask', () => {
    it('should mark a task as done and maintain original priority', () => {
      const task = taskService.create({ title: 'High Task', priority: 'high' });
      
      // This is expected to FAIL because current implementation resets priority to medium
      const completed = taskService.completeTask(task.id);
      expect(completed.status).toBe('done');
      expect(completed.priority).toBe('high');
      expect(completed.completedAt).toBeDefined();
    });
  });

  describe('assignTask', () => {
    it('should assign a task to a user', () => {
      const task = taskService.create({ title: 'Task' });
      const assigned = taskService.assignTask(task.id, 'John Doe');
      expect(assigned.assignee).toBe('John Doe');
      expect(taskService.findById(task.id).assignee).toBe('John Doe');
    });

    it('should return null if task to assign not found', () => {
      expect(taskService.assignTask('none', 'John Doe')).toBeNull();
    });
  });

  describe('getStats', () => {
    it('should return correct counts and overdue stats', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      
      taskService.create({ title: 'Done', status: 'done' });
      taskService.create({ title: 'Todo', status: 'todo' });
      taskService.create({ title: 'Overdue', status: 'todo', dueDate: pastDate.toISOString() });

      const stats = taskService.getStats();
      expect(stats.todo).toBe(2);
      expect(stats.done).toBe(1);
      expect(stats.overdue).toBe(1);
    });
  });
});
