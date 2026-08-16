const taskService = require('../src/services/taskService');

describe('taskService Unit Tests', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('create', () => {
    it('should create a task with default status, priority and description', () => {
      const task = taskService.create({ title: 'Test Task' });
      expect(task).toBeDefined();
      expect(task.id).toBeDefined();
      expect(task.title).toBe('Test Task');
      expect(task.description).toBe('');
      expect(task.status).toBe('todo');
      expect(task.priority).toBe('medium');
      expect(task.dueDate).toBeNull();
      expect(task.completedAt).toBeNull();
      expect(task.createdAt).toBeDefined();
      expect(task.assignee).toBeNull();
      expect(isNaN(Date.parse(task.createdAt))).toBe(false);
    });

    it('should create a task with custom fields', () => {
      const dueDate = new Date().toISOString();
      const task = taskService.create({
        title: 'Custom Task',
        description: 'Custom Description',
        status: 'in_progress',
        priority: 'high',
        dueDate,
      });
      expect(task.title).toBe('Custom Task');
      expect(task.description).toBe('Custom Description');
      expect(task.status).toBe('in_progress');
      expect(task.priority).toBe('high');
      expect(task.dueDate).toBe(dueDate);
      expect(task.assignee).toBeNull();
    });
  });

  describe('getAll', () => {
    it('should return an empty array initially', () => {
      const tasks = taskService.getAll();
      expect(tasks).toEqual([]);
    });

    it('should return all created tasks', () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });
      const tasks = taskService.getAll();
      expect(tasks.length).toBe(2);
      expect(tasks[0].title).toBe('Task 1');
      expect(tasks[1].title).toBe('Task 2');
    });
  });

  describe('findById', () => {
    it('should return undefined if task is not found', () => {
      const task = taskService.findById('non-existent-id');
      expect(task).toBeUndefined();
    });

    it('should return the correct task by id', () => {
      const created = taskService.create({ title: 'Find Me' });
      const found = taskService.findById(created.id);
      expect(found).toEqual(created);
    });
  });

  describe('getByStatus', () => {
    it('should return empty list if no tasks match status', () => {
      taskService.create({ title: 'Task 1', status: 'todo' });
      const tasks = taskService.getByStatus('done');
      expect(tasks).toEqual([]);
    });

    it('should return filtered tasks by status with exact match', () => {
      const task1 = taskService.create({ title: 'Task 1', status: 'todo' });
      const task2 = taskService.create({ title: 'Task 2', status: 'in_progress' });
      const task3 = taskService.create({ title: 'Task 3', status: 'done' });

      const todoTasks = taskService.getByStatus('todo');
      expect(todoTasks).toContainEqual(task1);
      expect(todoTasks).not.toContainEqual(task2);
      expect(todoTasks).not.toContainEqual(task3);

      const inProgressTasksExact = taskService.getByStatus('in_progress');
      expect(inProgressTasksExact).toContainEqual(task2);

      const inProgressTasksPartial = taskService.getByStatus('progress');
      expect(inProgressTasksPartial).toEqual([]);
    });
  });

  describe('getPaginated', () => {
    it('should return paginated tasks according to 1-based page and limit', () => {
      const createdTasks = [];
      for (let i = 0; i < 15; i++) {
        createdTasks.push(taskService.create({ title: `Task ${i}` }));
      }

      const page1 = taskService.getPaginated(1, 5);
      expect(page1.length).toBe(5);
      expect(page1[0].title).toBe('Task 0');
      expect(page1[4].title).toBe('Task 4');

      const page2 = taskService.getPaginated(2, 5);
      expect(page2.length).toBe(5);
      expect(page2[0].title).toBe('Task 5');
      expect(page2[4].title).toBe('Task 9');
    });
  });

  describe('getStats', () => {
    it('should return zero counts initially', () => {
      const stats = taskService.getStats();
      expect(stats).toEqual({
        todo: 0,
        in_progress: 0,
        done: 0,
        overdue: 0,
      });
    });

    it('should compute status counts and count overdue tasks correctly', () => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

      taskService.create({ title: 'Task 1', status: 'todo' });
      taskService.create({ title: 'Task 2', status: 'todo', dueDate: pastDate });
      taskService.create({ title: 'Task 3', status: 'in_progress', dueDate: pastDate });
      taskService.create({ title: 'Task 4', status: 'done', dueDate: pastDate });
      taskService.create({ title: 'Task 5', status: 'todo', dueDate: futureDate });

      taskService.create({ title: 'Task Invalid Status', status: 'unknown' });

      const stats = taskService.getStats();
      expect(stats.todo).toBe(3);
      expect(stats.in_progress).toBe(1);
      expect(stats.done).toBe(1);
      expect(stats.overdue).toBe(2);
    });
  });

  describe('update', () => {
    it('should return null if task does not exist', () => {
      const result = taskService.update('non-existent-id', { title: 'Updated Title' });
      expect(result).toBeNull();
    });

    it('should update and return the updated task', () => {
      const created = taskService.create({ title: 'Original Title', description: 'Original Description' });
      const updated = taskService.update(created.id, { title: 'New Title', priority: 'high' });

      expect(updated).toBeDefined();
      expect(updated.id).toBe(created.id);
      expect(updated.title).toBe('New Title');
      expect(updated.description).toBe('Original Description');
      expect(updated.priority).toBe('high');

      const found = taskService.findById(created.id);
      expect(found.title).toBe('New Title');
    });
  });

  describe('remove', () => {
    it('should return false if task does not exist', () => {
      const result = taskService.remove('non-existent-id');
      expect(result).toBe(false);
    });

    it('should delete task and return true', () => {
      const created = taskService.create({ title: 'Delete Me' });
      const result = taskService.remove(created.id);
      expect(result).toBe(true);

      const found = taskService.findById(created.id);
      expect(found).toBeUndefined();
    });
  });

  describe('completeTask', () => {
    it('should return null if task does not exist', () => {
      const result = taskService.completeTask('non-existent-id');
      expect(result).toBeNull();
    });

    it('should set status to done, set completedAt, and keep original priority', () => {
      const created = taskService.create({ title: 'Task to Complete', priority: 'high' });
      const completed = taskService.completeTask(created.id);

      expect(completed).toBeDefined();
      expect(completed.status).toBe('done');
      expect(completed.priority).toBe('high');
      expect(completed.completedAt).toBeDefined();
      expect(isNaN(Date.parse(completed.completedAt))).toBe(false);

      const found = taskService.findById(created.id);
      expect(found.status).toBe('done');
    });
  });

  describe('assignTask', () => {
    it('should return null if task does not exist', () => {
      const result = taskService.assignTask('non-existent-id', 'John Doe');
      expect(result).toBeNull();
    });

    it('should update assignee and return updated task', () => {
      const created = taskService.create({ title: 'Task to Assign' });
      expect(created.assignee).toBeNull();

      const updated = taskService.assignTask(created.id, 'John Doe');
      expect(updated).toBeDefined();
      expect(updated.id).toBe(created.id);
      expect(updated.assignee).toBe('John Doe');

      const found = taskService.findById(created.id);
      expect(found.assignee).toBe('John Doe');
    });
  });
});
