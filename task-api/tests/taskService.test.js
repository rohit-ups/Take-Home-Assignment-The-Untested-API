const taskService = require('../src/services/taskService');

// Reset the in-memory store before each test to ensure isolation
beforeEach(() => {
  taskService._reset();
});

// ─── Helper ──────────────────────────────────────────────────────────────────
const createSampleTask = (overrides = {}) =>
  taskService.create({
    title: 'Sample Task',
    description: 'A test task',
    priority: 'high',
    status: 'todo',
    dueDate: '2099-12-31T00:00:00.000Z',
    ...overrides,
  });

// ═══════════════════════════════════════════════════════════════════════════════
// create()
// ═══════════════════════════════════════════════════════════════════════════════
describe('taskService.create()', () => {
  it('should create a task with all provided fields', () => {
    const task = createSampleTask();

    expect(task).toMatchObject({
      title: 'Sample Task',
      description: 'A test task',
      priority: 'high',
      status: 'todo',
      dueDate: '2099-12-31T00:00:00.000Z',
    });
    expect(task.id).toBeDefined();
    expect(task.createdAt).toBeDefined();
    expect(task.completedAt).toBeNull();
  });

  it('should assign default values when optional fields are omitted', () => {
    const task = taskService.create({ title: 'Minimal Task' });

    expect(task.description).toBe('');
    expect(task.status).toBe('todo');
    expect(task.priority).toBe('medium');
    expect(task.dueDate).toBeNull();
  });

  it('should generate a unique UUID for each task', () => {
    const t1 = createSampleTask();
    const t2 = createSampleTask();

    expect(t1.id).not.toBe(t2.id);
  });

  it('should set createdAt to a valid ISO date string', () => {
    const task = createSampleTask();
    const parsed = new Date(task.createdAt);

    expect(parsed.toISOString()).toBe(task.createdAt);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// getAll()
// ═══════════════════════════════════════════════════════════════════════════════
describe('taskService.getAll()', () => {
  it('should return an empty array when no tasks exist', () => {
    expect(taskService.getAll()).toEqual([]);
  });

  it('should return all created tasks', () => {
    createSampleTask({ title: 'Task A' });
    createSampleTask({ title: 'Task B' });

    const tasks = taskService.getAll();
    expect(tasks).toHaveLength(2);
    expect(tasks.map((t) => t.title)).toEqual(['Task A', 'Task B']);
  });

  it('should return a copy (not a reference to the internal array)', () => {
    createSampleTask();
    const tasks = taskService.getAll();

    tasks.push({ title: 'Injected' });
    expect(taskService.getAll()).toHaveLength(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// findById()
// ═══════════════════════════════════════════════════════════════════════════════
describe('taskService.findById()', () => {
  it('should return the task when a valid ID is provided', () => {
    const created = createSampleTask();
    const found = taskService.findById(created.id);

    expect(found).toEqual(created);
  });

  it('should return undefined when the ID does not exist', () => {
    expect(taskService.findById('non-existent-id')).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// getByStatus()  — BUG: uses String.includes() instead of strict equality
// ═══════════════════════════════════════════════════════════════════════════════
describe('taskService.getByStatus()', () => {
  it('should return tasks matching the given status', () => {
    createSampleTask({ title: 'A', status: 'todo' });
    createSampleTask({ title: 'B', status: 'in_progress' });
    createSampleTask({ title: 'C', status: 'done' });

    const todoTasks = taskService.getByStatus('todo');
    expect(todoTasks).toHaveLength(1);
    expect(todoTasks[0].title).toBe('A');
  });

  it('should return an empty array when no tasks match', () => {
    createSampleTask({ status: 'todo' });
    expect(taskService.getByStatus('done')).toHaveLength(0);
  });

  // This test exposes the substring-match bug:
  // .includes('do') will match 'done', 'todo', etc.
  it('BUG: should NOT match partial/substring status values', () => {
    createSampleTask({ title: 'Todo Task', status: 'todo' });
    createSampleTask({ title: 'Done Task', status: 'done' });

    // 'do' is a substring of both 'todo' and 'done'
    // With strict equality this should return 0 results
    const result = taskService.getByStatus('do');

    // This will FAIL until the bug is fixed — documenting the bug
    // Once fixed: expect(result).toHaveLength(0);
    expect(result).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// getPaginated()  — BUG: offset = page * limit instead of (page - 1) * limit
// ═══════════════════════════════════════════════════════════════════════════════
describe('taskService.getPaginated()', () => {
  beforeEach(() => {
    // Create 5 tasks so we have data to paginate
    for (let i = 1; i <= 5; i++) {
      createSampleTask({ title: `Task ${i}` });
    }
  });

  it('should return the first page of results (page=1, limit=2)', () => {
    const result = taskService.getPaginated(1, 2);

    expect(result).toHaveLength(2);
    // Page 1 should contain the first two tasks
    expect(result[0].title).toBe('Task 1');
    expect(result[1].title).toBe('Task 2');
  });

  it('should return the second page of results (page=2, limit=2)', () => {
    const result = taskService.getPaginated(2, 2);

    expect(result).toHaveLength(2);
    expect(result[0].title).toBe('Task 3');
    expect(result[1].title).toBe('Task 4');
  });

  it('should return the remaining items on the last page', () => {
    const result = taskService.getPaginated(3, 2);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Task 5');
  });

  it('should return an empty array for a page beyond the data', () => {
    const result = taskService.getPaginated(10, 2);
    expect(result).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// getStats()
// ═══════════════════════════════════════════════════════════════════════════════
describe('taskService.getStats()', () => {
  it('should return zero counts when no tasks exist', () => {
    const stats = taskService.getStats();

    expect(stats).toEqual({ todo: 0, in_progress: 0, done: 0, overdue: 0 });
  });

  it('should count tasks by status correctly', () => {
    createSampleTask({ status: 'todo' });
    createSampleTask({ status: 'todo' });
    createSampleTask({ status: 'in_progress' });
    createSampleTask({ status: 'done' });

    const stats = taskService.getStats();
    expect(stats.todo).toBe(2);
    expect(stats.in_progress).toBe(1);
    expect(stats.done).toBe(1);
  });

  it('should count overdue tasks (past dueDate and not done)', () => {
    createSampleTask({ status: 'todo', dueDate: '2000-01-01T00:00:00.000Z' }); // overdue
    createSampleTask({ status: 'in_progress', dueDate: '2000-01-01T00:00:00.000Z' }); // overdue
    createSampleTask({ status: 'done', dueDate: '2000-01-01T00:00:00.000Z' }); // done → NOT overdue
    createSampleTask({ status: 'todo', dueDate: '2099-12-31T00:00:00.000Z' }); // future → NOT overdue
    createSampleTask({ status: 'todo', dueDate: null }); // no dueDate → NOT overdue

    const stats = taskService.getStats();
    expect(stats.overdue).toBe(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// update()  — BUG: allows overwriting id, createdAt (no field protection)
// ═══════════════════════════════════════════════════════════════════════════════
describe('taskService.update()', () => {
  it('should update the specified fields on an existing task', () => {
    const task = createSampleTask();
    const updated = taskService.update(task.id, { title: 'Updated Title', priority: 'low' });

    expect(updated.title).toBe('Updated Title');
    expect(updated.priority).toBe('low');
    // Other fields should remain unchanged
    expect(updated.description).toBe(task.description);
    expect(updated.status).toBe(task.status);
  });

  it('should return null when the task does not exist', () => {
    const result = taskService.update('non-existent-id', { title: 'X' });
    expect(result).toBeNull();
  });

  it('should persist the update in the store', () => {
    const task = createSampleTask();
    taskService.update(task.id, { title: 'Persisted' });

    const found = taskService.findById(task.id);
    expect(found.title).toBe('Persisted');
  });

  // This test documents the field-overwrite bug
  it('BUG: allows overwriting protected fields like id and createdAt', () => {
    const task = createSampleTask();
    const originalId = task.id;

    const updated = taskService.update(task.id, { id: 'hacked-id' });

    // Without field protection, the id gets overwritten — this is a bug
    // Once fixed, updated.id should still equal originalId
    expect(updated.id).toBe(originalId);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// remove()
// ═══════════════════════════════════════════════════════════════════════════════
describe('taskService.remove()', () => {
  it('should remove an existing task and return true', () => {
    const task = createSampleTask();
    const result = taskService.remove(task.id);

    expect(result).toBe(true);
    expect(taskService.findById(task.id)).toBeUndefined();
  });

  it('should return false when the task does not exist', () => {
    expect(taskService.remove('non-existent-id')).toBe(false);
  });

  it('should not affect other tasks', () => {
    const t1 = createSampleTask({ title: 'Keep' });
    const t2 = createSampleTask({ title: 'Remove' });

    taskService.remove(t2.id);

    expect(taskService.getAll()).toHaveLength(1);
    expect(taskService.getAll()[0].title).toBe('Keep');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// completeTask()  — BUG: silently resets priority to 'medium'
// ═══════════════════════════════════════════════════════════════════════════════
describe('taskService.completeTask()', () => {
  it('should set status to "done" and set completedAt', () => {
    const task = createSampleTask({ status: 'todo' });
    const completed = taskService.completeTask(task.id);

    expect(completed.status).toBe('done');
    expect(completed.completedAt).toBeDefined();
    expect(new Date(completed.completedAt).toISOString()).toBe(completed.completedAt);
  });

  it('should return null when the task does not exist', () => {
    expect(taskService.completeTask('non-existent-id')).toBeNull();
  });

  // This test exposes the priority-reset bug
  it('BUG: should preserve the original priority when completing a task', () => {
    const task = createSampleTask({ priority: 'high' });
    const completed = taskService.completeTask(task.id);

    // The bug: completeTask() silently resets priority to 'medium'
    // Expected behavior: priority should remain 'high'
    expect(completed.priority).toBe('high');
  });

  it('should persist the completion in the store', () => {
    const task = createSampleTask();
    taskService.completeTask(task.id);

    const found = taskService.findById(task.id);
    expect(found.status).toBe('done');
    expect(found.completedAt).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// assignTask()
// ═══════════════════════════════════════════════════════════════════════════════
describe('taskService.assignTask()', () => {
  it('should assign a task to a user', () => {
    const task = createSampleTask();
    const updated = taskService.assignTask(task.id, 'John Doe');
    
    expect(updated.assignee).toBe('John Doe');
    expect(taskService.findById(task.id).assignee).toBe('John Doe');
  });

  it('should return null if task does not exist', () => {
    const result = taskService.assignTask('non-existent-id', 'John Doe');
    expect(result).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// _reset()
// ═══════════════════════════════════════════════════════════════════════════════
describe('taskService._reset()', () => {
  it('should clear all tasks from the store', () => {
    createSampleTask();
    createSampleTask();
    expect(taskService.getAll()).toHaveLength(2);

    taskService._reset();
    expect(taskService.getAll()).toHaveLength(0);
  });
});

