const taskService = require('../../src/services/taskService');

describe('taskService unit tests', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('create', () => {
    it('should create a task with default values', () => {
      const task = taskService.create({ title: 'Default Task' });

      expect(task).toBeDefined();
      expect(task.id).toBeDefined();
      expect(typeof task.id).toBe('string');
      expect(task.title).toBe('Default Task');
      expect(task.description).toBe('');
      expect(task.status).toBe('todo');
      expect(task.priority).toBe('medium');
      expect(task.dueDate).toBeNull();
      expect(task.completedAt).toBeNull();
      expect(task.createdAt).toBeDefined();
      expect(new Date(task.createdAt).getTime()).not.toBeNaN();
    });

    it('should create a task with custom values', () => {
      const dueDate = '2026-12-31T23:59:59.000Z';
      const task = taskService.create({
        title: 'Custom Task',
        description: 'Detailed description',
        status: 'in_progress',
        priority: 'high',
        dueDate,
      });

      expect(task.title).toBe('Custom Task');
      expect(task.description).toBe('Detailed description');
      expect(task.status).toBe('in_progress');
      expect(task.priority).toBe('high');
      expect(task.dueDate).toBe(dueDate);
    });
  });

  describe('getAll', () => {
    it('should return an empty array when no tasks exist', () => {
      const tasks = taskService.getAll();
      expect(tasks).toEqual([]);
    });

    it('should return all created tasks', () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });

      const tasks = taskService.getAll();
      expect(tasks).toHaveLength(2);
      expect(tasks[0].title).toBe('Task 1');
      expect(tasks[1].title).toBe('Task 2');
    });

    it('should return a copy of the tasks array, not the internal reference', () => {
      taskService.create({ title: 'Task 1' });
      const tasksCopy = taskService.getAll();
      tasksCopy.push({ title: 'Injected Task' });

      expect(taskService.getAll()).toHaveLength(1);
    });
  });

  describe('findById', () => {
    it('should find a task by id', () => {
      const created = taskService.create({ title: 'Find Me' });
      const found = taskService.findById(created.id);

      expect(found).toBeDefined();
      expect(found.id).toBe(created.id);
      expect(found.title).toBe('Find Me');
    });

    it('should return undefined when task id does not exist', () => {
      const found = taskService.findById('non-existent-uuid');
      expect(found).toBeUndefined();
    });
  });

  describe('getByStatus', () => {
    it('should return tasks matching exact status', () => {
      taskService.create({ title: 'Task 1', status: 'todo' });
      taskService.create({ title: 'Task 2', status: 'in_progress' });
      taskService.create({ title: 'Task 3', status: 'done' });

      const todos = taskService.getByStatus('todo');
      expect(todos).toHaveLength(1);
      expect(todos[0].title).toBe('Task 1');

      const inProgress = taskService.getByStatus('in_progress');
      expect(inProgress).toHaveLength(1);
      expect(inProgress[0].title).toBe('Task 2');

      const done = taskService.getByStatus('done');
      expect(done).toHaveLength(1);
      expect(done[0].title).toBe('Task 3');
    });

    it('should return an empty array when no tasks have matching status', () => {
      taskService.create({ title: 'Task 1', status: 'todo' });
      const results = taskService.getByStatus('done');
      expect(results).toEqual([]);
    });

    it('should not perform partial or substring matching', () => {
      taskService.create({ title: 'Todo Task', status: 'todo' });
      taskService.create({ title: 'Done Task', status: 'done' });

      // Substring 'do' exists in both 'todo' and 'done'
      const results = taskService.getByStatus('do');
      expect(results).toHaveLength(0);
    });
  });

  describe('getPaginated', () => {
    beforeEach(() => {
      for (let i = 1; i <= 5; i++) {
        taskService.create({ title: `Task ${i}` });
      }
    });

    it('should return the first page with correct items for page 1', () => {
      const page1 = taskService.getPaginated(1, 2);
      expect(page1).toHaveLength(2);
      expect(page1[0].title).toBe('Task 1');
      expect(page1[1].title).toBe('Task 2');
    });

    it('should return the second page with correct items for page 2', () => {
      const page2 = taskService.getPaginated(2, 2);
      expect(page2).toHaveLength(2);
      expect(page2[0].title).toBe('Task 3');
      expect(page2[1].title).toBe('Task 4');
    });

    it('should return the remaining items on the last page', () => {
      const page3 = taskService.getPaginated(3, 2);
      expect(page3).toHaveLength(1);
      expect(page3[0].title).toBe('Task 5');
    });

    it('should return an empty array when page is out of range', () => {
      const page4 = taskService.getPaginated(4, 2);
      expect(page4).toEqual([]);
    });
  });

  describe('getStats', () => {
    it('should return zero counts when no tasks exist', () => {
      const stats = taskService.getStats();
      expect(stats).toEqual({
        todo: 0,
        in_progress: 0,
        done: 0,
        overdue: 0,
      });
    });

    it('should accurately count tasks by status', () => {
      taskService.create({ title: 'T1', status: 'todo' });
      taskService.create({ title: 'T2', status: 'todo' });
      taskService.create({ title: 'T3', status: 'in_progress' });
      taskService.create({ title: 'T4', status: 'done' });

      const stats = taskService.getStats();
      expect(stats.todo).toBe(2);
      expect(stats.in_progress).toBe(1);
      expect(stats.done).toBe(1);
      expect(stats.overdue).toBe(0);
    });

    it('should count overdue tasks when dueDate is in the past and status is not done', () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString();
      const futureDate = new Date(Date.now() + 86400000).toISOString();

      taskService.create({ title: 'Overdue Todo', status: 'todo', dueDate: pastDate });
      taskService.create({ title: 'Overdue In Progress', status: 'in_progress', dueDate: pastDate });
      taskService.create({ title: 'Completed Past Due', status: 'done', dueDate: pastDate });
      taskService.create({ title: 'Future Task', status: 'todo', dueDate: futureDate });
      taskService.create({ title: 'No Due Date', status: 'todo', dueDate: null });

      const stats = taskService.getStats();
      expect(stats.overdue).toBe(2);
    });
  });

  describe('update', () => {
    it('should update task fields successfully', () => {
      const task = taskService.create({ title: 'Old Title', priority: 'low' });
      const updated = taskService.update(task.id, {
        title: 'New Title',
        priority: 'high',
        description: 'Updated desc',
      });

      expect(updated).toBeDefined();
      expect(updated.title).toBe('New Title');
      expect(updated.priority).toBe('high');
      expect(updated.description).toBe('Updated desc');

      const found = taskService.findById(task.id);
      expect(found.title).toBe('New Title');
    });

    it('should return null when updating a non-existent task', () => {
      const result = taskService.update('non-existent-id', { title: 'Test' });
      expect(result).toBeNull();
    });

    it('should not allow overwriting immutable id and createdAt fields', () => {
      const task = taskService.create({ title: 'Original' });
      const originalCreatedAt = task.createdAt;

      const updated = taskService.update(task.id, {
        id: 'new-injected-id',
        createdAt: '2020-01-01T00:00:00.000Z',
        title: 'Updated Title',
      });

      expect(updated.id).toBe(task.id);
      expect(updated.createdAt).toBe(originalCreatedAt);
      expect(updated.title).toBe('Updated Title');
      expect(taskService.findById(task.id)).toBeDefined();
      expect(taskService.findById('new-injected-id')).toBeUndefined();
    });
  });

  describe('remove', () => {
    it('should remove a task and return true', () => {
      const task = taskService.create({ title: 'To Delete' });
      const removed = taskService.remove(task.id);

      expect(removed).toBe(true);
      expect(taskService.findById(task.id)).toBeUndefined();
      expect(taskService.getAll()).toHaveLength(0);
    });

    it('should return false when removing a non-existent task', () => {
      const removed = taskService.remove('non-existent-id');
      expect(removed).toBe(false);
    });
  });

  describe('completeTask', () => {
    it('should mark task as done and set completedAt', () => {
      const task = taskService.create({ title: 'Complete Me' });
      const beforeTime = new Date().toISOString();

      const completed = taskService.completeTask(task.id);

      expect(completed).toBeDefined();
      expect(completed.status).toBe('done');
      expect(completed.completedAt).toBeDefined();
      expect(new Date(completed.completedAt).getTime()).toBeGreaterThanOrEqual(new Date(beforeTime).getTime());
    });

    it('should preserve original priority when completed', () => {
      const highTask = taskService.create({ title: 'High Priority Task', priority: 'high' });
      const lowTask = taskService.create({ title: 'Low Priority Task', priority: 'low' });

      const completedHigh = taskService.completeTask(highTask.id);
      const completedLow = taskService.completeTask(lowTask.id);

      expect(completedHigh.priority).toBe('high');
      expect(completedLow.priority).toBe('low');
    });

    it('should return null when completing a non-existent task', () => {
      const result = taskService.completeTask('non-existent-id');
      expect(result).toBeNull();
    });
  });

  describe('assignTask', () => {
    it('should assign a user to an unassigned task', () => {
      const task = taskService.create({ title: 'Task to assign' });
      const assigned = taskService.assignTask(task.id, 'Alice');

      expect(assigned).toBeDefined();
      expect(assigned.assignee).toBe('Alice');

      const found = taskService.findById(task.id);
      expect(found.assignee).toBe('Alice');
    });

    it('should allow reassigning a task to a different user', () => {
      const task = taskService.create({ title: 'Task to reassign' });
      taskService.assignTask(task.id, 'Alice');

      const reassigned = taskService.assignTask(task.id, 'Bob');
      expect(reassigned.assignee).toBe('Bob');

      const found = taskService.findById(task.id);
      expect(found.assignee).toBe('Bob');
    });

    it('should return null when assigning a non-existent task', () => {
      const result = taskService.assignTask('non-existent-id', 'Alice');
      expect(result).toBeNull();
    });
  });

  describe('_reset', () => {
    it('should empty all stored tasks', () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });
      expect(taskService.getAll()).toHaveLength(2);

      taskService._reset();
      expect(taskService.getAll()).toHaveLength(0);
    });
  });
});
