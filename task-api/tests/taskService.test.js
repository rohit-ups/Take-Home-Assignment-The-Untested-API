/**
 * Unit Tests for taskService.js
 *
 * Tests every exported function from the task service layer directly,
 * without going through HTTP. This isolates business logic from routing
 * and validates the in-memory data store operations.
 */

const taskService = require('../src/services/taskService');

/* ------------------------------------------------------------------ */
/*  Test lifecycle — reset the in-memory store between every test      */
/* ------------------------------------------------------------------ */
beforeEach(() => {
  taskService._reset();
});

/* ================================================================== */
/*  Helper: create a task with sensible defaults                      */
/* ================================================================== */
const createTask = (overrides = {}) =>
  taskService.create({ title: 'Test Task', ...overrides });

/* ================================================================== */
/*  _reset                                                            */
/* ================================================================== */
describe('_reset', () => {
  it('should clear all tasks from the store', () => {
    createTask();
    createTask({ title: 'Another' });

    taskService._reset();

    expect(taskService.getAll()).toHaveLength(0);
  });
});

/* ================================================================== */
/*  create                                                            */
/* ================================================================== */
describe('create', () => {
  it('should create a task with required title and apply defaults', () => {
    const task = taskService.create({ title: 'Buy milk' });

    expect(task).toMatchObject({
      title: 'Buy milk',
      description: '',
      status: 'todo',
      priority: 'medium',
      dueDate: null,
      completedAt: null,
    });
    // System-generated fields
    expect(task.id).toBeDefined();
    expect(task.createdAt).toBeDefined();
    expect(new Date(task.createdAt).toISOString()).toBe(task.createdAt);
  });

  it('should create a task with all fields provided', () => {
    const task = taskService.create({
      title: 'Deploy',
      description: 'Push to prod',
      status: 'in_progress',
      priority: 'high',
      dueDate: '2026-12-31T00:00:00.000Z',
    });

    expect(task).toMatchObject({
      title: 'Deploy',
      description: 'Push to prod',
      status: 'in_progress',
      priority: 'high',
      dueDate: '2026-12-31T00:00:00.000Z',
      completedAt: null,
    });
  });

  it('should assign unique IDs to each task', () => {
    const t1 = createTask({ title: 'First' });
    const t2 = createTask({ title: 'Second' });

    expect(t1.id).not.toBe(t2.id);
  });

  it('should add the task to the store', () => {
    createTask();

    expect(taskService.getAll()).toHaveLength(1);
  });
});

/* ================================================================== */
/*  getAll                                                            */
/* ================================================================== */
describe('getAll', () => {
  it('should return an empty array when no tasks exist', () => {
    expect(taskService.getAll()).toEqual([]);
  });

  it('should return all created tasks', () => {
    createTask({ title: 'A' });
    createTask({ title: 'B' });
    createTask({ title: 'C' });

    const all = taskService.getAll();
    expect(all).toHaveLength(3);
    expect(all.map((t) => t.title)).toEqual(['A', 'B', 'C']);
  });

  it('should return a shallow copy so mutations do not affect the store', () => {
    createTask();

    const all = taskService.getAll();
    all.pop(); // mutate the returned array

    expect(taskService.getAll()).toHaveLength(1); // store is unaffected
  });
});

/* ================================================================== */
/*  findById                                                          */
/* ================================================================== */
describe('findById', () => {
  it('should return the task matching the given ID', () => {
    const created = createTask({ title: 'Find me' });

    const found = taskService.findById(created.id);

    expect(found).toBeDefined();
    expect(found.title).toBe('Find me');
  });

  it('should return undefined when no task matches', () => {
    expect(taskService.findById('non-existent-id')).toBeUndefined();
  });
});

