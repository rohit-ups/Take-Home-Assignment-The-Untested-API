const {
  getAll,
  findById,
  getByStatus,
  getPaginated,
  getStats,
  create,
  update,
  remove,
  completeTask,
  assign,
  _reset,
} = require('../src/services/taskService');

describe('taskService', () => {
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  beforeEach(() => {
    _reset();
  });

  describe('create()', () => {
    test('should create a task with default values when only title is provided', () => {
      const task = create({ title: 'Buy milk' });

      expect(task).toBeDefined();
      expect(task.id).toMatch(UUID_REGEX);
      expect(task.title).toBe('Buy milk');
      expect(task.description).toBe('');
      expect(task.status).toBe('todo');
      expect(task.priority).toBe('medium');
      expect(task.dueDate).toBeNull();
      expect(task.completedAt).toBeNull();
      expect(typeof task.createdAt).toBe('string');
      expect(isNaN(Date.parse(task.createdAt))).toBe(false);
    });

    test('should create a task with all custom fields provided', () => {
      const dueDate = '2026-12-31T23:59:59.000Z';
      const task = create({
        title: 'Complete project',
        description: 'Finish all deliverables',
        status: 'in_progress',
        priority: 'high',
        dueDate,
      });

      expect(task.title).toBe('Complete project');
      expect(task.description).toBe('Finish all deliverables');
      expect(task.status).toBe('in_progress');
      expect(task.priority).toBe('high');
      expect(task.dueDate).toBe(dueDate);
      expect(task.completedAt).toBeNull();
    });

    test('should ignore client-supplied id, createdAt, or completedAt on creation', () => {
      const task = create({
        title: 'Tamper attempt',
        id: 'custom-static-id',
        createdAt: '2020-01-01T00:00:00.000Z',
        completedAt: '2020-01-02T00:00:00.000Z',
      });

      expect(task.id).not.toBe('custom-static-id');
      expect(task.id).toMatch(UUID_REGEX);
      expect(task.createdAt).not.toBe('2020-01-01T00:00:00.000Z');
      expect(task.completedAt).toBeNull();
    });

    test('should add the created task to the internal store', () => {
      const task = create({ title: 'Store check' });

      const allTasks = getAll();
      expect(allTasks).toHaveLength(1);
      expect(allTasks[0]).toEqual(task);
      expect(findById(task.id)).toEqual(task);
    });
  });

  describe('getAll()', () => {
    test('should return an empty array when no tasks exist', () => {
      const tasks = getAll();
      expect(tasks).toEqual([]);
    });

    test('should return all created tasks in the store', () => {
      const t1 = create({ title: 'Task 1' });
      const t2 = create({ title: 'Task 2' });
      const t3 = create({ title: 'Task 3' });

      const tasks = getAll();
      expect(tasks).toHaveLength(3);
      expect(tasks).toEqual([t1, t2, t3]);
    });

    test('should return a shallow copy of the tasks array so external array mutation does not affect internal store', () => {
      create({ title: 'Task 1' });
      const tasks = getAll();

      tasks.push({ title: 'Injected Task' });
      expect(getAll()).toHaveLength(1);
    });
  });

  describe('findById()', () => {
    test('should return the correct task when matching id exists', () => {
      const created = create({ title: 'Target Task' });
      const found = findById(created.id);

      expect(found).toEqual(created);
    });

    test('should return undefined when task id does not exist', () => {
      create({ title: 'Existing Task' });
      const found = findById('non-existent-uuid');

      expect(found).toBeUndefined();
    });

    test('should return undefined when called with null, undefined, or empty string', () => {
      expect(findById(null)).toBeUndefined();
      expect(findById(undefined)).toBeUndefined();
      expect(findById('')).toBeUndefined();
    });

    test('should find the correct task among multiple tasks in store', () => {
      const t1 = create({ title: 'Task 1' });
      const t2 = create({ title: 'Task 2' });
      const t3 = create({ title: 'Task 3' });

      expect(findById(t2.id)).toEqual(t2);
      expect(findById(t1.id)).toEqual(t1);
      expect(findById(t3.id)).toEqual(t3);
    });
  });

  describe('getByStatus()', () => {
    test('should return an empty array when store is empty', () => {
      expect(getByStatus('todo')).toEqual([]);
    });

    test('should return only tasks matching the given status (happy path)', () => {
      const todo1 = create({ title: 'Todo 1', status: 'todo' });
      const todo2 = create({ title: 'Todo 2', status: 'todo' });
      const inProgress = create({ title: 'In Progress 1', status: 'in_progress' });
      const done = create({ title: 'Done 1', status: 'done' });

      const todoTasks = getByStatus('todo');
      expect(todoTasks).toHaveLength(2);
      expect(todoTasks).toEqual(expect.arrayContaining([todo1, todo2]));

      const inProgressTasks = getByStatus('in_progress');
      expect(inProgressTasks).toEqual([inProgress]);

      const doneTasks = getByStatus('done');
      expect(doneTasks).toEqual([done]);
    });

    test('should return an empty array when no tasks have the requested status', () => {
      create({ title: 'Task 1', status: 'todo' });
      expect(getByStatus('done')).toEqual([]);
    });

    test('should only match exact status and not partial substrings', () => {
      // "do" is a substring of both "todo" and "done".
      // Status filtering must perform an exact match.
      create({ title: 'Task Todo', status: 'todo' });
      create({ title: 'Task Done', status: 'done' });

      const result = getByStatus('do');
      expect(result).toEqual([]);
    });

    test('should not match substring when filtering by partial status like "progress"', () => {
      // "progress" is a substring of "in_progress".
      // Expected behavior: exact match, returning empty array.
      create({ title: 'Task Progress', status: 'in_progress' });

      const result = getByStatus('progress');
      expect(result).toEqual([]);
    });
  });

  describe('getPaginated()', () => {
    test('should return an empty array when store is empty', () => {
      expect(getPaginated(1, 10)).toEqual([]);
    });

    test('should return the first page of tasks for page 1 with the specified limit', () => {
      const t1 = create({ title: 'Task 1' });
      const t2 = create({ title: 'Task 2' });
      create({ title: 'Task 3' });
      create({ title: 'Task 4' });
      create({ title: 'Task 5' });

      // Page 1 with limit 2 should return the first 2 tasks (1-indexed pagination)
      const page1 = getPaginated(1, 2);
      expect(page1).toEqual([t1, t2]);
    });

    test('should return the second page of tasks for page 2 with the specified limit', () => {
      create({ title: 'Task 1' });
      create({ title: 'Task 2' });
      const t3 = create({ title: 'Task 3' });
      const t4 = create({ title: 'Task 4' });
      create({ title: 'Task 5' });

      // Page 2 with limit 2 should return tasks 3 and 4
      const page2 = getPaginated(2, 2);
      expect(page2).toEqual([t3, t4]);
    });

    test('should return remaining items on the last page when total items is not a multiple of limit', () => {
      create({ title: 'Task 1' });
      create({ title: 'Task 2' });
      create({ title: 'Task 3' });
      create({ title: 'Task 4' });
      const t5 = create({ title: 'Task 5' });

      // Page 3 with limit 2 should return the remaining 1 task (task 5)
      const page3 = getPaginated(3, 2);
      expect(page3).toEqual([t5]);
    });

    test('should return an empty array when page number exceeds available pages', () => {
      create({ title: 'Task 1' });
      create({ title: 'Task 2' });

      const result = getPaginated(5, 10);
      expect(result).toEqual([]);
    });

    test('should return an empty array when limit is 0', () => {
      create({ title: 'Task 1' });
      expect(getPaginated(1, 0)).toEqual([]);
    });
  });

  describe('update()', () => {
    test('should update a single field on an existing task (happy path)', () => {
      const task = create({ title: 'Original Title', description: 'Original Description' });
      const updated = update(task.id, { title: 'Updated Title' });

      expect(updated).toBeDefined();
      expect(updated.title).toBe('Updated Title');
      expect(updated.description).toBe('Original Description');
    });

    test('should update multiple fields simultaneously', () => {
      const task = create({ title: 'Initial', priority: 'low', status: 'todo' });
      const updated = update(task.id, {
        title: 'Modified',
        priority: 'high',
        status: 'in_progress',
        description: 'Added description',
        dueDate: '2026-11-01T12:00:00.000Z',
      });

      expect(updated.title).toBe('Modified');
      expect(updated.priority).toBe('high');
      expect(updated.status).toBe('in_progress');
      expect(updated.description).toBe('Added description');
      expect(updated.dueDate).toBe('2026-11-01T12:00:00.000Z');
    });

    test('should preserve untouched fields when updating a task', () => {
      const task = create({
        title: 'Original',
        description: 'Keep this',
        priority: 'high',
        status: 'todo',
      });

      const updated = update(task.id, { title: 'Changed' });

      expect(updated.description).toBe('Keep this');
      expect(updated.priority).toBe('high');
      expect(updated.status).toBe('todo');
    });

    test('should persist the update in the internal store', () => {
      const task = create({ title: 'Before update' });
      update(task.id, { title: 'After update' });

      const found = findById(task.id);
      expect(found.title).toBe('After update');
    });

    test('should return null when updating a non-existent task id', () => {
      const result = update('non-existent-id', { title: 'Updated' });
      expect(result).toBeNull();
    });

    test('should not allow updating immutable task id', () => {
      const task = create({ title: 'Task to update' });
      const originalId = task.id;

      const updated = update(originalId, { id: 'malicious-custom-id', title: 'Renamed' });

      expect(updated.id).toBe(originalId);
      expect(findById(originalId)).toBeDefined();
    });

    test('should not allow updating immutable createdAt timestamp', () => {
      const task = create({ title: 'Task with timestamp' });
      const originalCreatedAt = task.createdAt;

      const updated = update(task.id, { createdAt: '1970-01-01T00:00:00.000Z' });

      expect(updated.createdAt).toBe(originalCreatedAt);
    });
  });

  describe('remove()', () => {
    test('should remove an existing task and return true', () => {
      const task = create({ title: 'Task to delete' });
      const result = remove(task.id);

      expect(result).toBe(true);
      expect(findById(task.id)).toBeUndefined();
      expect(getAll()).toHaveLength(0);
    });

    test('should return false when attempting to remove a non-existent task id', () => {
      create({ title: 'Existing Task' });
      const result = remove('non-existent-id');

      expect(result).toBe(false);
      expect(getAll()).toHaveLength(1);
    });

    test('should return false when attempting to remove from an empty store', () => {
      const result = remove('any-id');
      expect(result).toBe(false);
    });

    test('should only remove the targeted task and leave other tasks intact', () => {
      const t1 = create({ title: 'Task 1' });
      const t2 = create({ title: 'Task 2' });
      const t3 = create({ title: 'Task 3' });

      const result = remove(t2.id);

      expect(result).toBe(true);
      expect(findById(t2.id)).toBeUndefined();
      expect(getAll()).toEqual([t1, t3]);
    });
  });

  describe('completeTask()', () => {
    test('should mark an existing task as done and set completedAt timestamp', () => {
      const task = create({ title: 'Task to complete', status: 'todo' });
      const completed = completeTask(task.id);

      expect(completed).toBeDefined();
      expect(completed.status).toBe('done');
      expect(typeof completed.completedAt).toBe('string');
      expect(isNaN(Date.parse(completed.completedAt))).toBe(false);
    });

    test('should persist the completed status and completedAt in the store', () => {
      const task = create({ title: 'Task to complete' });
      completeTask(task.id);

      const found = findById(task.id);
      expect(found.status).toBe('done');
      expect(found.completedAt).not.toBeNull();
    });

    test('should return null when attempting to complete a non-existent task id', () => {
      const result = completeTask('non-existent-id');
      expect(result).toBeNull();
    });

    test('should preserve existing task priority when completing a high-priority task', () => {
      const task = create({ title: 'High priority task', priority: 'high' });
      const completed = completeTask(task.id);

      // Priority should remain high and not be overwritten/downgraded to medium
      expect(completed.priority).toBe('high');
      expect(findById(task.id).priority).toBe('high');
    });

    test('should preserve existing task priority when completing a low-priority task', () => {
      const task = create({ title: 'Low priority task', priority: 'low' });
      const completed = completeTask(task.id);

      // Priority should remain low and not be overwritten to medium
      expect(completed.priority).toBe('low');
      expect(findById(task.id).priority).toBe('low');
    });

    test('should preserve existing task priority when completing a medium-priority task', () => {
      const task = create({ title: 'Medium priority task', priority: 'medium' });
      const completed = completeTask(task.id);

      expect(completed.priority).toBe('medium');
      expect(findById(task.id).priority).toBe('medium');
    });
  });

  describe('assign()', () => {
    test('should assign a task to a user and set assignee field', () => {
      const task = create({ title: 'Task to assign' });
      const assigned = assign(task.id, 'Alice');

      expect(assigned).toBeDefined();
      expect(assigned.assignee).toBe('Alice');
      expect(findById(task.id).assignee).toBe('Alice');
    });

    test('should preserve all other existing task fields when assigning', () => {
      const pastDate = new Date().toISOString();
      const task = create({
        title: 'Important task',
        description: 'Do not lose this description',
        status: 'in_progress',
        priority: 'high',
        dueDate: pastDate,
      });

      const assigned = assign(task.id, 'Bob');
      expect(assigned.id).toBe(task.id);
      expect(assigned.title).toBe('Important task');
      expect(assigned.description).toBe('Do not lose this description');
      expect(assigned.status).toBe('in_progress');
      expect(assigned.priority).toBe('high');
      expect(assigned.dueDate).toBe(pastDate);
      expect(assigned.createdAt).toBe(task.createdAt);
      expect(assigned.assignee).toBe('Bob');
    });

    test('should trim surrounding whitespace from assignee name', () => {
      const task = create({ title: 'Whitespace test' });
      const assigned = assign(task.id, '  Anto  ');

      expect(assigned.assignee).toBe('Anto');
      expect(findById(task.id).assignee).toBe('Anto');
    });

    test('should allow reassigning a task and replace the previous assignee', () => {
      const task = create({ title: 'Reassign test' });
      assign(task.id, 'Alice');
      expect(findById(task.id).assignee).toBe('Alice');

      const reassigned = assign(task.id, 'Bob');
      expect(reassigned.assignee).toBe('Bob');
      expect(findById(task.id).assignee).toBe('Bob');
    });

    test('should return null when attempting to assign a nonexistent task', () => {
      const result = assign('nonexistent-id', 'Alice');
      expect(result).toBeNull();
    });

    test('should handle non-string assignee as-is if invoked directly at service level', () => {
      const task = create({ title: 'Direct non-string assign' });
      const assigned = assign(task.id, null);
      expect(assigned.assignee).toBeNull();
    });
  });

  describe('getStats()', () => {
    test('should return zero counts for all statuses and overdue when store is empty', () => {
      const stats = getStats();
      expect(stats).toEqual({
        todo: 0,
        in_progress: 0,
        done: 0,
        overdue: 0,
      });
    });

    test('should accurately count tasks by their status', () => {
      create({ title: 'T1', status: 'todo' });
      create({ title: 'T2', status: 'todo' });
      create({ title: 'T3', status: 'in_progress' });
      create({ title: 'T4', status: 'done' });
      create({ title: 'T5', status: 'done' });
      create({ title: 'T6', status: 'done' });

      const stats = getStats();
      expect(stats.todo).toBe(2);
      expect(stats.in_progress).toBe(1);
      expect(stats.done).toBe(3);
      expect(stats.overdue).toBe(0);
    });

    test('should count past due tasks with status "todo" as overdue', () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString();
      create({ title: 'Overdue Todo', status: 'todo', dueDate: pastDate });

      const stats = getStats();
      expect(stats.todo).toBe(1);
      expect(stats.overdue).toBe(1);
    });

    test('should count past due tasks with status "in_progress" as overdue', () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString();
      create({ title: 'Overdue In Progress', status: 'in_progress', dueDate: pastDate });

      const stats = getStats();
      expect(stats.in_progress).toBe(1);
      expect(stats.overdue).toBe(1);
    });

    test('should NOT count past due tasks with status "done" as overdue', () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString();
      create({ title: 'Completed Past Due', status: 'done', dueDate: pastDate });

      const stats = getStats();
      expect(stats.done).toBe(1);
      expect(stats.overdue).toBe(0);
    });

    test('should NOT count tasks with future dueDate as overdue', () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      create({ title: 'Future Task', status: 'todo', dueDate: futureDate });

      const stats = getStats();
      expect(stats.overdue).toBe(0);
    });

    test('should NOT count tasks with null dueDate as overdue', () => {
      create({ title: 'No Due Date', status: 'todo', dueDate: null });

      const stats = getStats();
      expect(stats.overdue).toBe(0);
    });

    test('should accurately calculate combined statistics across multiple tasks with mixed statuses and due dates', () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString();
      const futureDate = new Date(Date.now() + 86400000).toISOString();

      create({ title: 'T1', status: 'todo', dueDate: pastDate });       // todo: 1, overdue: 1
      create({ title: 'T2', status: 'todo', dueDate: futureDate });     // todo: 2, overdue: 1
      create({ title: 'T3', status: 'in_progress', dueDate: pastDate }); // in_progress: 1, overdue: 2
      create({ title: 'T4', status: 'in_progress', dueDate: null });     // in_progress: 2, overdue: 2
      create({ title: 'T5', status: 'done', dueDate: pastDate });       // done: 1, overdue: 2 (done is not overdue)
      create({ title: 'T6', status: 'done', dueDate: futureDate });     // done: 2, overdue: 2

      const stats = getStats();
      expect(stats).toEqual({
        todo: 2,
        in_progress: 2,
        done: 2,
        overdue: 2,
      });
    });

    test('should ignore tasks with unknown statuses when tallying counts in getStats()', () => {
      create({ title: 'Unknown status task', status: 'archived' });

      const stats = getStats();
      expect(stats).toEqual({
        todo: 0,
        in_progress: 0,
        done: 0,
        overdue: 0,
      });
    });
  });

  describe('_reset()', () => {
    test('should clear all tasks from the store', () => {
      create({ title: 'Task 1' });
      create({ title: 'Task 2' });
      expect(getAll()).toHaveLength(2);

      _reset();

      expect(getAll()).toEqual([]);
      expect(getStats()).toEqual({
        todo: 0,
        in_progress: 0,
        done: 0,
        overdue: 0,
      });
    });
  });
});
