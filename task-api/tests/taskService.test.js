const taskService = require('../src/services/taskService');

describe('Task Service Unit Tests', () => {
  beforeEach(() => {
    // Reset the in-memory array before each test so they don't interfere
    taskService._reset();
  });

  describe('create()', () => {
    it('should create a task with default values (happy path)', () => {
      const taskData = { title: 'Test Task' };
      const task = taskService.create(taskData);
      
      expect(task).toHaveProperty('id');
      expect(task.title).toBe('Test Task');
      expect(task.description).toBe('');
      expect(task.status).toBe('todo');
      expect(task.priority).toBe('medium');
      expect(task).toHaveProperty('createdAt');
      expect(task.completedAt).toBeNull();
    });

    it('should create a task with provided values', () => {
      const taskData = {
        title: 'Important task',
        description: 'D this nowo',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2026-12-31T00:00:00Z'
      };
      const task = taskService.create(taskData);
      
      expect(task.title).toBe('Important task');
      expect(task.status).toBe('in_progress');
      expect(task.priority).toBe('high');
      expect(task.dueDate).toBe('2026-12-31T00:00:00Z');
    });
  });

  describe('getAll()', () => {
    it('should return empty array when no tasks exist', () => {
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

  describe('findById()', () => {
    it('should return the task if it exists (happy path)', () => {
      const created = taskService.create({ title: 'Find me' });
      const found = taskService.findById(created.id);
      
      expect(found).toBeDefined();
      expect(found.id).toBe(created.id);
    });

    it('should return undefined if task does not exist (edge case)', () => {
      const found = taskService.findById('non-existent-id');
      expect(found).toBeUndefined();
    });
  });

  describe('getByStatus()', () => {
    it('should filter tasks by status correctly', () => {
      taskService.create({ title: 'To Do', status: 'todo' });
      taskService.create({ title: 'Done 1', status: 'done' });
      taskService.create({ title: 'Done 2', status: 'done' });
      
      const doneTasks = taskService.getByStatus('done');
      expect(doneTasks.length).toBe(2);
      expect(doneTasks[0].title).toBe('Done 1');
    });

    it('should return empty array if no tasks match status', () => {
      const inProgressTasks = taskService.getByStatus('in_progress');
      expect(inProgressTasks).toEqual([]);
    });
  });

  describe('getPaginated()', () => {
    beforeEach(() => {
      for(let i=0; i<5; i++) {
        taskService.create({ title: `Task ${i}` });
      }
    });

    it('should return tasks for the given page and limit', () => {
      const page = 1;
      const limit = 2;
      const paginated = taskService.getPaginated(page, limit);
      
      // Page 1 should start from index 0, returning Task 0 and Task 1.
      expect(paginated.length).toBe(2);
      expect(paginated[0].title).toBe('Task 0');
      expect(paginated[1].title).toBe('Task 1');
    });
  });

  describe('update()', () => {
    it('should update task fields correctly (happy path)', () => {
      const task = taskService.create({ title: 'Old Title' });
      
      const updated = taskService.update(task.id, { title: 'New Title', priority: 'high' });
      
      expect(updated.title).toBe('New Title');
      expect(updated.priority).toBe('high');
      
      // Verify in memory
      const found = taskService.findById(task.id);
      expect(found.title).toBe('New Title');
    });

    it('should return null if task does not exist (edge case)', () => {
      const updated = taskService.update('bad-id', { title: 'New' });
      expect(updated).toBeNull();
    });
  });

  describe('remove()', () => {
    it('should remove an existing task and return true (happy path)', () => {
      const task = taskService.create({ title: 'To Delete' });
      const result = taskService.remove(task.id);
      
      expect(result).toBe(true);
      expect(taskService.getAll().length).toBe(0);
    });

    it('should return false if task does not exist (edge case)', () => {
      const result = taskService.remove('bad-id');
      expect(result).toBe(false);
    });
  });

  describe('completeTask()', () => {
    it('should mark task as completed and set completedAt', () => {
      const task = taskService.create({ title: 'Finish this' });
      const completed = taskService.completeTask(task.id);
      
      expect(completed.status).toBe('done');
      expect(completed.completedAt).not.toBeNull();
      
      // Check for potential bug: Did it reset priority to 'medium'?
      // We'll see this later.
    });

    it('should return null if trying to complete non-existent task', () => {
      const result = taskService.completeTask('fake-id');
      expect(result).toBeNull();
    });
  });

  describe('assignTask()', () => {
    it('should assign a task to a user', () => {
      const task = taskService.create({ title: 'To Assign' });
      const updated = taskService.assignTask(task.id, 'John Doe');
      
      expect(updated.assignee).toBe('John Doe');
    });

    it('should throw an error if already assigned to someone else', () => {
      const task = taskService.create({ title: 'Assigned' });
      taskService.assignTask(task.id, 'Alice');
      
      expect(() => taskService.assignTask(task.id, 'Bob')).toThrow('Task is already assigned to someone else');
    });

    it('should allow assigning to the same user idempotently', () => {
      const task = taskService.create({ title: 'Assigned' });
      taskService.assignTask(task.id, 'Alice');
      const updated = taskService.assignTask(task.id, 'Alice');
      expect(updated.assignee).toBe('Alice');
    });

    it('should return null if task does not exist', () => {
      const result = taskService.assignTask('bad-id', 'John');
      expect(result).toBeNull();
    });
  });

  describe('getStats()', () => {
    it('should correctly count tasks by status', () => {
      taskService.create({ title: 'T1', status: 'todo' });
      taskService.create({ title: 'T2', status: 'in_progress' });
      taskService.create({ title: 'T3', status: 'done' });
      taskService.create({ title: 'T4', status: 'done' });

      const stats = taskService.getStats();
      expect(stats.todo).toBe(1);
      expect(stats.in_progress).toBe(1);
      expect(stats.done).toBe(2);
      expect(stats.overdue).toBe(0);
    });
  });
});
