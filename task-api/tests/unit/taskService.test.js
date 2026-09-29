const taskService = require('../../src/services/taskService');

describe('taskService (Unit Tests)', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('create()', () => {
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
      expect(new Date(task.createdAt).getTime()).not.toBeNaN();
    });

    it('should create a task with custom values', () => {
      const customData = {
        title: 'Custom Task',
        description: 'Detailed description',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2026-12-31T23:59:59.000Z',
      };
      const task = taskService.create(customData);

      expect(task.title).toBe('Custom Task');
      expect(task.description).toBe('Detailed description');
      expect(task.status).toBe('in_progress');
      expect(task.priority).toBe('high');
      expect(task.dueDate).toBe('2026-12-31T23:59:59.000Z');
    });
  });

  describe('getAll()', () => {
    it('should return an empty array when no tasks exist', () => {
      expect(taskService.getAll()).toEqual([]);
    });

    it('should return a copy of all tasks', () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });

      const tasks = taskService.getAll();
      expect(tasks).toHaveLength(2);
      expect(tasks[0].title).toBe('Task 1');
      expect(tasks[1].title).toBe('Task 2');

      // Modifying returned array should not affect internal state
      tasks.pop();
      expect(taskService.getAll()).toHaveLength(2);
    });
  });

  describe('findById()', () => {
    it('should find a task by its ID', () => {
      const created = taskService.create({ title: 'Find Me' });
      const found = taskService.findById(created.id);

      expect(found).toEqual(created);
    });

    it('should return undefined if task does not exist', () => {
      const found = taskService.findById('non-existent-uuid');
      expect(found).toBeUndefined();
    });
  });

  describe('getByStatus()', () => {
    it('should return tasks matching exact status', () => {
      taskService.create({ title: 'Task 1', status: 'todo' });
      taskService.create({ title: 'Task 2', status: 'in_progress' });
      taskService.create({ title: 'Task 3', status: 'done' });

      const inProgress = taskService.getByStatus('in_progress');
      expect(inProgress).toHaveLength(1);
      expect(inProgress[0].title).toBe('Task 2');
    });

    it('should NOT match partial status strings (Bug Test)', () => {
      taskService.create({ title: 'Task 1', status: 'in_progress' });

      // Searching for 'progress' should not match 'in_progress'
      const matched = taskService.getByStatus('progress');
      expect(matched).toHaveLength(0);
    });

    it('should return empty array when no tasks match status', () => {
      taskService.create({ title: 'Task 1', status: 'todo' });
      expect(taskService.getByStatus('done')).toEqual([]);
    });
  });

  describe('getPaginated()', () => {
    beforeEach(() => {
      for (let i = 1; i <= 5; i++) {
        taskService.create({ title: `Task ${i}` });
      }
    });

    it('should return the first page with correct items (Bug Test for page 1)', () => {
      const page1 = taskService.getPaginated(1, 2);
      expect(page1).toHaveLength(2);
      expect(page1[0].title).toBe('Task 1');
      expect(page1[1].title).toBe('Task 2');
    });

    it('should return subsequent pages accurately', () => {
      const page2 = taskService.getPaginated(2, 2);
      expect(page2).toHaveLength(2);
      expect(page2[0].title).toBe('Task 3');
      expect(page2[1].title).toBe('Task 4');

      const page3 = taskService.getPaginated(3, 2);
      expect(page3).toHaveLength(1);
      expect(page3[0].title).toBe('Task 5');
    });

    it('should return empty array when page is beyond total items', () => {
      const page4 = taskService.getPaginated(4, 2);
      expect(page4).toEqual([]);
    });
  });

  describe('update()', () => {
    it('should update task fields and return updated task', () => {
      const task = taskService.create({ title: 'Original Title', description: 'Original Desc' });
      const updated = taskService.update(task.id, {
        title: 'New Title',
        description: 'New Desc',
        priority: 'high',
      });

      expect(updated).toBeDefined();
      expect(updated.title).toBe('New Title');
      expect(updated.description).toBe('New Desc');
      expect(updated.priority).toBe('high');
      expect(taskService.findById(task.id).title).toBe('New Title');
    });

    it('should return null when updating a non-existent task', () => {
      const result = taskService.update('non-existent-id', { title: 'New' });
      expect(result).toBeNull();
    });
  });

  describe('remove()', () => {
    it('should remove an existing task and return true', () => {
      const task = taskService.create({ title: 'To Delete' });
      const success = taskService.remove(task.id);

      expect(success).toBe(true);
      expect(taskService.findById(task.id)).toBeUndefined();
      expect(taskService.getAll()).toHaveLength(0);
    });

    it('should return false when removing non-existent task', () => {
      const success = taskService.remove('fake-id');
      expect(success).toBe(false);
    });
  });

  describe('completeTask()', () => {
    it('should mark task as done and set completedAt', () => {
      const task = taskService.create({ title: 'Finish assignment' });
      const completed = taskService.completeTask(task.id);

      expect(completed).toBeDefined();
      expect(completed.status).toBe('done');
      expect(completed.completedAt).toBeDefined();
      expect(new Date(completed.completedAt).getTime()).not.toBeNaN();
    });

    it('should preserve existing task priority and NOT overwrite it to medium (Bug Test)', () => {
      const task = taskService.create({ title: 'Urgent Task', priority: 'high' });
      const completed = taskService.completeTask(task.id);

      expect(completed.priority).toBe('high');
    });

    it('should return null if task does not exist', () => {
      const result = taskService.completeTask('non-existent-id');
      expect(result).toBeNull();
    });
  });

  describe('getStats()', () => {
    it('should return counts of all statuses and overdue tasks', () => {
      const pastDate = new Date(Date.now() - 100000).toISOString();
      const futureDate = new Date(Date.now() + 100000).toISOString();

      // 1 overdue todo task
      taskService.create({ title: 'Overdue Todo', status: 'todo', dueDate: pastDate });
      // 1 overdue in_progress task
      taskService.create({ title: 'Overdue In Progress', status: 'in_progress', dueDate: pastDate });
      // 1 done task with past dueDate (should NOT count as overdue)
      taskService.create({ title: 'Completed Past Due', status: 'done', dueDate: pastDate });
      // 1 todo task with future dueDate (not overdue)
      taskService.create({ title: 'Future Todo', status: 'todo', dueDate: futureDate });
      // 1 todo task with no dueDate
      taskService.create({ title: 'No Due Date', status: 'todo', dueDate: null });

      const stats = taskService.getStats();
      expect(stats.todo).toBe(3);
      expect(stats.in_progress).toBe(1);
      expect(stats.done).toBe(1);
      expect(stats.overdue).toBe(2);
    });

    it('should return zero counts when empty', () => {
      const stats = taskService.getStats();
      expect(stats).toEqual({
        todo: 0,
        in_progress: 0,
        done: 0,
        overdue: 0,
      });
    });
  });

  describe('assignTask() [New Feature]', () => {
    it('should assign a task to an assignee and return updated task', () => {
      const task = taskService.create({ title: 'Assignee Test' });
      const assigned = taskService.assignTask(task.id, 'Alice');

      expect(assigned).toBeDefined();
      expect(assigned.assignee).toBe('Alice');
      expect(taskService.findById(task.id).assignee).toBe('Alice');
    });

    it('should reassign a task that already has an assignee', () => {
      const task = taskService.create({ title: 'Reassign Test' });
      taskService.assignTask(task.id, 'Alice');
      const reassigned = taskService.assignTask(task.id, 'Bob');

      expect(reassigned.assignee).toBe('Bob');
    });

    it('should return null when assigning non-existent task', () => {
      const result = taskService.assignTask('non-existent-id', 'Alice');
      expect(result).toBeNull();
    });
  });
});
