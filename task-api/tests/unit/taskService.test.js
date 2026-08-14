const taskService = require('../../src/services/taskService');

describe('Task Service Unit Tests', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('create', () => {
    it('should create a task with default parameters', () => {
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
      expect(isNaN(Date.parse(task.createdAt))).toBe(false);
    });

    it('should create a task with custom parameters', () => {
      const dueDate = new Date().toISOString();
      const task = taskService.create({
        title: 'Custom Task',
        description: 'Custom Desc',
        status: 'in_progress',
        priority: 'high',
        dueDate,
      });
      expect(task.title).toBe('Custom Task');
      expect(task.description).toBe('Custom Desc');
      expect(task.status).toBe('in_progress');
      expect(task.priority).toBe('high');
      expect(task.dueDate).toBe(dueDate);
    });
  });

  describe('getAll', () => {
    it('should return empty list when no tasks exist', () => {
      expect(taskService.getAll()).toEqual([]);
    });

    it('should return all tasks', () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });
      const all = taskService.getAll();
      expect(all.length).toBe(2);
      expect(all[0].title).toBe('Task 1');
      expect(all[1].title).toBe('Task 2');
    });

    it('should return a shallow copy of the tasks array', () => {
      const original = taskService.getAll();
      original.push({ id: 'dummy' });
      expect(taskService.getAll().length).toBe(0);
    });
  });

  describe('findById', () => {
    it('should return the correct task by ID', () => {
      const created = taskService.create({ title: 'Find Me' });
      const found = taskService.findById(created.id);
      expect(found).toBeDefined();
      expect(found.id).toBe(created.id);
      expect(found.title).toBe('Find Me');
    });

    it('should return undefined for non-existent ID', () => {
      expect(taskService.findById('does-not-exist')).toBeUndefined();
    });
  });

  describe('getByStatus', () => {
    it('should return tasks filtering by status exactly', () => {
      taskService.create({ title: 'Task 1', status: 'todo' });
      taskService.create({ title: 'Task 2', status: 'in_progress' });
      taskService.create({ title: 'Task 3', status: 'done' });

      const todos = taskService.getByStatus('todo');
      expect(todos.length).toBe(1);
      expect(todos[0].title).toBe('Task 1');
    });

    it('should not match status by substring (exact match only)', () => {
      taskService.create({ title: 'Task 1', status: 'todo' });
      taskService.create({ title: 'Task 2', status: 'in_progress' });
      taskService.create({ title: 'Task 3', status: 'done' });

      // Exact match only, so partial queries should return empty
      const inProgressSub = taskService.getByStatus('progress');
      expect(inProgressSub.length).toBe(0);

      const doSub = taskService.getByStatus('do');
      expect(doSub.length).toBe(0);
    });
  });

  describe('getPaginated', () => {
    it('should get correct tasks for first page', () => {
      // Create 15 tasks
      for (let i = 0; i < 15; i++) {
        taskService.create({ title: `Task ${i}` });
      }

      // Assert behavior for page=1, limit=10
      // Expected: first 10 tasks (index 0 to 9)
      const page1 = taskService.getPaginated(1, 10);
      expect(page1.length).toBe(10);
      expect(page1[0].title).toBe('Task 0');
      expect(page1[9].title).toBe('Task 9');
    });

    it('should return correct tasks for page 2', () => {
      for (let i = 0; i < 15; i++) {
        taskService.create({ title: `Task ${i}` });
      }
      // Expected: last 5 tasks (index 10 to 14)
      const page2 = taskService.getPaginated(2, 10);
      expect(page2.length).toBe(5);
      expect(page2[0].title).toBe('Task 10');
      expect(page2[4].title).toBe('Task 14');
    });
  });

  describe('getStats', () => {
    it('should return correct counts and overdue calculation', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      // 1 done task (past due date, should not count as overdue)
      taskService.create({ title: 'Done Past', status: 'done', dueDate: pastDate.toISOString() });
      // 1 todo task (past due date, SHOULD count as overdue)
      taskService.create({ title: 'Todo Past', status: 'todo', dueDate: pastDate.toISOString() });
      // 1 in_progress task (future due date, should not count as overdue)
      taskService.create({ title: 'IP Future', status: 'in_progress', dueDate: futureDate.toISOString() });
      // 1 todo task (no due date, should not count as overdue)
      taskService.create({ title: 'No Due', status: 'todo' });

      const stats = taskService.getStats();
      expect(stats.todo).toBe(2);
      expect(stats.in_progress).toBe(1);
      expect(stats.done).toBe(1);
      expect(stats.overdue).toBe(1);
    });
  });

  describe('update', () => {
    it('should update task fields successfully', () => {
      const task = taskService.create({ title: 'Original Title', priority: 'low' });
      const updated = taskService.update(task.id, { title: 'Updated Title', priority: 'high' });

      expect(updated).toBeDefined();
      expect(updated.title).toBe('Updated Title');
      expect(updated.priority).toBe('high');

      const found = taskService.findById(task.id);
      expect(found.title).toBe('Updated Title');
    });

    it('should return null when updating a non-existent task', () => {
      const result = taskService.update('non-existent', { title: 'New' });
      expect(result).toBeNull();
    });

    it('should protect read-only fields from being overwritten', () => {
      const task = taskService.create({ title: 'Read-only Test' });
      const initialId = task.id;
      const initialCreatedAt = task.createdAt;

      const updated = taskService.update(task.id, {
        id: 'new-id-attempt',
        createdAt: '2020-01-01T00:00:00.000Z',
      });

      // Assert that read-only fields are protected and not overwritten
      expect(updated.id).toBe(initialId);
      expect(updated.createdAt).toBe(initialCreatedAt);
    });
  });

  describe('remove', () => {
    it('should remove an existing task and return true', () => {
      const task = taskService.create({ title: 'Delete Me' });
      const result = taskService.remove(task.id);
      expect(result).toBe(true);
      expect(taskService.findById(task.id)).toBeUndefined();
    });

    it('should return false when removing non-existent task', () => {
      const result = taskService.remove('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('completeTask', () => {
    it('should mark a task as done and preserve priority', () => {
      const task = taskService.create({ title: 'Task to Complete', priority: 'high' });
      const completed = taskService.completeTask(task.id);

      expect(completed).toBeDefined();
      expect(completed.status).toBe('done');
      expect(completed.completedAt).toBeDefined();
      expect(isNaN(Date.parse(completed.completedAt))).toBe(false);
      // Wait, is priority preserved? Or did it change to medium?
      expect(completed.priority).toBe('high');
    });

    it('should return null when completing non-existent task', () => {
      const result = taskService.completeTask('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('assignTask', () => {
    it('should assign a task to a user and preserve existing fields', () => {
      const task = taskService.create({ title: 'Task to Assign', priority: 'high', description: 'Some text' });
      const assigned = taskService.assignTask(task.id, 'Omer');

      expect(assigned).toBeDefined();
      expect(assigned.assignee).toBe('Omer');
      expect(assigned.title).toBe('Task to Assign');
      expect(assigned.priority).toBe('high');
      expect(assigned.description).toBe('Some text');
    });

    it('should return null for non-existent task', () => {
      const result = taskService.assignTask('non-existent', 'Omer');
      expect(result).toBeNull();
    });

    it('should allow idempotent reassignment to the same assignee', () => {
      const task = taskService.create({ title: 'Assignee Test' });
      const assigned1 = taskService.assignTask(task.id, 'Omer');
      const assigned2 = taskService.assignTask(task.id, 'Omer');

      expect(assigned2.assignee).toBe('Omer');
    });

    it('should return conflict if task is already assigned to a different assignee', () => {
      const task = taskService.create({ title: 'Conflict Assignee Test' });
      taskService.assignTask(task.id, 'Alice');

      const result = taskService.assignTask(task.id, 'Omer');
      expect(result.conflict).toBe(true);
      expect(result.currentAssignee).toBe('Alice');
    });
  });
});