/* ================================================================== */
/*  getByStatus                                                       */
/* ================================================================== */
describe('getByStatus', () => {
  beforeEach(() => {
    createTask({ title: 'Todo 1', status: 'todo' });
    createTask({ title: 'Todo 2', status: 'todo' });
    createTask({ title: 'In Progress', status: 'in_progress' });
    createTask({ title: 'Done', status: 'done' });
  });

  it('should return only tasks with the exact matching status', () => {
    const todos = taskService.getByStatus('todo');

    expect(todos).toHaveLength(2);
    todos.forEach((t) => expect(t.status).toBe('todo'));
  });

  it('should return an empty array when no tasks match the status', () => {
    expect(taskService.getByStatus('nonexistent')).toEqual([]);
  });

  /**
   * BUG: getByStatus uses String.prototype.includes() instead of ===.
   * This means a partial match like "do" matches both "todo" and "done".
   *
   * This test documents the bug — it will FAIL if the bug is fixed
   * (which is the correct outcome). Flip the assertion after fixing.
   */
  it('BUG: substring match — "do" incorrectly matches "todo" and "done"', () => {
    const results = taskService.getByStatus('do');

    // Current (buggy) behaviour: includes() matches "todo" and "done"
    // Expected (correct) behaviour: strict === would return []
    expect(results.length).toBeGreaterThan(0); // proves the bug exists
  });
});

/* ================================================================== */
/*  getPaginated                                                      */
/* ================================================================== */
describe('getPaginated', () => {
  beforeEach(() => {
    // Create 5 tasks with deterministic titles
    for (let i = 1; i <= 5; i++) {
      createTask({ title: `Task ${i}` });
    }
  });

  it('should return the correct slice for page 1', () => {
    const result = taskService.getPaginated(1, 2);

    expect(result).toHaveLength(2);
    expect(result[0].title).toBe('Task 1');
    expect(result[1].title).toBe('Task 2');
  });

  it('should return the correct slice for page 2', () => {
    const result = taskService.getPaginated(2, 2);

    expect(result).toHaveLength(2);
    expect(result[0].title).toBe('Task 3');
    expect(result[1].title).toBe('Task 4');
  });

  it('should return a partial page when at the end of the list', () => {
    const result = taskService.getPaginated(3, 2);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Task 5');
  });

  it('should return an empty array for a page beyond the total', () => {
    const result = taskService.getPaginated(10, 2);

    expect(result).toEqual([]);
  });
});

/* ================================================================== */
/*  getStats                                                          */
/* ================================================================== */
describe('getStats', () => {
  it('should return zero counts when the store is empty', () => {
    const stats = taskService.getStats();

    expect(stats).toEqual({ todo: 0, in_progress: 0, done: 0, overdue: 0 });
  });

  it('should correctly count tasks by status', () => {
    createTask({ status: 'todo' });
    createTask({ status: 'todo' });
    createTask({ status: 'in_progress' });
    createTask({ status: 'done' });

    const stats = taskService.getStats();

    expect(stats.todo).toBe(2);
    expect(stats.in_progress).toBe(1);
    expect(stats.done).toBe(1);
  });

  it('should count overdue tasks (past due, not done)', () => {
    // Overdue: past due date + not done
    createTask({
      status: 'todo',
      dueDate: '2020-01-01T00:00:00.000Z',
    });
    // Not overdue: past due date but done
    createTask({
      status: 'done',
      dueDate: '2020-01-01T00:00:00.000Z',
    });
    // Not overdue: future due date
    createTask({
      status: 'todo',
      dueDate: '2099-12-31T00:00:00.000Z',
    });
    // Not overdue: no due date
    createTask({ status: 'todo' });

    const stats = taskService.getStats();

    expect(stats.overdue).toBe(1);
  });
});

