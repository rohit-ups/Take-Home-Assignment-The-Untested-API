const taskService = require('../src/services/taskService');

describe('taskService', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('getAll', () => {
    it('should return an empty array when no tasks exist', () => {
      const tasks = taskService.getAll();
      expect(tasks).toEqual([]);
    });

    it('should return all tasks', () => {
      const task1 = taskService.create({ title: 'Task 1' });
      const task2 = taskService.create({ title: 'Task 2' });
      
      const tasks = taskService.getAll();
      expect(tasks).toHaveLength(2);
      expect(tasks).toContainEqual(task1);
      expect(tasks).toContainEqual(task2);
    });

    it('should return a copy of the tasks array', () => {
      const task = taskService.create({ title: 'Task 1' });
      const tasks = taskService.getAll();
      
      tasks.push({ id: 'fake' });
      
      const tasksAgain = taskService.getAll();
      expect(tasksAgain).toHaveLength(1);
    });
  });

  describe('findById', () => {
    it('should return undefined when task does not exist', () => {
      const task = taskService.findById('non-existent-id');
      expect(task).toBeUndefined();
    });

    it('should return the task when it exists', () => {
      const createdTask = taskService.create({ title: 'Task 1' });
      const foundTask = taskService.findById(createdTask.id);
      
      expect(foundTask).toEqual(createdTask);
    });
  });

  describe('getByStatus', () => {
    it('should return empty array when no tasks match status', () => {
      taskService.create({ title: 'Task 1', status: 'todo' });
      const tasks = taskService.getByStatus('done');
      expect(tasks).toEqual([]);
    });

    it('should return tasks matching the status', () => {
      taskService.create({ title: 'Task 1', status: 'todo' });
      taskService.create({ title: 'Task 2', status: 'in_progress' });
      taskService.create({ title: 'Task 3', status: 'todo' });
      
      const todoTasks = taskService.getByStatus('todo');
      expect(todoTasks).toHaveLength(2);
    });

    it('should be case-sensitive', () => {
      taskService.create({ title: 'Task 1', status: 'todo' });
      const tasks = taskService.getByStatus('TODO');
      expect(tasks).toEqual([]);
    });

    it('should match partial status strings', () => {
      taskService.create({ title: 'Task 1', status: 'in_progress' });
      const tasks = taskService.getByStatus('progress');
      expect(tasks).toHaveLength(1);
    });
  });

  describe('getPaginated', () => {
    beforeEach(() => {
      for (let i = 1; i <= 25; i++) {
        taskService.create({ title: `Task ${i}` });
      }
    });

    it('should return correct page with default limit', () => {
      const page1 = taskService.getPaginated(1, 10);
      expect(page1).toHaveLength(10);
      expect(page1[0].title).toBe('Task 1');
    });

    it('should return correct page with custom limit', () => {
      const page1 = taskService.getPaginated(1, 5);
      expect(page1).toHaveLength(5);
    });

    it('should return second page correctly', () => {
      const page1 = taskService.getPaginated(1, 10);
      const page2 = taskService.getPaginated(2, 10);
      
      expect(page1).not.toEqual(page2);
    });

    it('should return empty array when page is beyond data', () => {
      const page = taskService.getPaginated(10, 10);
      expect(page).toEqual([]);
    });

    it('should handle page 0 by returning empty array', () => {
      const page0 = taskService.getPaginated(0, 10);
      expect(page0).toHaveLength(0);
    });

    it('should return fewer items on last page', () => {
      const page3 = taskService.getPaginated(3, 10);
      expect(page3).toHaveLength(5);
    });
  });

  describe('getStats', () => {
    it('should return zero counts when no tasks exist', () => {
      const stats = taskService.getStats();
      expect(stats).toEqual({
        todo: 0,
        in_progress: 0,
        done: 0,
        overdue: 0
      });
    });

    it('should count tasks by status correctly', () => {
      taskService.create({ title: 'Task 1', status: 'todo' });
      taskService.create({ title: 'Task 2', status: 'todo' });
      taskService.create({ title: 'Task 3', status: 'in_progress' });
      taskService.create({ title: 'Task 4', status: 'done' });
      
      const stats = taskService.getStats();
      expect(stats.todo).toBe(2);
      expect(stats.in_progress).toBe(1);
      expect(stats.done).toBe(1);
    });

    it('should count overdue tasks correctly', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);
      
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);
      
      taskService.create({ 
        title: 'Overdue task', 
        status: 'todo',
        dueDate: pastDate.toISOString()
      });
      
      taskService.create({ 
        title: 'Future task', 
        status: 'todo',
        dueDate: futureDate.toISOString()
      });
      
      taskService.create({ 
        title: 'Done task with past due date', 
        status: 'done',
        dueDate: pastDate.toISOString()
      });
      
      const stats = taskService.getStats();
      expect(stats.overdue).toBe(1);
    });

    it('should not count tasks without due dates as overdue', () => {
      taskService.create({ title: 'Task without due date', status: 'todo' });
      
      const stats = taskService.getStats();
      expect(stats.overdue).toBe(0);
    });
  });

  describe('create', () => {
    it('should create a task with required fields', () => {
      const task = taskService.create({ title: 'Test Task' });
      
      expect(task).toHaveProperty('id');
      expect(task).toHaveProperty('title', 'Test Task');
      expect(task).toHaveProperty('description', '');
      expect(task).toHaveProperty('status', 'todo');
      expect(task).toHaveProperty('priority', 'medium');
      expect(task).toHaveProperty('dueDate', null);
      expect(task).toHaveProperty('completedAt', null);
      expect(task).toHaveProperty('createdAt');
    });

    it('should create a task with custom fields', () => {
      const dueDate = new Date().toISOString();
      const task = taskService.create({ 
        title: 'Custom Task',
        description: 'Description',
        status: 'in_progress',
        priority: 'high',
        dueDate: dueDate
      });
      
      expect(task.title).toBe('Custom Task');
      expect(task.description).toBe('Description');
      expect(task.status).toBe('in_progress');
      expect(task.priority).toBe('high');
      expect(task.dueDate).toBe(dueDate);
    });

    it('should generate unique IDs', () => {
      const task1 = taskService.create({ title: 'Task 1' });
      const task2 = taskService.create({ title: 'Task 2' });
      
      expect(task1.id).not.toBe(task2.id);
    });

    it('should create ISO string for createdAt', () => {
      const task = taskService.create({ title: 'Task' });
      expect(() => new Date(task.createdAt)).not.toThrow();
    });
  });

  describe('update', () => {
    it('should return null when task does not exist', () => {
      const result = taskService.update('non-existent-id', { title: 'Updated' });
      expect(result).toBeNull();
    });

    it('should update task fields', () => {
      const task = taskService.create({ title: 'Original' });
      const updated = taskService.update(task.id, { title: 'Updated' });
      
      expect(updated.title).toBe('Updated');
      expect(updated.id).toBe(task.id);
    });

    it('should update multiple fields', () => {
      const task = taskService.create({ title: 'Original' });
      const updated = taskService.update(task.id, { 
        title: 'Updated',
        status: 'done',
        priority: 'high'
      });
      
      expect(updated.title).toBe('Updated');
      expect(updated.status).toBe('done');
      expect(updated.priority).toBe('high');
    });

    it('should preserve original fields not being updated', () => {
      const task = taskService.create({ 
        title: 'Original',
        description: 'Original description'
      });
      const updated = taskService.update(task.id, { title: 'Updated' });
      
      expect(updated.description).toBe('Original description');
    });
  });

  describe('remove', () => {
    it('should return false when task does not exist', () => {
      const result = taskService.remove('non-existent-id');
      expect(result).toBe(false);
    });

    it('should return true when task is removed', () => {
      const task = taskService.create({ title: 'Task' });
      const result = taskService.remove(task.id);
      expect(result).toBe(true);
    });

    it('should actually remove the task', () => {
      const task = taskService.create({ title: 'Task' });
      taskService.remove(task.id);
      
      const found = taskService.findById(task.id);
      expect(found).toBeUndefined();
    });

    it('should remove only the specified task', () => {
      const task1 = taskService.create({ title: 'Task 1' });
      const task2 = taskService.create({ title: 'Task 2' });
      
      taskService.remove(task1.id);
      
      expect(taskService.findById(task2.id)).toEqual(task2);
    });
  });

  describe('completeTask', () => {
    it('should return null when task does not exist', () => {
      const result = taskService.completeTask('non-existent-id');
      expect(result).toBeNull();
    });

    it('should mark task as done', () => {
      const task = taskService.create({ title: 'Task', status: 'todo' });
      const completed = taskService.completeTask(task.id);
      
      expect(completed.status).toBe('done');
    });

    it('should set completedAt timestamp', () => {
      const task = taskService.create({ title: 'Task' });
      const completed = taskService.completeTask(task.id);
      
      expect(completed.completedAt).toBeTruthy();
      expect(() => new Date(completed.completedAt)).not.toThrow();
    });

    it('should reset priority to medium', () => {
      const task = taskService.create({ title: 'Task', priority: 'high' });
      const completed = taskService.completeTask(task.id);
      
      expect(completed.priority).toBe('medium');
    });

    it('should preserve other fields', () => {
      const task = taskService.create({ 
        title: 'Task',
        description: 'Description',
        dueDate: new Date().toISOString()
      });
      const completed = taskService.completeTask(task.id);
      
      expect(completed.title).toBe('Task');
      expect(completed.description).toBe('Description');
      expect(completed.dueDate).toBeTruthy();
    });
  });

  describe('assignTask', () => {
    it('should return null when task does not exist', () => {
      const result = taskService.assignTask('non-existent-id', 'John Doe');
      expect(result).toBeNull();
    });

    it('should assign a task to a person', () => {
      const task = taskService.create({ title: 'Task' });
      const assigned = taskService.assignTask(task.id, 'John Doe');
      
      expect(assigned.assignee).toBe('John Doe');
    });

    it('should preserve other fields when assigning', () => {
      const task = taskService.create({ 
        title: 'Task',
        description: 'Description',
        status: 'in_progress',
        priority: 'high'
      });
      const assigned = taskService.assignTask(task.id, 'Jane Smith');
      
      expect(assigned.title).toBe('Task');
      expect(assigned.description).toBe('Description');
      expect(assigned.status).toBe('in_progress');
      expect(assigned.priority).toBe('high');
    });

    it('should allow reassigning a task', () => {
      const task = taskService.create({ title: 'Task' });
      taskService.assignTask(task.id, 'John Doe');
      
      const reassigned = taskService.assignTask(task.id, 'Jane Smith');
      expect(reassigned.assignee).toBe('Jane Smith');
    });

    it('should handle assignee with spaces', () => {
      const task = taskService.create({ title: 'Task' });
      const assigned = taskService.assignTask(task.id, 'John Doe Jr.');
      
      expect(assigned.assignee).toBe('John Doe Jr.');
    });
  });
});
