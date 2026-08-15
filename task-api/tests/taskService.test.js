'use strict';

/**
 * Unit tests for src/services/taskService.js
 *
 * Strategy
 * --------
 * Each describe block owns one exported function.
 * beforeEach calls _reset() so tests never share state.
 *
 * Three deliberate failure-mode tests (marked ⚠️) are written
 * against the CORRECT expected behaviour. They will fail against
 * the current implementation and drive the fixes in taskService.js.
 *
 *   FM-1  getPaginated  – off-by-one: offset formula uses page*limit
 *                         instead of (page-1)*limit
 *   FM-2  getByStatus   – substring match: .includes(status) on the
 *                         status string instead of strict ===
 *   FM-3  completeTask  – silently resets priority to 'medium'
 */

const svc = require('../src/services/taskService');

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Quickly create a task and return it. */
const makeTask = (overrides = {}) =>
  svc.create({ title: 'Test task', ...overrides });

beforeEach(() => {
  svc._reset();
});

// ─────────────────────────────────────────────────────────────────────────────
// create
// ─────────────────────────────────────────────────────────────────────────────

describe('create', () => {
  test('happy path – returns a task with all required fields', () => {
    const task = svc.create({ title: 'Buy milk' });

    expect(task).toMatchObject({
      title: 'Buy milk',
      description: '',
      status: 'todo',
      priority: 'medium',
      dueDate: null,
      completedAt: null,
    });
    expect(task.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
    expect(typeof task.createdAt).toBe('string');
    expect(() => new Date(task.createdAt)).not.toThrow();
  });

  test('accepts optional fields and stores them', () => {
    const due = '2030-01-01T00:00:00.000Z';
    const task = svc.create({
      title: 'Ship feature',
      description: 'Write the assign endpoint',
      status: 'in_progress',
      priority: 'high',
      dueDate: due,
    });

    expect(task.description).toBe('Write the assign endpoint');
    expect(task.status).toBe('in_progress');
    expect(task.priority).toBe('high');
    expect(task.dueDate).toBe(due);
  });

  test('boundary – two tasks get distinct UUIDs', () => {
    const a = svc.create({ title: 'A' });
    const b = svc.create({ title: 'B' });
    expect(a.id).not.toBe(b.id);
  });

  test('boundary – title is stored verbatim (not trimmed by service)', () => {
    const task = svc.create({ title: '  spaces  ' });
    expect(task.title).toBe('  spaces  ');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getAll
// ─────────────────────────────────────────────────────────────────────────────

describe('getAll', () => {
  test('returns empty array when store is empty', () => {
    expect(svc.getAll()).toEqual([]);
  });

  test('returns all created tasks', () => {
    makeTask({ title: 'A' });
    makeTask({ title: 'B' });
    expect(svc.getAll()).toHaveLength(2);
  });

  test('returns a copy – mutating the result does not affect the store', () => {
    makeTask({ title: 'A' });
    const snapshot = svc.getAll();
    snapshot.push({ id: 'fake' });
    expect(svc.getAll()).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// findById
// ─────────────────────────────────────────────────────────────────────────────

describe('findById', () => {
  test('returns the correct task', () => {
    const t = makeTask({ title: 'Find me' });
    expect(svc.findById(t.id)).toMatchObject({ title: 'Find me' });
  });

  test('returns undefined for an unknown id', () => {
    expect(svc.findById('does-not-exist')).toBeUndefined();
  });

  test('boundary – returns undefined on empty store', () => {
    expect(svc.findById('any')).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getByStatus
// ─────────────────────────────────────────────────────────────────────────────

describe('getByStatus', () => {
  test('happy path – filters to only matching status', () => {
    makeTask({ title: 'A', status: 'todo' });
    makeTask({ title: 'B', status: 'in_progress' });
    makeTask({ title: 'C', status: 'done' });

    const result = svc.getByStatus('todo');
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('A');
  });

  test('returns empty array when no tasks match', () => {
    makeTask({ status: 'todo' });
    expect(svc.getByStatus('done')).toHaveLength(0);
  });

  /**
   * ⚠️  FM-2  Failure mode: getByStatus uses String.prototype.includes
   * instead of strict equality.
   * Querying status="in" should return 0 tasks, but currently returns
   * all in_progress tasks because "in_progress".includes("in") === true.
   */
  test('⚠️ FM-2 – querying a substring of a status must NOT match that status', () => {
    makeTask({ title: 'Running', status: 'in_progress' });

    // "in" is a substring of "in_progress"; strict matching must return 0
    const result = svc.getByStatus('in');
    expect(result).toHaveLength(0);
  });

  test('boundary – returns empty array when store is empty', () => {
    expect(svc.getByStatus('todo')).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getPaginated
// ─────────────────────────────────────────────────────────────────────────────

describe('getPaginated', () => {
  // Seed 5 tasks with predictable titles
  const seed = () => {
    for (let i = 1; i <= 5; i++) {
      makeTask({ title: `Task ${i}` });
    }
  };

  /**
   * ⚠️  FM-1  Failure mode: offset = page * limit instead of (page-1)*limit.
   * With the current code, getPaginated(1, 3) returns tasks[3..5] (offset=3)
   * instead of tasks[0..2] (offset=0).
   */
  test('⚠️ FM-1 – page 1 returns the FIRST page of results', () => {
    seed();
    const page1 = svc.getPaginated(1, 3);

    expect(page1).toHaveLength(3);
    expect(page1[0].title).toBe('Task 1');
    expect(page1[1].title).toBe('Task 2');
    expect(page1[2].title).toBe('Task 3');
  });

  test('page 2 returns the correct slice', () => {
    seed();
    const page2 = svc.getPaginated(2, 3);

    expect(page2).toHaveLength(2);
    expect(page2[0].title).toBe('Task 4');
    expect(page2[1].title).toBe('Task 5');
  });

  test('boundary – page beyond data returns empty array', () => {
    seed();
    expect(svc.getPaginated(99, 10)).toEqual([]);
  });

  test('boundary – limit larger than total returns all tasks', () => {
    seed();
    expect(svc.getPaginated(1, 100)).toHaveLength(5);
  });

  test('boundary – empty store returns empty array', () => {
    expect(svc.getPaginated(1, 10)).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// update
// ─────────────────────────────────────────────────────────────────────────────

describe('update', () => {
  test('happy path – merges new fields and returns the updated task', () => {
    const t = makeTask({ title: 'Old title' });
    const updated = svc.update(t.id, { title: 'New title', priority: 'high' });

    expect(updated.title).toBe('New title');
    expect(updated.priority).toBe('high');
    // Fields not in the patch are preserved
    expect(updated.status).toBe('todo');
    expect(updated.id).toBe(t.id);
  });

  test('returns null for an unknown id', () => {
    expect(svc.update('ghost-id', { title: 'X' })).toBeNull();
  });

  test('persists the update in the store', () => {
    const t = makeTask({ title: 'Before' });
    svc.update(t.id, { title: 'After' });
    expect(svc.findById(t.id).title).toBe('After');
  });

  test('boundary – updating with an empty patch preserves all fields', () => {
    const t = makeTask({ title: 'Stable' });
    const result = svc.update(t.id, {});
    expect(result).toMatchObject({ title: 'Stable', status: 'todo' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// remove
// ─────────────────────────────────────────────────────────────────────────────

describe('remove', () => {
  test('happy path – returns true and removes the task', () => {
    const t = makeTask();
    expect(svc.remove(t.id)).toBe(true);
    expect(svc.findById(t.id)).toBeUndefined();
  });

  test('returns false for an unknown id', () => {
    expect(svc.remove('ghost')).toBe(false);
  });

  test('only removes the targeted task, not others', () => {
    const a = makeTask({ title: 'Keep me' });
    const b = makeTask({ title: 'Delete me' });
    svc.remove(b.id);
    expect(svc.findById(a.id)).toBeDefined();
    expect(svc.getAll()).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// completeTask
// ─────────────────────────────────────────────────────────────────────────────

describe('completeTask', () => {
  test('happy path – sets status to done and records completedAt', () => {
    const before = Date.now();
    const t = makeTask();
    const result = svc.completeTask(t.id);

    expect(result.status).toBe('done');
    expect(result.completedAt).not.toBeNull();
    expect(new Date(result.completedAt).getTime()).toBeGreaterThanOrEqual(before);
  });

  test('returns null for an unknown id', () => {
    expect(svc.completeTask('ghost')).toBeNull();
  });

  test('persists the completion in the store', () => {
    const t = makeTask();
    svc.completeTask(t.id);
    expect(svc.findById(t.id).status).toBe('done');
  });

  /**
   * ⚠️  FM-3  Failure mode: completeTask hard-codes priority: 'medium',
   * overwriting whatever the task had.  Completing a task should only
   * update status and completedAt – not touch priority.
   */
  test('⚠️ FM-3 – completing a task must NOT change its priority', () => {
    const t = makeTask({ priority: 'high' });
    const result = svc.completeTask(t.id);
    expect(result.priority).toBe('high');
  });

  test('boundary – completing an already-done task keeps it done', () => {
    const t = makeTask();
    svc.completeTask(t.id);
    const result = svc.completeTask(t.id);
    expect(result.status).toBe('done');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getStats
// ─────────────────────────────────────────────────────────────────────────────

describe('getStats', () => {
  test('happy path – counts tasks by status correctly', () => {
    makeTask({ status: 'todo' });
    makeTask({ status: 'todo' });
    makeTask({ status: 'in_progress' });
    makeTask({ status: 'done' });

    const stats = svc.getStats();
    expect(stats.todo).toBe(2);
    expect(stats.in_progress).toBe(1);
    expect(stats.done).toBe(1);
  });

  test('counts overdue tasks (past dueDate, not done)', () => {
    const pastDate = '2000-01-01T00:00:00.000Z';
    const futureDate = '2099-01-01T00:00:00.000Z';

    makeTask({ dueDate: pastDate, status: 'todo' });          // overdue
    makeTask({ dueDate: pastDate, status: 'in_progress' });   // overdue
    makeTask({ dueDate: pastDate, status: 'done' });           // NOT overdue (done)
    makeTask({ dueDate: futureDate, status: 'todo' });         // not overdue yet
    makeTask({ dueDate: null, status: 'todo' });               // no due date

    const stats = svc.getStats();
    expect(stats.overdue).toBe(2);
  });

  test('boundary – returns all zeros on empty store', () => {
    expect(svc.getStats()).toEqual({ todo: 0, in_progress: 0, done: 0, overdue: 0 });
  });

  test('boundary – tasks with no dueDate are never counted as overdue', () => {
    makeTask({ dueDate: null, status: 'todo' });
    expect(svc.getStats().overdue).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

// BUG-7 regression — validators must reject empty-string enum values
// ─────────────────────────────────────────────────────────────────────────────

/**
 * These tests live at the service boundary but actually exercise
 * src/utils/validators.js, which validateCreateTask and validateUpdateTask
 * both delegate to.
 *
 * BUG-7: the original guard `body.status && ...` treats "" as falsy and
 * skips the check, allowing an empty-string status/priority to be stored.
 */
describe('BUG-7 regression – validators.js empty-string bypass', () => {
  const { validateCreateTask, validateUpdateTask } = require('../src/utils/validators');

  describe('validateCreateTask', () => {
    test('rejects status: "" with a validation error', () => {
      const error = validateCreateTask({ title: 'X', status: '' });
      expect(error).not.toBeNull();
      expect(error).toMatch(/status/);
    });

    test('rejects priority: "" with a validation error', () => {
      const error = validateCreateTask({ title: 'X', priority: '' });
      expect(error).not.toBeNull();
      expect(error).toMatch(/priority/);
    });
  });

  describe('validateUpdateTask', () => {
    test('rejects status: "" with a validation error', () => {
      const error = validateUpdateTask({ status: '' });
      expect(error).not.toBeNull();
      expect(error).toMatch(/status/);
    });

    test('rejects priority: "" with a validation error', () => {
      const error = validateUpdateTask({ priority: '' });
      expect(error).not.toBeNull();
      expect(error).toMatch(/priority/);
    });

    test('still accepts a valid status update (no regression)', () => {
      const error = validateUpdateTask({ status: 'done' });
      expect(error).toBeNull();
    });

    test('still accepts undefined status (field omitted, no regression)', () => {
      const error = validateUpdateTask({ title: 'Fine' });
      expect(error).toBeNull();
    });
  });
});

