const taskService = require('../src/services/taskService');

describe('taskService (Unit Tests)', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('create', () => {
    it('create a task with default values and generate id/createdAt', () => {
      const task = taskService.create({ title: 'Test Task' });

      expect(task.id).toBeDefined();
      expect(task.title).toBe('Test Task');
      expect(task.description).toBe('');
      expect(task.status).toBe('todo');
      expect(task.priority).toBe('medium');
      expect(task.dueDate).toBeNull();
      expect(task.completedAt).toBeNull();
      expect(task.createdAt).toBeDefined();
      expect(new Date(task.createdAt).toISOString()).toBe(task.createdAt);
    });

    it('create unique UUIDs for each task created', () => {
      const task1 = taskService.create({ title: 'Task 1' });
      const task2 = taskService.create({ title: 'Task 2' });
      const task3 = taskService.create({ title: 'Task 3' });

      expect(task1.id).not.toBe(task2.id);
      expect(task2.id).not.toBe(task3.id);
      expect(task1.id).not.toBe(task3.id);
    });

    it('should create a task with custom fields and retain them', () => {
      const task = taskService.create({
        title: 'Custom Task',
        description: 'Details here',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2026-12-31T23:59:59.000Z',
      });

      expect(task.title).toBe('Custom Task');
      expect(task.description).toBe('Details here');
      expect(task.status).toBe('in_progress');
      expect(task.priority).toBe('high');
      expect(task.dueDate).toBe('2026-12-31T23:59:59.000Z');
    });

    it('should default description to empty string if undefined or omitted', () => {
      const task = taskService.create({ title: 'No description' });
      expect(task.description).toBe('');
    });
  });

  describe('getAll', () => {
    it('should return an empty array when no tasks exist', () => {
      const all = taskService.getAll();
      expect(all).toEqual([]);
      expect(all).toHaveLength(0);
    });

    it('should return all created tasks', () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });

      const all = taskService.getAll();
      expect(all).toHaveLength(2);
      expect(all[0].title).toBe('Task 1');
      expect(all[1].title).toBe('Task 2');
    });

    it('should return a shallow copy to prevent external array mutations', () => {
      taskService.create({ title: 'Task 1' });
      const copy = taskService.getAll();
      copy.pop();
      expect(taskService.getAll()).toHaveLength(1);
    });
  });

  describe('findById', () => {
    it('should return the correct task by its id', () => {
      const created = taskService.create({ title: 'Find Me' });
      const found = taskService.findById(created.id);
      expect(found).toEqual(created);
    });

    it('should return undefined when id does not exist', () => {
      const notFound = taskService.findById('non-existent-id');
      expect(notFound).toBeUndefined();
    });

    it('should return undefined when searching with null or undefined id', () => {
      expect(taskService.findById(null)).toBeUndefined();
      expect(taskService.findById(undefined)).toBeUndefined();
    });
  });

  describe('getByStatus', () => {
    it('should filter tasks strictly by exact status', () => {
      taskService.create({ title: 'T1', status: 'todo' });
      taskService.create({ title: 'T2', status: 'in_progress' });
      taskService.create({ title: 'T3', status: 'done' });

      const todos = taskService.getByStatus('todo');
      expect(todos).toHaveLength(1);
      expect(todos[0].title).toBe('T1');

      const inProgress = taskService.getByStatus('in_progress');
      expect(inProgress).toHaveLength(1);
      expect(inProgress[0].title).toBe('T2');

      const dones = taskService.getByStatus('done');
      expect(dones).toHaveLength(1);
      expect(dones[0].title).toBe('T3');
    });

    it('should return empty array if no tasks match', () => {
      taskService.create({ title: 'T1', status: 'todo' });
      expect(taskService.getByStatus('done')).toHaveLength(0);
    });

    it('should NOT match partial substrings (verifying Bug 3 fix)', () => {
      taskService.create({ title: 'T1', status: 'in_progress' });
      taskService.create({ title: 'T2', status: 'todo' });

      expect(taskService.getByStatus('progress')).toHaveLength(0);
      expect(taskService.getByStatus('do')).toHaveLength(0);
      expect(taskService.getByStatus('in')).toHaveLength(0);
    });

    it('should return empty array on empty store', () => {
      expect(taskService.getByStatus('todo')).toEqual([]);
    });
  });

  describe('getPaginated', () => {
    beforeEach(() => {
      for (let i = 1; i <= 15; i++) {
        taskService.create({ title: `Task ${i}` });
      }
    });

    it('should return the first page correctly (1-based pagination)', () => {
      const page1 = taskService.getPaginated(1, 10);
      expect(page1).toHaveLength(10);
      expect(page1[0].title).toBe('Task 1');
      expect(page1[9].title).toBe('Task 10');
    });

    it('should return subsequent pages correctly', () => {
      const page2 = taskService.getPaginated(2, 10);
      expect(page2).toHaveLength(5);
      expect(page2[0].title).toBe('Task 11');
      expect(page2[4].title).toBe('Task 15');
    });

    it('should handle edge cases like page < 1 (defaults safely to page 1)', () => {
      const pageZero = taskService.getPaginated(0, 5);
      expect(pageZero).toHaveLength(5);
      expect(pageZero[0].title).toBe('Task 1');

      const pageNegative = taskService.getPaginated(-3, 5);
      expect(pageNegative).toHaveLength(5);
      expect(pageNegative[0].title).toBe('Task 1');
    });

    it('should handle page number beyond available items by returning empty array', () => {
      const pageOutOfRange = taskService.getPaginated(10, 10);
      expect(pageOutOfRange).toHaveLength(0);
    });

    it('should handle string parameters for page and limit', () => {
      const result = taskService.getPaginated('2', '5');
      expect(result).toHaveLength(5);
      expect(result[0].title).toBe('Task 6');
    });

    it('should support passing a custom filtered task array', () => {
      const customList = [
        { id: '1', title: 'Filtered 1' },
        { id: '2', title: 'Filtered 2' },
        { id: '3', title: 'Filtered 3' },
      ];
      const result = taskService.getPaginated(1, 2, customList);
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Filtered 1');
      expect(result[1].title).toBe('Filtered 2');
    });
  });

  describe('getStats', () => {
    it('should return all zeros on empty store', () => {
      const stats = taskService.getStats();
      expect(stats).toEqual({
        todo: 0,
        in_progress: 0,
        done: 0,
        overdue: 0,
      });
    });

    it('should accurately calculate status counts and overdue counts', () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString();
      const futureDate = new Date(Date.now() + 86400000).toISOString();

      taskService.create({ title: 'Todo Overdue', status: 'todo', dueDate: pastDate });
      taskService.create({ title: 'Todo Normal', status: 'todo', dueDate: futureDate });
      taskService.create({ title: 'In Progress Overdue', status: 'in_progress', dueDate: pastDate });
      taskService.create({ title: 'Done Overdue', status: 'done', dueDate: pastDate });

      const stats = taskService.getStats();
      expect(stats.todo).toBe(2);
      expect(stats.in_progress).toBe(1);
      expect(stats.done).toBe(1);
      expect(stats.overdue).toBe(2);
    });

    it('should not mark tasks with null or future due dates as overdue', () => {
      const future = new Date(Date.now() + 1000000).toISOString();
      taskService.create({ title: 'No due date', dueDate: null });
      taskService.create({ title: 'Future due date', dueDate: future });

      const stats = taskService.getStats();
      expect(stats.overdue).toBe(0);
    });
  });

  describe('update', () => {
    it('should update allowed fields on an existing task', () => {
      const task = taskService.create({ title: 'Original', description: 'Desc' });
      const updated = taskService.update(task.id, { title: 'Updated Title', description: 'New Desc' });

      expect(updated.title).toBe('Updated Title');
      expect(updated.description).toBe('New Desc');
    });

    it('should preserve unmodified fields during partial update', () => {
      const task = taskService.create({
        title: 'Original',
        description: 'Original Desc',
        priority: 'high',
      });

      const updated = taskService.update(task.id, { description: 'Only Desc Changed' });
      expect(updated.title).toBe('Original');
      expect(updated.priority).toBe('high');
      expect(updated.description).toBe('Only Desc Changed');
    });

    it('should not allow overwriting immutable fields like id or createdAt', () => {
      const task = taskService.create({ title: 'Immutable Test' });
      const originalId = task.id;
      const originalCreatedAt = task.createdAt;

      const updated = taskService.update(task.id, {
        id: 'tampered-id',
        createdAt: '1999-01-01T00:00:00.000Z',
        title: 'Safe Update',
      });

      expect(updated.id).toBe(originalId);
      expect(updated.createdAt).toBe(originalCreatedAt);
      expect(updated.title).toBe('Safe Update');
    });

    it('should return null when updating a non-existent task', () => {
      const result = taskService.update('non-existent-id', { title: 'No task' });
      expect(result).toBeNull();
    });

    it('should update priority to low or high', () => {
      const task = taskService.create({ title: 'Task', priority: 'medium' });
      const updated = taskService.update(task.id, { priority: 'low' });
      expect(updated.priority).toBe('low');
    });
  });

  describe('remove', () => {
    it('should delete a task and return true', () => {
      const task = taskService.create({ title: 'To Delete' });
      const deleted = taskService.remove(task.id);

      expect(deleted).toBe(true);
      expect(taskService.findById(task.id)).toBeUndefined();
    });

    it('should return false if task does not exist', () => {
      const deleted = taskService.remove('fake-id');
      expect(deleted).toBe(false);
    });

    it('should delete only the targeted task when multiple tasks exist', () => {
      const t1 = taskService.create({ title: 'Task 1' });
      const t2 = taskService.create({ title: 'Task 2' });
      const t3 = taskService.create({ title: 'Task 3' });

      taskService.remove(t2.id);

      expect(taskService.getAll()).toHaveLength(2);
      expect(taskService.findById(t1.id)).toBeDefined();
      expect(taskService.findById(t2.id)).toBeUndefined();
      expect(taskService.findById(t3.id)).toBeDefined();
    });

    it('should return false on second removal attempt of the same id', () => {
      const task = taskService.create({ title: 'Remove twice' });
      expect(taskService.remove(task.id)).toBe(true);
      expect(taskService.remove(task.id)).toBe(false);
    });
  });

  describe('completeTask', () => {
    it('should mark task as done and set completedAt while preserving high priority', () => {
      const task = taskService.create({ title: 'High Priority Task', priority: 'high' });
      const completed = taskService.completeTask(task.id);

      expect(completed.status).toBe('done');
      expect(completed.completedAt).toBeDefined();
      expect(completed.priority).toBe('high');
    });

    it('should preserve low priority when completed', () => {
      const task = taskService.create({ title: 'Low Priority Task', priority: 'low' });
      const completed = taskService.completeTask(task.id);

      expect(completed.status).toBe('done');
      expect(completed.priority).toBe('low');
    });

    it('should update completedAt timestamp if called again on already completed task', () => {
      const task = taskService.create({ title: 'Task' });
      const firstComplete = taskService.completeTask(task.id);
      const firstTimestamp = firstComplete.completedAt;

      const secondComplete = taskService.completeTask(task.id);
      expect(secondComplete.status).toBe('done');
      expect(secondComplete.completedAt).toBeDefined();
    });

    it('should return null if task does not exist', () => {
      const result = taskService.completeTask('fake-id');
      expect(result).toBeNull();
    });
  });

  describe('assignTask', () => {
    it('should assign a user to the task and trim leading/trailing whitespace', () => {
      const task = taskService.create({ title: 'Unassigned Task' });
      const assigned = taskService.assignTask(task.id, '  Alice Smith  ');

      expect(assigned.assignee).toBe('Alice Smith');
    });

    it('should trim tabs and newlines from assignee name', () => {
      const task = taskService.create({ title: 'Task with whitespace' });
      const assigned = taskService.assignTask(task.id, '\t\nBob Dylan\n\t');

      expect(assigned.assignee).toBe('Bob Dylan');
    });

    it('should support international and unicode names', () => {
      const task = taskService.create({ title: 'Unicode Task' });
      const assigned = taskService.assignTask(task.id, 'René Müller');

      expect(assigned.assignee).toBe('René Müller');
    });

    it('should allow reassigning a task to another user', () => {
      const task = taskService.create({ title: 'Reassign Task' });
      taskService.assignTask(task.id, 'Alice');
      const reassigned = taskService.assignTask(task.id, 'Bob');

      expect(reassigned.assignee).toBe('Bob');
    });

    it('should return null if task does not exist', () => {
      const result = taskService.assignTask('fake-id', 'Alice');
      expect(result).toBeNull();
    });
  });

  describe('_reset', () => {
    it('should reset tasks array back to empty', () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });
      expect(taskService.getAll()).toHaveLength(2);

      taskService._reset();
      expect(taskService.getAll()).toHaveLength(0);
    });

    it('should succeed even when called multiple times consecutively', () => {
      taskService._reset();
      taskService._reset();
      expect(taskService.getAll()).toEqual([]);
    });
  });
});
