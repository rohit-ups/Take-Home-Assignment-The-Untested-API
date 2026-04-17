const taskService = require('../../src/services/taskService');

describe('taskService', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('create', () => {
    it('should create a task successfully with valid input', () => {
      const task = taskService.create({ title: 'Test Task' });
      expect(task).toBeDefined();
      expect(task.id).toBeDefined();
      expect(task.title).toBe('Test Task');
      expect(task.status).toBe('todo');
      expect(task.priority).toBe('medium');
    });

    it('should set default values if only title is provided', () => {
      const task = taskService.create({ title: 'Simple Task' });
      expect(task.description).toBe('');
      expect(task.status).toBe('todo');
      expect(task.priority).toBe('medium');
      expect(task.dueDate).toBeNull();
      expect(task.completedAt).toBeNull();
    });
  });

  describe('getAll', () => {
    it('should return empty list initially', () => {
      expect(taskService.getAll()).toEqual([]);
    });

    it('should return all created tasks', () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });
      const tasks = taskService.getAll();
      expect(tasks.length).toBe(2);
    });
  });

  describe('findById', () => {
    it('should find a task by existing id', () => {
      const created = taskService.create({ title: 'Task to find' });
      const found = taskService.findById(created.id);
      expect(found).toBeDefined();
      expect(found.id).toBe(created.id);
    });

    it('should return undefined for a non-existent id', () => {
      expect(taskService.findById('invalid-id')).toBeUndefined();
    });
  });

  describe('getByStatus', () => {
    it('should return tasks matching a status', () => {
      taskService.create({ title: 'Task 1', status: 'todo' });
      taskService.create({ title: 'Task 2', status: 'done' });
      
      const todoTasks = taskService.getByStatus('todo');
      expect(todoTasks.length).toBe(1);
      expect(todoTasks[0].status).toBe('todo');
    });

    it('should NOT match partially, only exact status', () => {
      taskService.create({ title: 'Task 1', status: 'in_progress' });
      const tasks = taskService.getByStatus('progress');
      expect(tasks.length).toBe(0); // Should be exactly 0, not 1
    });
  });

  describe('getPaginated', () => {
    it('should return subset of tasks based on page and limit', () => {
      taskService.create({ title: 'T1' });
      taskService.create({ title: 'T2' });
      taskService.create({ title: 'T3' });

      // Correct test: page 1 should be the first page
      // Therefore, offset = (1 - 1) * 2 = 0
      const page1 = taskService.getPaginated(1, 2);
      expect(page1.length).toBe(2);
      expect(page1[0].title).toBe('T1');
      expect(page1[1].title).toBe('T2');

      const page2 = taskService.getPaginated(2, 2);
      expect(page2.length).toBe(1);
      expect(page2[0].title).toBe('T3');
    });
  });

  describe('update', () => {
    it('should update an existing task successfully', () => {
      const task = taskService.create({ title: 'Old Title' });
      const updated = taskService.update(task.id, { title: 'New Title', status: 'in_progress' });
      
      expect(updated.title).toBe('New Title');
      expect(updated.status).toBe('in_progress');
      
      // Verify in array
      const retrieved = taskService.findById(task.id);
      expect(retrieved.title).toBe('New Title');
    });

    it('should return null when updating non-existent task', () => {
      const updated = taskService.update('invalid-id', { title: 'New' });
      expect(updated).toBeNull();
    });
  });

  describe('remove', () => {
    it('should correctly remove existing task', () => {
      const task = taskService.create({ title: 'To Delete' });
      const result = taskService.remove(task.id);
      
      expect(result).toBe(true);
      expect(taskService.getAll().length).toBe(0);
    });

    it('should return false when trying to remove non-existent task', () => {
      const result = taskService.remove('invalid-id');
      expect(result).toBe(false);
    });
  });

  describe('completeTask', () => {
    it('should mark an existing task as done and set completedAt', () => {
      const task = taskService.create({ title: 'Almost Done', priority: 'high' });
      const completed = taskService.completeTask(task.id);
      
      expect(completed.status).toBe('done');
      expect(completed.priority).toBe('high'); // Priority should remain unchanged
      expect(completed.completedAt).not.toBeNull();
    });

    it('should return null if task to complete does not exist', () => {
      const result = taskService.completeTask('invalid-id');
      expect(result).toBeNull();
    });
  });

  describe('assignTask', () => {
    it('should assign a task to a given assignee successfully', () => {
      const task = taskService.create({ title: 'Unassigned Task' });
      const assignedTask = taskService.assignTask(task.id, 'John Doe');
      expect(assignedTask.assignee).toBe('John Doe');
      
      const retrieved = taskService.findById(task.id);
      expect(retrieved.assignee).toBe('John Doe');
    });

    it('should reassign an already assigned task', () => {
      const task = taskService.create({ title: 'Assigned Task' });
      taskService.assignTask(task.id, 'Alice');
      const reassignedTask = taskService.assignTask(task.id, 'Bob');
      expect(reassignedTask.assignee).toBe('Bob');
    });

    it('should return null if task does not exist', () => {
      const result = taskService.assignTask('invalid-id', 'John Doe');
      expect(result).toBeNull();
    });
  });

  describe('getStats', () => {
    it('should return correct counts of tasks based on status and overdue', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      taskService.create({ title: 'Task 1', status: 'todo' });
      taskService.create({ title: 'Task 2', status: 'in_progress' });
      taskService.create({ title: 'Task 3', status: 'done' });
      taskService.create({ title: 'Task 4', status: 'todo', dueDate: pastDate.toISOString() });

      const stats = taskService.getStats();
      expect(stats.todo).toBe(2);
      expect(stats.in_progress).toBe(1);
      expect(stats.done).toBe(1);
      expect(stats.overdue).toBe(1); // Task 4 is overdue and not done
    });
  });
});