/* ================================================================== */
/*  update                                                            */
/* ================================================================== */
describe('update', () => {
  it('should update the specified fields on an existing task', () => {
    const task = createTask({ title: 'Original' });

    const updated = taskService.update(task.id, {
      title: 'Updated',
      priority: 'high',
    });

    expect(updated.title).toBe('Updated');
    expect(updated.priority).toBe('high');
    // Unchanged fields remain
    expect(updated.status).toBe('todo');
  });

  it('should return null when the task does not exist', () => {
    const result = taskService.update('non-existent-id', { title: 'Nope' });

    expect(result).toBeNull();
  });

  it('should persist the update in the store', () => {
    const task = createTask({ title: 'Old' });

    taskService.update(task.id, { title: 'New' });

    const found = taskService.findById(task.id);
    expect(found.title).toBe('New');
  });

  /**
   * BUG: update allows overwriting system-managed fields (id, createdAt).
   * The spread `{ ...tasks[index], ...fields }` does not filter out
   * protected keys.
   */
  it('BUG: allows overwriting the task id via update', () => {
    const task = createTask();

    const updated = taskService.update(task.id, { id: 'hacked-id' });

    // Current (buggy) behaviour: id is overwritten
    expect(updated.id).toBe('hacked-id');
    // After fix: expect(updated.id).toBe(task.id);
  });
});

/* ================================================================== */
/*  remove                                                            */
/* ================================================================== */
describe('remove', () => {
  it('should delete the task and return true', () => {
    const task = createTask();

    const result = taskService.remove(task.id);

    expect(result).toBe(true);
    expect(taskService.getAll()).toHaveLength(0);
  });

  it('should return false when the task does not exist', () => {
    const result = taskService.remove('non-existent-id');

    expect(result).toBe(false);
  });

  it('should not affect other tasks when one is removed', () => {
    const t1 = createTask({ title: 'Keep' });
    const t2 = createTask({ title: 'Remove' });

    taskService.remove(t2.id);

    expect(taskService.getAll()).toHaveLength(1);
    expect(taskService.getAll()[0].id).toBe(t1.id);
  });
});

/* ================================================================== */
/*  completeTask                                                      */
/* ================================================================== */
describe('completeTask', () => {
  it('should mark the task as done with a completedAt timestamp', () => {
    const task = createTask({ status: 'todo' });

    const completed = taskService.completeTask(task.id);

    expect(completed.status).toBe('done');
    expect(completed.completedAt).toBeDefined();
    expect(new Date(completed.completedAt).toISOString()).toBe(
      completed.completedAt,
    );
  });

  it('should return null when the task does not exist', () => {
    const result = taskService.completeTask('non-existent-id');

    expect(result).toBeNull();
  });

  it('should persist the completion in the store', () => {
    const task = createTask();

    taskService.completeTask(task.id);

    const found = taskService.findById(task.id);
    expect(found.status).toBe('done');
  });

  /**
   * BUG: completeTask resets the priority to 'medium', regardless of
   * the task's original priority. A high-priority task silently becomes
   * medium-priority when completed.
   */
  it('BUG: completing a high-priority task resets priority to medium', () => {
    const task = createTask({ priority: 'high' });

    const completed = taskService.completeTask(task.id);

    // Current (buggy) behaviour: priority is reset to 'medium'
    expect(completed.priority).toBe('medium');
    // After fix: expect(completed.priority).toBe('high');
  });
});

/* ================================================================== */
/*  assignTask                                                        */
/* ================================================================== */
describe('assignTask', () => {
  it('should assign a user to an existing task', () => {
    const task = createTask();

    const assigned = taskService.assignTask(task.id, 'Alice');

    expect(assigned.assignee).toBe('Alice');
  });

  it('should return null when the task does not exist', () => {
    const result = taskService.assignTask('non-existent-id', 'Alice');

    expect(result).toBeNull();
  });

  it('should allow reassignment to a different user', () => {
    const task = createTask();

    taskService.assignTask(task.id, 'Alice');
    const reassigned = taskService.assignTask(task.id, 'Bob');

    expect(reassigned.assignee).toBe('Bob');
  });

  it('should persist the assignment in the store', () => {
    const task = createTask();

    taskService.assignTask(task.id, 'Charlie');

    const found = taskService.findById(task.id);
    expect(found.assignee).toBe('Charlie');
  });

  it('should not modify other task fields when assigning', () => {
    const task = createTask({ title: 'Important', priority: 'high' });

    const assigned = taskService.assignTask(task.id, 'Diana');

    expect(assigned.title).toBe('Important');
    expect(assigned.priority).toBe('high');
    expect(assigned.status).toBe('todo');
  });
});
