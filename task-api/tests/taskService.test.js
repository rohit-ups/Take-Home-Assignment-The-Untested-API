const taskService = require('../src/services/taskService');

describe('taskService', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('create', () => {
    it('should create a task with default values', () => {
      const task = taskService.create({ title: 'Test Task' });

      expect(task).toBeDefined();
      expect(task.id).toBeDefined();
      expect(typeof task.id).toBe('string');
      expect(task.title).toBe('Test Task');
      expect(task.description).toBe('');
      expect(task.status).toBe('todo');
      expect(task.priority).toBe('medium');
      expect(task.dueDate).toBeNull();
      expect(task.assignee).toBeNull();
      expect(task.completedAt).toBeNull();
      expect(task.createdAt).toBeDefined();
      expect(isNaN(Date.parse(task.createdAt))).toBe(false);
    });

    it('should create a task with all custom fields provided', () => {
      const dueDate = new Date(Date.now() + 86400000).toISOString();
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
      expect(task.completedAt).toBeNull();
    });
  });

  describe('getAll', () => {
    it('should return an empty array when no tasks exist', () => {
      expect(taskService.getAll()).toEqual([]);
    });

    it('should return all created tasks', () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });

      const all = taskService.getAll();
      expect(all).toHaveLength(2);
      expect(all[0].title).toBe('Task 1');
      expect(all[1].title).toBe('Task 2');
    });

    it('should return a shallow copy of tasks array so mutating it does not affect store', () => {
      taskService.create({ title: 'Task 1' });
      const all = taskService.getAll();
      all.push({ title: 'Fake Task' });

      expect(taskService.getAll()).toHaveLength(1);
    });
  });

  describe('findById', () => {
    it('should find an existing task by its id', () => {
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
    it('should return tasks matching the given status', () => {
      taskService.create({ title: 'Task 1', status: 'todo' });
      taskService.create({ title: 'Task 2', status: 'in_progress' });
      taskService.create({ title: 'Task 3', status: 'todo' });

      const todoTasks = taskService.getByStatus('todo');
      expect(todoTasks).toHaveLength(2);
      expect(todoTasks.map((t) => t.title)).toEqual(['Task 1', 'Task 3']);
    });

    it('should return an empty array when no tasks have matching status', () => {
      taskService.create({ title: 'Task 1', status: 'todo' });
      expect(taskService.getByStatus('done')).toEqual([]);
    });

    // BUG: getByStatus uses substring matching (.includes) instead of exact equality (===)
    test.failing('should not match partial status substrings (exact match required)', () => {
      taskService.create({ title: 'Task Todo', status: 'todo' });
      taskService.create({ title: 'Task Done', status: 'done' });

      // 'do' is a substring of both 'todo' and 'done', but neither has status 'do'
      const matches = taskService.getByStatus('do');
      expect(matches).toHaveLength(0);
    });
  });

  describe('getPaginated', () => {
    it('should return an empty array when store is empty', () => {
      expect(taskService.getPaginated(1, 10)).toEqual([]);
    });

    it('should return an empty array when requested page is beyond total tasks', () => {
      taskService.create({ title: 'Task 1' });
      expect(taskService.getPaginated(10, 5)).toEqual([]);
    });

    it('should return the first page of results with 1-indexed page (offset 0 for page 1)', () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });
      taskService.create({ title: 'Task 3' });

      const page1 = taskService.getPaginated(1, 2);
      expect(page1).toHaveLength(2);
      expect(page1[0].title).toBe('Task 1');
      expect(page1[1].title).toBe('Task 2');
    });

    it('should return partial last page correctly for page 2', () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });
      taskService.create({ title: 'Task 3' });

      const page2 = taskService.getPaginated(2, 2);
      expect(page2).toHaveLength(1);
      expect(page2[0].title).toBe('Task 3');
    });
  });

  describe('getStats', () => {
    it('should return all zeros when no tasks exist', () => {
      expect(taskService.getStats()).toEqual({
        todo: 0,
        in_progress: 0,
        done: 0,
        overdue: 0,
      });
    });

    it('should correctly count tasks by status', () => {
      taskService.create({ title: 'T1', status: 'todo' });
      taskService.create({ title: 'T2', status: 'todo' });
      taskService.create({ title: 'T3', status: 'in_progress' });
      taskService.create({ title: 'T4', status: 'done' });

      const stats = taskService.getStats();
      expect(stats.todo).toBe(2);
      expect(stats.in_progress).toBe(1);
      expect(stats.done).toBe(1);
    });

    it('should count overdue tasks for non-done tasks with past due dates', () => {
      const pastDate = new Date(Date.now() - 100000).toISOString();
      const futureDate = new Date(Date.now() + 100000).toISOString();

      taskService.create({ title: 'Past Todo', status: 'todo', dueDate: pastDate });
      taskService.create({ title: 'Past In Progress', status: 'in_progress', dueDate: pastDate });
      taskService.create({ title: 'Future Todo', status: 'todo', dueDate: futureDate });
      taskService.create({ title: 'No Due Date', status: 'todo', dueDate: null });

      const stats = taskService.getStats();
      expect(stats.overdue).toBe(2);
    });

    it('should not count completed (done) tasks as overdue even if dueDate is in the past', () => {
      const pastDate = new Date(Date.now() - 100000).toISOString();
      taskService.create({ title: 'Completed Past', status: 'done', dueDate: pastDate });

      const stats = taskService.getStats();
      expect(stats.done).toBe(1);
      expect(stats.overdue).toBe(0);
    });
  });

  describe('update', () => {
    it('should update task fields and return updated task', () => {
      const task = taskService.create({ title: 'Initial' });
      const updated = taskService.update(task.id, {
        title: 'Updated Title',
        priority: 'high',
        status: 'in_progress',
      });

      expect(updated).toBeDefined();
      expect(updated.title).toBe('Updated Title');
      expect(updated.priority).toBe('high');
      expect(updated.status).toBe('in_progress');
    });

    it('should return null when updating a non-existent task id', () => {
      const result = taskService.update('unknown-id', { title: 'New' });
      expect(result).toBeNull();
    });

    // BUG: update() allows overwriting protected fields like id and createdAt
    test.failing('should not allow overwriting immutable fields like id or createdAt', () => {
      const task = taskService.create({ title: 'Protected Fields Task' });
      const originalId = task.id;
      const originalCreatedAt = task.createdAt;

      taskService.update(task.id, {
        id: 'new-id-hacked',
        createdAt: '2000-01-01T00:00:00.000Z',
      });

      const updated = taskService.findById(originalId);
      expect(updated).toBeDefined();
      expect(updated.id).toBe(originalId);
      expect(updated.createdAt).toBe(originalCreatedAt);
    });

    // BUG: update() setting status to 'done' does not set completedAt timestamp
    test.failing('should set completedAt timestamp when status is updated to done via update', () => {
      const task = taskService.create({ title: 'Finish via PUT' });
      const updated = taskService.update(task.id, { status: 'done' });

      expect(updated.status).toBe('done');
      expect(updated.completedAt).not.toBeNull();
      expect(typeof updated.completedAt).toBe('string');
    });
  });

  describe('remove', () => {
    it('should remove existing task and return true', () => {
      const task = taskService.create({ title: 'To Delete' });
      const removed = taskService.remove(task.id);

      expect(removed).toBe(true);
      expect(taskService.findById(task.id)).toBeUndefined();
      expect(taskService.getAll()).toHaveLength(0);
    });

    it('should return false when removing non-existent task id', () => {
      const removed = taskService.remove('non-existent-id');
      expect(removed).toBe(false);
    });
  });

  describe('completeTask', () => {
    it('should mark task status as done and set completedAt', () => {
      const task = taskService.create({ title: 'Finish Me' });
      const completed = taskService.completeTask(task.id);

      expect(completed).toBeDefined();
      expect(completed.status).toBe('done');
      expect(completed.completedAt).toBeDefined();
      expect(isNaN(Date.parse(completed.completedAt))).toBe(false);
    });

    it('should return null when task id does not exist', () => {
      const result = taskService.completeTask('unknown-id');
      expect(result).toBeNull();
    });

    // BUG: completeTask resets priority to 'medium' instead of preserving existing priority
    test.failing('should preserve the task priority when completing the task', () => {
      const task = taskService.create({ title: 'High Priority', priority: 'high' });
      const completed = taskService.completeTask(task.id);

      expect(completed.priority).toBe('high');
    });

    // BUG: completeTask overwrites completedAt on an already-completed task
    test.failing('should not overwrite completedAt if the task is already completed', async () => {
      const task = taskService.create({ title: 'Already Done' });
      const firstCompletion = taskService.completeTask(task.id);
      const originalCompletedAt = firstCompletion.completedAt;

      // Small delay to ensure next Date().toISOString() would differ
      await new Promise((resolve) => setTimeout(resolve, 10));

      const secondCompletion = taskService.completeTask(task.id);
      expect(secondCompletion.completedAt).toBe(originalCompletedAt);
    });
  });

  describe('assignTask', () => {
    it('should assign an assignee to an existing task and return the updated task', () => {
      const task = taskService.create({ title: 'Task to assign' });
      expect(task.assignee).toBeNull();

      const assigned = taskService.assignTask(task.id, 'Alice');
      expect(assigned).toBeDefined();
      expect(assigned.id).toBe(task.id);
      expect(assigned.assignee).toBe('Alice');

      const found = taskService.findById(task.id);
      expect(found.assignee).toBe('Alice');
    });

    it('should return null when assigning to non-existent task id', () => {
      const result = taskService.assignTask('non-existent-id', 'Alice');
      expect(result).toBeNull();
    });

    it('should allow reassigning an already assigned task and overwrite previous assignee', () => {
      const task = taskService.create({ title: 'Reassign Task' });
      taskService.assignTask(task.id, 'Alice');

      const reassigned = taskService.assignTask(task.id, 'Bob');
      expect(reassigned.assignee).toBe('Bob');

      const found = taskService.findById(task.id);
      expect(found.assignee).toBe('Bob');
    });
  });

  describe('_reset', () => {
    it('should clear all tasks from memory', () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });
      expect(taskService.getAll()).toHaveLength(2);

      taskService._reset();
      expect(taskService.getAll()).toHaveLength(0);
    });
  });
});
