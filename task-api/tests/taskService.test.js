/*
 * File Role:
 * This suite unit-tests src/services/taskService.js directly to verify business rules
 * independent of HTTP concerns. It protects data integrity semantics for CRUD,
 * assignment conflicts, completion timestamps, pagination, and stats.
 */

const taskService = require('../src/services/taskService');

/**
 * @param {void} _unused - No direct inputs; each test seeds its own state.
 * @returns {void}
 * @behavior Groups service-level behavior checks that routes depend on.
 */
describe('taskService', () => {
  /**
   * @param {void} _unused - No direct inputs.
   * @returns {void}
   * @behavior Clears process-local in-memory store so tests remain isolated and deterministic.
   */
  beforeEach(() => {
    // _reset exists specifically for test isolation because service state is module-scoped.
    taskService._reset();
  });

  /**
   * @param {void} _unused - No direct inputs.
   * @returns {void}
   * @behavior Verifies create defaults and normalization, which protects downstream API consistency.
   */
  test('create sets defaults and trims string fields', () => {
    const task = taskService.create({
      title: '  Write tests  ',
      description: '  Add unit coverage  ',
      assignee: '  Alice  ',
    });

    expect(task.title).toBe('Write tests');
    expect(task.description).toBe('Add unit coverage');
    expect(task.status).toBe('todo');
    expect(task.priority).toBe('medium');
    expect(task.assignee).toBe('Alice');
    expect(task.completedAt).toBeNull();
    expect(task.createdAt).toEqual(expect.any(String));
  });

  /**
   * @param {void} _unused - No direct inputs.
   * @returns {void}
   * @behavior Confirms completedAt is auto-populated only when create status is done.
   */
  test('create sets completedAt when status is done', () => {
    const task = taskService.create({ title: 'Already finished', status: 'done' });
    expect(task.completedAt).toEqual(expect.any(String));
  });

  /**
   * @param {void} _unused - No direct inputs.
   * @returns {void}
   * @behavior Ensures read APIs return copies so callers cannot mutate internal service state.
   */
  test('getAll returns copies and does not expose in-memory state', () => {
    taskService.create({ title: 'Original' });

    const firstRead = taskService.getAll();
    firstRead[0].title = 'Mutated in test';

    const secondRead = taskService.getAll();
    expect(secondRead[0].title).toBe('Original');
  });

  /**
   * @param {void} _unused - No direct inputs.
   * @returns {void}
   * @behavior Guards exact-match status filtering to prevent partial-text false positives.
   */
  test('getByStatus matches exact status values only', () => {
    taskService.create({ title: 'Todo task', status: 'todo' });
    taskService.create({ title: 'In progress task', status: 'in_progress' });

    const result = taskService.getByStatus('pro');
    expect(result).toHaveLength(0);
  });

  /**
   * @param {void} _unused - No direct inputs.
   * @returns {void}
   * @behavior Verifies assignee filtering is case-insensitive and whitespace-tolerant for clients.
   */
  test('getByAssignee matches assignee case-insensitively', () => {
    taskService.create({ title: 'A', assignee: 'Alice' });
    taskService.create({ title: 'B', assignee: 'alice' });
    taskService.create({ title: 'C', assignee: 'Bob' });

    const result = taskService.getByAssignee(' ALICE ').map((task) => task.title);
    expect(result).toEqual(['A', 'B']);
  });

  /**
   * @param {void} _unused - No direct inputs.
   * @returns {void}
   * @behavior Proves pagination uses one-based page semantics required by API contract.
   */
  test('getPaginated uses one-based page indexing', () => {
    taskService.create({ title: 'Task 1' });
    taskService.create({ title: 'Task 2' });
    taskService.create({ title: 'Task 3' });

    const page1 = taskService.getPaginated(1, 2).map((task) => task.title);
    const page2 = taskService.getPaginated(2, 2).map((task) => task.title);

    expect(page1).toEqual(['Task 1', 'Task 2']);
    expect(page2).toEqual(['Task 3']);
  });

  /**
   * @param {void} _unused - No direct inputs.
   * @returns {void}
   * @behavior Confirms invalid page/limit values are clamped, not allowed to produce undefined slices.
   */
  test('getPaginated clamps invalid page and limit values', () => {
    taskService.create({ title: 'Task 1' });
    taskService.create({ title: 'Task 2' });

    const result = taskService.getPaginated(0, 0).map((task) => task.title);
    expect(result).toEqual(['Task 1']);
  });

  /**
   * @param {void} _unused - No direct inputs.
   * @returns {void}
   * @behavior Verifies immutable fields are protected and completedAt syncs with status transitions.
   */
  test('update protects immutable fields and keeps completion state consistent', () => {
    const created = taskService.create({ title: 'Immutable test', priority: 'high' });

    const doneTask = taskService.update(created.id, {
      id: 'hijacked-id',
      createdAt: '2000-01-01T00:00:00.000Z',
      title: '  Updated title  ',
      status: 'done',
    });

    expect(doneTask.id).toBe(created.id);
    expect(doneTask.createdAt).toBe(created.createdAt);
    expect(doneTask.title).toBe('Updated title');
    expect(doneTask.completedAt).toEqual(expect.any(String));

    const reopenedTask = taskService.update(created.id, { status: 'todo' });
    expect(reopenedTask.completedAt).toBeNull();
  });

  /**
   * @param {void} _unused - No direct inputs.
   * @returns {void}
   * @behavior Ensures update normalization keeps persisted text values clean and comparable.
   */
  test('update normalizes description and assignee fields when present', () => {
    const created = taskService.create({ title: 'Normalize me' });

    const updated = taskService.update(created.id, {
      description: '  refined description  ',
      assignee: '  Alice  ',
    });

    expect(updated.description).toBe('refined description');
    expect(updated.assignee).toBe('Alice');
  });

  /**
   * @param {void} _unused - No direct inputs.
   * @returns {void}
   * @behavior Validates complete operation does not mutate unrelated business fields like priority.
   */
  test('completeTask marks done without altering original priority', () => {
    const created = taskService.create({ title: 'Important task', priority: 'high' });

    const completed = taskService.completeTask(created.id);

    expect(completed.status).toBe('done');
    expect(completed.priority).toBe('high');
    expect(completed.completedAt).toEqual(expect.any(String));
  });

  /**
   * @param {void} _unused - No direct inputs.
   * @returns {void}
   * @behavior Confirms assignment semantics: first assign succeeds, repeat is idempotent, reassignment conflicts.
   */
  test('assignTask handles first assignment, idempotent assignment, and reassignment conflicts', () => {
    const created = taskService.create({ title: 'Assignable' });

    const assigned = taskService.assignTask(created.id, 'Alice');
    expect(assigned.error).toBeNull();
    expect(assigned.task.assignee).toBe('Alice');

    const idempotent = taskService.assignTask(created.id, 'Alice');
    expect(idempotent.error).toBeNull();
    expect(idempotent.task.assignee).toBe('Alice');

    const conflict = taskService.assignTask(created.id, 'Bob');
    expect(conflict.error).toBe('already_assigned');
    expect(conflict.task.assignee).toBe('Alice');
  });

  /**
   * @param {void} _unused - No direct inputs.
   * @returns {void}
   * @behavior Verifies stats aggregation and confirms overdue excludes done tasks.
   */
  test('getStats counts statuses and overdue tasks correctly', () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    taskService.create({ title: 'Overdue todo', status: 'todo', dueDate: yesterday });
    taskService.create({ title: 'Done task', status: 'done', dueDate: yesterday });
    taskService.create({ title: 'In progress task', status: 'in_progress' });

    const stats = taskService.getStats();

    expect(stats).toEqual({
      todo: 1,
      in_progress: 1,
      done: 1,
      overdue: 1,
    });
  });

  /**
   * @param {void} _unused - No direct inputs.
   * @returns {void}
   * @behavior Ensures unknown statuses do not pollute known status counters.
   */
  test('getStats ignores unknown statuses in count buckets', () => {
    taskService.create({ title: 'Custom status task', status: 'archived' });

    const stats = taskService.getStats();

    expect(stats).toEqual({
      todo: 0,
      in_progress: 0,
      done: 0,
      overdue: 0,
    });
  });

  /**
   * @param {void} _unused - No direct inputs.
   * @returns {void}
   * @behavior Confirms non-existent IDs return non-throw outcomes expected by route status mapping.
   */
  test('returns null or error payloads for unknown task IDs', () => {
    expect(taskService.update('missing-id', { title: 'nope' })).toBeNull();
    expect(taskService.completeTask('missing-id')).toBeNull();
    expect(taskService.remove('missing-id')).toBe(false);

    const assignResult = taskService.assignTask('missing-id', 'Alice');
    expect(assignResult).toEqual({ error: 'not_found', task: null });
  });
});
