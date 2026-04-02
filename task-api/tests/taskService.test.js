const taskService = require('../src/services/taskService');

describe('TaskService Unit Tests', () => {
  // Reset the task store before each test to ensure test isolation
  // This prevents data from one test affecting another
  beforeEach(() => {
    taskService._reset();
  });

  describe('getAll()', () => {
    // Test: Verifies getAll() returns empty array when no tasks have been created
    // Purpose: Ensures function handles initial empty state correctly
    test('should return empty array when no tasks exist', () => {
      const tasks = taskService.getAll();
      expect(tasks).toEqual([]);
      expect(Array.isArray(tasks)).toBe(true);
    });

    // Test: Verifies getAll() returns all created tasks with correct data
    // Purpose: Ensures function retrieves all tasks and data integrity
    test('should return all tasks when tasks exist', () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });
      const tasks = taskService.getAll();
      expect(tasks.length).toBe(2);
      expect(tasks[0].title).toBe('Task 1');
      expect(tasks[1].title).toBe('Task 2');
    });

    // Test: Verifies getAll() returns a NEW array copy, not internal reference
    // Purpose: Prevents accidental mutation of internal data store
    // (If callers modify the returned array, it shouldn't affect the service)
    test('should return a copy of tasks array, not reference to internal array', () => {
      taskService.create({ title: 'Task 1' });
      const tasks1 = taskService.getAll();
      const tasks2 = taskService.getAll();
      expect(tasks1).not.toBe(tasks2); // Different array objects
      expect(tasks1).toEqual(tasks2);  // But same content
    });
  });

  describe('findById(id)', () => {
    // Test: Verifies findById() returns the exact task object when it exists
    // Purpose: Ensures correct task retrieval by ID
    test('should return task object when task exists', () => {
      const created = taskService.create({ title: 'Find me' });
      const found = taskService.findById(created.id);
      expect(found).toEqual(created);
    });

    // Test: Verifies findById() returns undefined for non-existent IDs
    // Purpose: Ensures function handles missing tasks gracefully
    test('should return undefined when task does not exist', () => {
      const found = taskService.findById('non-existent-id');
      expect(found).toBeUndefined();
    });

    // Test: Verifies findById() finds the correct task among multiple tasks
    // Purpose: Ensures ID matching works accurately (not returning wrong tasks)
    test('should find correct task with matching ID', () => {
      const task1 = taskService.create({ title: 'Task 1' });
      const task2 = taskService.create({ title: 'Task 2' });
      const task3 = taskService.create({ title: 'Task 3' });
      
      const found = taskService.findById(task2.id);
      expect(found.id).toBe(task2.id);
      expect(found.title).toBe('Task 2');
    });
  });

  describe('getByStatus(status)', () => {
    beforeEach(() => {
      taskService.create({ title: 'Task 1', status: 'pending' });
      taskService.create({ title: 'Task 2', status: 'in-progress' });
      taskService.create({ title: 'Task 3', status: 'pending' });
      taskService.create({ title: 'Task 4', status: 'completed' });
    });

    // Test: Verifies getByStatus() returns empty array for invalid status
    // Purpose: Ensures function handles edge case of non-existent status values
    test('should return empty array when no tasks with that status exist', () => {
      const tasks = taskService.getByStatus('non-existent-status');
      expect(tasks).toEqual([]);
    });

    // Test: Verifies getByStatus() returns ONLY tasks matching the specified status
    // Purpose: Ensures filtering accuracy and prevents returning unrelated tasks
    test('should return only tasks matching the status filter', () => {
      const tasks = taskService.getByStatus('pending');
      expect(tasks.length).toBe(2);
      expect(tasks.every(t => t.status === 'pending')).toBe(true);
    });

    // Test: Verifies getByStatus() works correctly with all three valid status values
    // Purpose: Ensures function handles each status type (pending, in-progress, completed)
    test('should work with different status values', () => {
      expect(taskService.getByStatus('pending').length).toBe(2);
      expect(taskService.getByStatus('in-progress').length).toBe(1);
      expect(taskService.getByStatus('completed').length).toBe(1);
    });

    // Test: CRITICAL - Verifies getByStatus() uses EXACT matching, not substring matching
    // Purpose: Prevents Bug #2 (substring matching). Ensures "in" doesn't match "in-progress"
    test('should use exact matching (not partial)', () => {
      const inProgress = taskService.getByStatus('in-progress');
      expect(inProgress.length).toBe(1);
      // If using .includes(), these would incorrectly match
      expect(taskService.getByStatus('in').length).toBe(0);
      expect(taskService.getByStatus('progress').length).toBe(0);
    });
  });

  describe('getPaginated(page, limit)', () => {
    beforeEach(() => {
      for (let i = 1; i <= 25; i++) {
        taskService.create({ title: `Task ${i}` });
      }
    });

    // Test: Verifies getPaginated() returns correct slice with valid page/limit
    // Purpose: Ensures pagination math is correct for first page
    test('should return correct slice of tasks with valid page/limit', () => {
      const page1 = taskService.getPaginated(1, 10);
      expect(page1.length).toBe(10);
      expect(page1[0].title).toBe('Task 1');
      expect(page1[9].title).toBe('Task 10');
    });

    // Test: Verifies page=1 returns the first page of tasks (1-10)
    // Purpose: Ensures 1-based pagination (user-friendly)
    test('should handle page=1, limit=10 correctly (first page)', () => {
      const tasks = taskService.getPaginated(1, 10);
      expect(tasks.length).toBe(10);
    });

    // Test: CRITICAL - Verifies page=2 returns items 11-20 (not 10-19)
    // Purpose: Prevents Bug #1 (off-by-one pagination error)
    test('should return correct items for page 2', () => {
      const page2 = taskService.getPaginated(2, 10);
      expect(page2.length).toBe(10);
      expect(page2[0].title).toBe('Task 11');
      expect(page2[9].title).toBe('Task 20');
    });

    // Test: Verifies getPaginated() returns empty array when pagination offset exceeds data
    // Purpose: Ensures function handles edge case gracefully (requesting page beyond available data)
    test('should return empty array when offset exceeds task count', () => {
      const tasks = taskService.getPaginated(10, 10);
      expect(tasks).toEqual([]);
    });

    // Test: Verifies getPaginated() handles page=0 gracefully
    // Purpose: Edge case testing for boundary conditions
    test('should handle page=0 (edge case)', () => {
      const tasks = taskService.getPaginated(0, 10);
      expect(tasks.length).toBe(0);
    });

    // Test: Verifies getPaginated() handles negative page numbers
    // Purpose: Edge case testing for invalid input
    test('should handle negative page number (edge case)', () => {
      const tasks = taskService.getPaginated(-1, 10);
      expect(Array.isArray(tasks)).toBe(true);
    });

    // Test: Verifies getPaginated() handles very large limit values correctly
    // Purpose: Edge case testing - limit larger than total data should return all available data
    test('should handle very large limit value', () => {
      const tasks = taskService.getPaginated(1, 1000);
      expect(tasks.length).toBe(25); // All 25 tasks
    });

    // Test: Verifies last page returns fewer items than the limit
    // Purpose: Ensures partial pages work correctly (e.g., page 3 with only 5 items instead of 10)
    test('should handle last page with fewer items', () => {
      const tasks = taskService.getPaginated(3, 10);
      expect(tasks.length).toBe(5); // Only 5 items on the last page
    });
  });

  describe('getStats()', () => {
    // Test: Verifies getStats() returns zero counts when no tasks exist
    // Purpose: Ensures function handles initial empty state
    test('should return zero counts when no tasks exist', () => {
      const stats = taskService.getStats();
      expect(stats).toEqual({
        pending: 0,
        'in-progress': 0,
        completed: 0,
        overdue: 0
      });
    });

    // Test: Verifies getStats() counts tasks correctly by status
    // Purpose: Ensures stats accurately reflect task distribution
    test('should return correct counts for each status when tasks exist', () => {
      taskService.create({ title: 'Task 1', status: 'pending' });
      taskService.create({ title: 'Task 2', status: 'in-progress' });
      taskService.create({ title: 'Task 3', status: 'completed' });
      taskService.create({ title: 'Task 4', status: 'pending' });

      const stats = taskService.getStats();
      expect(stats.pending).toBe(2);
      expect(stats['in-progress']).toBe(1);
      expect(stats.completed).toBe(1);
    });

    // Test: Verifies overdue count only includes non-completed tasks with past dueDate
    // Purpose: Ensures overdue calculation is correct (ignores completed tasks)
    test('should return correct overdue count for non-completed tasks', () => {
      const pastDate = new Date('2020-01-01').toISOString();
      const futureDate = new Date('2030-01-01').toISOString();

      taskService.create({ title: 'Task 1', status: 'pending', dueDate: pastDate });
      taskService.create({ title: 'Task 2', status: 'in-progress', dueDate: pastDate });
      taskService.create({ title: 'Task 3', status: 'completed', dueDate: pastDate });
      taskService.create({ title: 'Task 4', status: 'pending', dueDate: futureDate });

      const stats = taskService.getStats();
      expect(stats.overdue).toBe(2); // Only tasks 1 & 2
    });

    // Test: CRITICAL - Verifies completed tasks are NOT counted as overdue
    // Purpose: Ensures completed tasks don't skew overdue statistics (Bug #3 fix)
    test('should not count completed tasks as overdue', () => {
      const pastDate = new Date('2020-01-01').toISOString();
      taskService.create({ title: 'Task 1', status: 'completed', dueDate: pastDate });
      taskService.create({ title: 'Task 2', status: 'pending', dueDate: pastDate });

      const stats = taskService.getStats();
      expect(stats.overdue).toBe(1); // Only 1 overdue (the pending one)
    });

    // Test: Verifies getStats() handles null/undefined dueDate correctly
    // Purpose: Ensures function doesn't crash and ignores tasks without due dates
    test('should handle null/undefined dueDate correctly', () => {
      taskService.create({ title: 'Task 1', status: 'pending', dueDate: null });
      taskService.create({ title: 'Task 2', status: 'pending' });

      const stats = taskService.getStats();
      expect(stats.overdue).toBe(0); // No overdue tasks
    });
  });

  describe('create(fields)', () => {
    // Test: Verifies create() successfully creates a task with required fields
    // Purpose: Ensures basic task creation works and generates ID and timestamp
    test('should create task with required fields', () => {
      const task = taskService.create({ title: 'New Task' });
      expect(task.title).toBe('New Task');
      expect(task.id).toBeDefined();
      expect(task.createdAt).toBeDefined();
    });

    // Test: Verifies create() applies correct default values for optional fields
    // Purpose: Ensures new tasks have sensible defaults (pending status, medium priority, etc.)
    test('should use default values for optional fields', () => {
      const task = taskService.create({ title: 'Task' });
      expect(task.status).toBe('pending');
      expect(task.priority).toBe('medium');
      expect(task.description).toBe('');
      expect(task.dueDate).toBeNull();
      expect(task.completedAt).toBeNull();
    });

    // Test: Verifies create() generates unique UUIDs for each task
    // Purpose: Ensures no two tasks have the same ID
    test('should generate unique UUID for each task', () => {
      const task1 = taskService.create({ title: 'Task 1' });
      const task2 = taskService.create({ title: 'Task 2' });
      expect(task1.id).not.toBe(task2.id);
    });

    // Test: Verifies create() sets createdAt to current timestamp
    // Purpose: Ensures task creation timestamp is accurate
    test('should set createdAt to current ISO timestamp', () => {
      const beforeCreate = new Date();
      const task = taskService.create({ title: 'Task' });
      const afterCreate = new Date();

      const taskCreatedTime = new Date(task.createdAt);
      expect(taskCreatedTime.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
      expect(taskCreatedTime.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
    });

    // Test: Verifies create() actually stores task in internal array
    // Purpose: Ensures created tasks are retrievable via findById()
    test('should store task in internal array', () => {
      const createdTask = taskService.create({ title: 'Task' });
      const foundTask = taskService.findById(createdTask.id);
      expect(foundTask).toEqual(createdTask);
    });

    // Test: Verifies create() accepts custom values for optional fields
    // Purpose: Ensures users can override defaults if needed
    test('should accept custom values for optional fields', () => {
      const task = taskService.create({
        title: 'Task',
        description: 'Test description',
        status: 'in-progress',
        priority: 'high',
        dueDate: '2026-04-15T00:00:00Z'
      });

      expect(task.description).toBe('Test description');
      expect(task.status).toBe('in-progress');
      expect(task.priority).toBe('high');
      expect(task.dueDate).toBe('2026-04-15T00:00:00Z');
    });
  });

  describe('update(id, fields)', () => {
    let task;

    beforeEach(() => {
      task = taskService.create({
        title: 'Original Task',
        description: 'Original description',
        status: 'pending',
        priority: 'low'
      });
    });

    // Test: Verifies update() successfully updates a task with new values
    // Purpose: Ensures partial updates work correctly
    test('should update existing task with provided fields', () => {
      const updated = taskService.update(task.id, { title: 'Updated Title' });
      expect(updated.title).toBe('Updated Title');
    });

    // Test: Verifies update() returns the updated task object
    // Purpose: Ensures caller receives confirmation of successful update
    test('should return updated task object', () => {
      const updated = taskService.update(task.id, { status: 'in-progress' });
      expect(updated).toHaveProperty('id');
      expect(updated).toHaveProperty('title');
      expect(updated.status).toBe('in-progress');
    });

    // Test: Verifies update() returns null for non-existent task IDs
    // Purpose: Ensures function handles missing tasks gracefully
    test('should return null when task not found', () => {
      const updated = taskService.update('non-existent-id', { title: 'New' });
      expect(updated).toBeNull();
    });

    // Test: Verifies update() doesn't modify fields not specified in the update
    // Purpose: Prevents unintended data loss in partial updates
    test('should preserve unmodified fields', () => {
      const updated = taskService.update(task.id, { title: 'New Title' });
      expect(updated.description).toBe('Original description');
      expect(updated.priority).toBe('low');
      expect(updated.status).toBe('pending');
    });

    // Test: Verifies update() works with partial field updates
    // Purpose: Ensures users don't need to provide all fields to update one
    test('should allow partial field updates', () => {
      const updated = taskService.update(task.id, { priority: 'high' });
      expect(updated.priority).toBe('high');
      expect(updated.title).toBe('Original Task');
      expect(updated.status).toBe('pending');
    });

    // Test: Verifies update() can update multiple fields in one call
    // Purpose: Ensures efficiency when updating multiple properties
    test('should update multiple fields at once', () => {
      const updated = taskService.update(task.id, {
        title: 'New Title',
        status: 'completed',
        priority: 'medium'
      });

      expect(updated.title).toBe('New Title');
      expect(updated.status).toBe('completed');
      expect(updated.priority).toBe('medium');
    });
  });

  describe('remove(id)', () => {
    // Test: Verifies remove() successfully deletes a task and returns true
    // Purpose: Ensures successful deletion returns confirmation
    test('should remove task and return true when task exists', () => {
      const task = taskService.create({ title: 'Task to remove' });
      const result = taskService.remove(task.id);
      expect(result).toBe(true);
    });

    // Test: Verifies remove() returns false for non-existent task IDs
    // Purpose: Ensures function handles missing tasks gracefully
    test('should return false when task does not exist', () => {
      const result = taskService.remove('non-existent-id');
      expect(result).toBe(false);
    });

    // Test: Verifies the task is actually removed from the array
    // Purpose: Ensures delete is permanent, not just marked for deletion
    test('should actually remove task from array', () => {
      const task = taskService.create({ title: 'Task' });
      taskService.remove(task.id);
      const found = taskService.findById(task.id);
      expect(found).toBeUndefined();
    });

    // Test: Verifies removing one task doesn't affect other tasks
    // Purpose: Ensures deletion is precise and doesn't have side effects
    test('should not affect other tasks', () => {
      const task1 = taskService.create({ title: 'Task 1' });
      const task2 = taskService.create({ title: 'Task 2' });
      
      taskService.remove(task1.id);
      
      const remaining = taskService.getAll();
      expect(remaining.length).toBe(1);
      expect(remaining[0].id).toBe(task2.id);
    });
  });

  describe('completeTask(id)', () => {
    let task;

    beforeEach(() => {
      task = taskService.create({
        title: 'Task',
        status: 'pending',
        priority: 'high'
      });
    });

    // Test: Verifies completeTask() sets status to 'completed'
    // Purpose: Ensures task status changes when marked complete
    test('should set status to completed when task exists', () => {
      const completed = taskService.completeTask(task.id);
      expect(completed.status).toBe('completed');
    });

    // Test: Verifies completeTask() sets completedAt to current timestamp
    // Purpose: Ensures task completion time is recorded
    test('should set completedAt to current ISO timestamp', () => {
      const beforeComplete = new Date();
      const completed = taskService.completeTask(task.id);
      const afterComplete = new Date();

      const completedTime = new Date(completed.completedAt);
      expect(completedTime.getTime()).toBeGreaterThanOrEqual(beforeComplete.getTime());
      expect(completedTime.getTime()).toBeLessThanOrEqual(afterComplete.getTime());
    });

    // Test: Verifies completeTask() sets priority to 'medium'
    // Purpose: Ensures priority is normalized on completion
    test('should set priority to medium', () => {
      const completed = taskService.completeTask(task.id);
      expect(completed.priority).toBe('medium');
    });

    // Test: Verifies completeTask() returns null for non-existent tasks
    // Purpose: Ensures function handles missing tasks gracefully
    test('should return null when task not found', () => {
      const completed = taskService.completeTask('non-existent-id');
      expect(completed).toBeNull();
    });

    // Test: Verifies completeTask() preserves other task fields
    // Purpose: Ensures only relevant fields are changed
    test('should preserve other fields except status and priority', () => {
      const completed = taskService.completeTask(task.id);
      expect(completed.title).toBe('Task');
      expect(completed.id).toBe(task.id);
    });

    // Test: Verifies completeTask() can be called multiple times safely
    // Purpose: Ensures idempotency (completing already-completed task is safe)
    test('should handle completing already completed task', () => {
      const completed1 = taskService.completeTask(task.id);
      const completed2 = taskService.completeTask(task.id);
      expect(completed2.status).toBe('completed');
      expect(completed2.priority).toBe('medium');
    });
  });
});
