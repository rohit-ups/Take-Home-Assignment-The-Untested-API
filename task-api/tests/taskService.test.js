const taskService = require('../src/services/taskService');

describe('TaskService Unit Tests', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('create and findById / getAll', () => {
    it('should create a task with default values and retrieve it', () => {
      const taskData = { title: 'First Task' };
      const created = taskService.create(taskData);

      expect(created.id).toBeDefined();
      expect(created.title).toBe('First Task');
      expect(created.description).toBe('');
      expect(created.status).toBe('todo');
      expect(created.priority).toBe('medium');
      expect(created.dueDate).toBeNull();
      expect(created.assignee).toBeNull();
      expect(created.completedAt).toBeNull();
      expect(created.createdAt).toBeDefined();

      const found = taskService.findById(created.id);
      expect(found).toEqual(created);

      const all = taskService.getAll();
      expect(all.length).toBe(1);
      expect(all[0]).toEqual(created);
    });

    it('should return undefined when finding a non-existent task ID', () => {
      expect(taskService.findById('non-existent-id')).toBeUndefined();
    });
  });

  describe('getByStatus', () => {
    it('should filter tasks by exact status match', () => {
      taskService.create({ title: 'Task 1', status: 'todo' });
      taskService.create({ title: 'Task 2', status: 'in_progress' });
      taskService.create({ title: 'Task 3', status: 'done' });

      const todoTasks = taskService.getByStatus('todo');
      expect(todoTasks.length).toBe(1);
      expect(todoTasks[0].title).toBe('Task 1');
    });

    it('should not match partial status substrings', () => {
      taskService.create({ title: 'Task Todo', status: 'todo' });
      taskService.create({ title: 'Task Done', status: 'done' });

      const result = taskService.getByStatus('do');
      expect(result.length).toBe(0);
    });
  });

  describe('getPaginated', () => {
    it('should calculate offset correctly for 1-based page indexing', () => {
      for (let i = 1; i <= 20; i++) {
        taskService.create({ title: `Task ${i}` });
      }

      const page1 = taskService.getPaginated(1, 10);
      expect(page1.length).toBe(10);
      expect(page1[0].title).toBe('Task 1');
      expect(page1[9].title).toBe('Task 10');

      const page2 = taskService.getPaginated(2, 10);
      expect(page2.length).toBe(10);
      expect(page2[0].title).toBe('Task 11');
      expect(page2[9].title).toBe('Task 20');
    });
  });

  describe('getStats', () => {
    it('should correctly count task statuses and overdue tasks', () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString();
      const futureDate = new Date(Date.now() + 86400000).toISOString();

      taskService.create({ title: 'Todo Overdue', status: 'todo', dueDate: pastDate });
      taskService.create({ title: 'Todo Future', status: 'todo', dueDate: futureDate });
      taskService.create({ title: 'In Progress Overdue', status: 'in_progress', dueDate: pastDate });
      taskService.create({ title: 'Done Overdue', status: 'done', dueDate: pastDate });

      const stats = taskService.getStats();
      expect(stats.todo).toBe(2);
      expect(stats.in_progress).toBe(1);
      expect(stats.done).toBe(1);
      expect(stats.overdue).toBe(2);
    });
  });

  describe('update', () => {
    it('should update task fields successfully', () => {
      const task = taskService.create({ title: 'Initial Title', priority: 'low' });
      const updated = taskService.update(task.id, { title: 'Updated Title', priority: 'high' });

      expect(updated.title).toBe('Updated Title');
      expect(updated.priority).toBe('high');
      expect(taskService.findById(task.id).title).toBe('Updated Title');
    });

    it('should return null when updating a non-existent task', () => {
      expect(taskService.update('invalid-id', { title: 'New' })).toBeNull();
    });
  });

  describe('remove', () => {
    it('should remove an existing task', () => {
      const task = taskService.create({ title: 'To delete' });
      expect(taskService.remove(task.id)).toBe(true);
      expect(taskService.findById(task.id)).toBeUndefined();
      expect(taskService.getAll().length).toBe(0);
    });

    it('should return false when trying to remove a non-existent task', () => {
      expect(taskService.remove('invalid-id')).toBe(false);
    });
  });

  describe('completeTask', () => {
    it('should mark task as done, record completedAt, and preserve original priority', () => {
      const task = taskService.create({ title: 'High priority task', priority: 'high' });
      const completed = taskService.completeTask(task.id);

      expect(completed.status).toBe('done');
      expect(completed.completedAt).not.toBeNull();
      expect(completed.priority).toBe('high');
    });

    it('should return null for non-existent task', () => {
      expect(taskService.completeTask('invalid-id')).toBeNull();
    });
  });

  describe('assignTask', () => {
    it('should assign a task to a user', () => {
      const task = taskService.create({ title: 'Unassigned task' });
      const assigned = taskService.assignTask(task.id, 'John Doe');

      expect(assigned.assignee).toBe('John Doe');
      expect(taskService.findById(task.id).assignee).toBe('John Doe');
    });

    it('should return null when assigning a non-existent task', () => {
      expect(taskService.assignTask('invalid-id', 'John Doe')).toBeNull();
    });
  });
});
