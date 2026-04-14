const taskService = require('../src/services/taskService');

describe('taskService', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('create', () => {
    it('should create a task with default values', () => {
      const task = taskService.create({ title: 'Test Task' });
      expect(task).toHaveProperty('id');
      expect(task.title).toBe('Test Task');
      expect(task.description).toBe('');
      expect(task.status).toBe('todo');
      expect(task.priority).toBe('medium');
      expect(task.dueDate).toBeNull();
      expect(task.completedAt).toBeNull();
      expect(task.createdAt).toBeDefined();
    });

    it('should create a task with provided values', () => {
      const task = taskService.create({
        title: 'Another Task',
        description: 'Desc',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2025-01-01T00:00:00.000Z'
      });
      expect(task.title).toBe('Another Task');
      expect(task.description).toBe('Desc');
      expect(task.status).toBe('in_progress');
      expect(task.priority).toBe('high');
      expect(task.dueDate).toBe('2025-01-01T00:00:00.000Z');
    });
  });

  describe('getAll', () => {
    it('should return all tasks', () => {
      expect(taskService.getAll()).toHaveLength(0);
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });
      expect(taskService.getAll()).toHaveLength(2);
    });
  });

  describe('findById', () => {
    it('should find a task by id', () => {
      const task = taskService.create({ title: 'Find Me' });
      const found = taskService.findById(task.id);
      expect(found).toEqual(task);
    });

    it('should return undefined for non-existent id', () => {
      expect(taskService.findById('not-a-real-id')).toBeUndefined();
    });
  });

  describe('getByStatus', () => {
    it('should filter tasks by status', () => {
      taskService.create({ title: 'Todo 1', status: 'todo' });
      taskService.create({ title: 'Todo 2', status: 'todo' });
      taskService.create({ title: 'Done 1', status: 'done' });
      
      const todos = taskService.getByStatus('todo');
      expect(todos).toHaveLength(2);
      expect(todos.every(t => t.status === 'todo')).toBe(true);

      const doneTasks = taskService.getByStatus('done');
      expect(doneTasks).toHaveLength(1);
      expect(doneTasks[0].status).toBe('done');
    });

    // Expose the bug!
    it('should match status exactly (not partially)', () => {
      taskService.create({ title: 'Todo Task', status: 'todo' });
      taskService.create({ title: 'Done Task', status: 'done' });
      
      const doTasks = taskService.getByStatus('do');
      // If we search for 'do' exactly, it should not match 'todo' or 'done'
      expect(doTasks).toHaveLength(0);
    });
  });

  describe('getPaginated', () => {
    it('should return paginated tasks', () => {
      for (let i = 0; i < 5; i++) {
        taskService.create({ title: `Task ${i}` });
      }
      const page0 = taskService.getPaginated(0, 2);
      expect(page0).toHaveLength(2);
      expect(page0[0].title).toBe('Task 0');

      const page1 = taskService.getPaginated(1, 2);
      expect(page1).toHaveLength(2);
      expect(page1[0].title).toBe('Task 2');

      const page2 = taskService.getPaginated(2, 2);
      expect(page2).toHaveLength(1);
      expect(page2[0].title).toBe('Task 4');
    });
  });

  describe('getStats', () => {
    it('should return correct counts and overdue tasks', () => {
      const now = new Date();
      const past = new Date(now.getTime() - 100000).toISOString();
      const future = new Date(now.getTime() + 100000).toISOString();

      taskService.create({ title: 'T1', status: 'todo' });
      taskService.create({ title: 'T2', status: 'todo', dueDate: past }); // overdue
      taskService.create({ title: 'T3', status: 'in_progress', dueDate: future });
      taskService.create({ title: 'T4', status: 'done', dueDate: past }); // done, not overdue

      const stats = taskService.getStats();
      expect(stats.todo).toBe(2);
      expect(stats.in_progress).toBe(1);
      expect(stats.done).toBe(1);
      expect(stats.overdue).toBe(1);
    });
  });

  describe('update', () => {
    it('should update an existing task', () => {
      const task = taskService.create({ title: 'Old Title' });
      const updated = taskService.update(task.id, { title: 'New Title', status: 'in_progress' });
      expect(updated.title).toBe('New Title');
      expect(updated.status).toBe('in_progress');
      
      const fetched = taskService.findById(task.id);
      expect(fetched.title).toBe('New Title');
    });

    it('should return null if task not found', () => {
      const updated = taskService.update('invalid-id', { title: 'New' });
      expect(updated).toBeNull();
    });
  });

  describe('remove', () => {
    it('should remove an existing task', () => {
      const task = taskService.create({ title: 'Delete me' });
      const success = taskService.remove(task.id);
      expect(success).toBe(true);
      expect(taskService.findById(task.id)).toBeUndefined();
    });

    it('should return false if task not found', () => {
      const success = taskService.remove('invalid-id');
      expect(success).toBe(false);
    });
  });

  describe('completeTask', () => {
    it('should mark a task as done', () => {
      const task = taskService.create({ title: 'Complete me', priority: 'high', status: 'todo' });
      const completed = taskService.completeTask(task.id);
      expect(completed.status).toBe('done');
      expect(completed.completedAt).not.toBeNull();
      
      // Expose the bug! Complete shouldn't alter priority
      expect(completed.priority).toBe('high');
    });

    it('should return null if task not found', () => {
      const completed = taskService.completeTask('invalid-id');
      expect(completed).toBeNull();
    });
  });
});
