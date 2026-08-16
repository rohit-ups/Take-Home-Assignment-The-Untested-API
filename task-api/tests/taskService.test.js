'use strict';

const taskService = require('../src/services/taskService');

// Reset in-memory store before every test so tests are fully independent.
beforeEach(() => {
  taskService._reset();
});

// ---------------------------------------------------------------------------
// create
// ---------------------------------------------------------------------------
describe('taskService.create', () => {
  it('returns a task with a generated uuid id', () => {
    const task = taskService.create({ title: 'Test task' });
    expect(task.id).toBeDefined();
    expect(typeof task.id).toBe('string');
    expect(task.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });

  it('stores the provided title', () => {
    const task = taskService.create({ title: 'My task' });
    expect(task.title).toBe('My task');
  });

  it('defaults description to empty string', () => {
    const task = taskService.create({ title: 'x' });
    expect(task.description).toBe('');
  });

  it('defaults status to "todo"', () => {
    const task = taskService.create({ title: 'x' });
    expect(task.status).toBe('todo');
  });

  it('defaults priority to "medium"', () => {
    const task = taskService.create({ title: 'x' });
    expect(task.priority).toBe('medium');
  });

  it('defaults dueDate to null', () => {
    const task = taskService.create({ title: 'x' });
    expect(task.dueDate).toBeNull();
  });

  it('defaults completedAt to null', () => {
    const task = taskService.create({ title: 'x' });
    expect(task.completedAt).toBeNull();
  });

  it('sets a createdAt ISO timestamp', () => {
    const before = Date.now();
    const task = taskService.create({ title: 'x' });
    const after = Date.now();
    const ts = Date.parse(task.createdAt);
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });

  it('accepts optional fields when provided', () => {
    const task = taskService.create({
      title: 'Full task',
      description: 'desc',
      status: 'in_progress',
      priority: 'high',
      dueDate: '2030-12-31T00:00:00.000Z',
    });
    expect(task.description).toBe('desc');
    expect(task.status).toBe('in_progress');
    expect(task.priority).toBe('high');
    expect(task.dueDate).toBe('2030-12-31T00:00:00.000Z');
  });

  it('generates unique IDs for separate tasks', () => {
    const a = taskService.create({ title: 'a' });
    const b = taskService.create({ title: 'b' });
    expect(a.id).not.toBe(b.id);
  });
});

// ---------------------------------------------------------------------------
// getAll
// ---------------------------------------------------------------------------
describe('taskService.getAll', () => {
  it('returns an empty array when no tasks exist', () => {
    expect(taskService.getAll()).toEqual([]);
  });

  it('returns all created tasks', () => {
    taskService.create({ title: 'a' });
    taskService.create({ title: 'b' });
    expect(taskService.getAll()).toHaveLength(2);
  });

  it('returns a shallow copy — mutating the result does not affect internal state', () => {
    taskService.create({ title: 'a' });
    const all = taskService.getAll();
    all.push({ id: 'fake' });
    expect(taskService.getAll()).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// findById
// ---------------------------------------------------------------------------
describe('taskService.findById', () => {
  it('returns the task when found', () => {
    const created = taskService.create({ title: 'Find me' });
    const found = taskService.findById(created.id);
    expect(found).toBeDefined();
    expect(found.id).toBe(created.id);
  });

  it('returns undefined for an unknown id', () => {
    expect(taskService.findById('non-existent-id')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// getByStatus
// ---------------------------------------------------------------------------
describe('taskService.getByStatus', () => {
  beforeEach(() => {
    taskService.create({ title: 'a', status: 'todo' });
    taskService.create({ title: 'b', status: 'todo' });
    taskService.create({ title: 'c', status: 'in_progress' });
    taskService.create({ title: 'd', status: 'done' });
  });

  it('returns only tasks matching the given status', () => {
    const todos = taskService.getByStatus('todo');
    expect(todos).toHaveLength(2);
    todos.forEach((t) => expect(t.status).toBe('todo'));
  });

  it('returns an empty array when no tasks match', () => {
    taskService._reset();
    expect(taskService.getByStatus('done')).toHaveLength(0);
  });

  it('does not return tasks with a different status', () => {
    const done = taskService.getByStatus('done');
    expect(done).toHaveLength(1);
    expect(done[0].title).toBe('d');
  });
});

// ---------------------------------------------------------------------------
// getPaginated
// ---------------------------------------------------------------------------
describe('taskService.getPaginated', () => {
  beforeEach(() => {
    // Create 5 tasks labelled 1–5
    for (let i = 1; i <= 5; i++) {
      taskService.create({ title: `Task ${i}` });
    }
  });

  it('returns first page (page=1, limit=3) — the first 3 tasks', () => {
    // BUG EXPECTATION: with the fix, page=1 means the first page
    const page1 = taskService.getPaginated(1, 3);
    expect(page1).toHaveLength(3);
    expect(page1[0].title).toBe('Task 1');
  });

  it('returns second page (page=2, limit=3) — tasks 4 and 5', () => {
    const page2 = taskService.getPaginated(2, 3);
    expect(page2).toHaveLength(2);
    expect(page2[0].title).toBe('Task 4');
  });

  it('returns empty array for a page beyond the end', () => {
    expect(taskService.getPaginated(10, 3)).toHaveLength(0);
  });

  it('returns all tasks on page 1 when limit exceeds total count', () => {
    expect(taskService.getPaginated(1, 100)).toHaveLength(5);
  });
});

// ---------------------------------------------------------------------------
// getStats
// ---------------------------------------------------------------------------
describe('taskService.getStats', () => {
  it('returns zero counts and zero overdue when store is empty', () => {
    const stats = taskService.getStats();
    expect(stats).toEqual({ todo: 0, in_progress: 0, done: 0, overdue: 0 });
  });

  it('counts tasks by status correctly', () => {
    taskService.create({ title: 'a', status: 'todo' });
    taskService.create({ title: 'b', status: 'todo' });
    taskService.create({ title: 'c', status: 'in_progress' });
    taskService.create({ title: 'd', status: 'done' });

    const stats = taskService.getStats();
    expect(stats.todo).toBe(2);
    expect(stats.in_progress).toBe(1);
    expect(stats.done).toBe(1);
  });

  it('counts an overdue task (past dueDate, not done)', () => {
    taskService.create({ title: 'overdue', status: 'todo', dueDate: '2000-01-01T00:00:00.000Z' });
    expect(taskService.getStats().overdue).toBe(1);
  });

  it('does not count a done task as overdue even if past due', () => {
    taskService.create({ title: 'done overdue', status: 'done', dueDate: '2000-01-01T00:00:00.000Z' });
    expect(taskService.getStats().overdue).toBe(0);
  });

  it('does not count a task without dueDate as overdue', () => {
    taskService.create({ title: 'no due date', status: 'todo' });
    expect(taskService.getStats().overdue).toBe(0);
  });

  it('does not count a future-due task as overdue', () => {
    taskService.create({ title: 'future', status: 'todo', dueDate: '2099-12-31T00:00:00.000Z' });
    expect(taskService.getStats().overdue).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// update
// ---------------------------------------------------------------------------
describe('taskService.update', () => {
  it('updates the specified fields and returns the updated task', () => {
    const task = taskService.create({ title: 'Original' });
    const updated = taskService.update(task.id, { title: 'Updated', priority: 'high' });
    expect(updated.title).toBe('Updated');
    expect(updated.priority).toBe('high');
  });

  it('preserves fields that were not in the update payload', () => {
    const task = taskService.create({ title: 'x', description: 'keep me' });
    const updated = taskService.update(task.id, { title: 'y' });
    expect(updated.description).toBe('keep me');
    expect(updated.id).toBe(task.id);
  });

  it('returns null for an unknown id', () => {
    expect(taskService.update('unknown-id', { title: 'x' })).toBeNull();
  });

  it('persists the update — getAll reflects the change', () => {
    const task = taskService.create({ title: 'a' });
    taskService.update(task.id, { title: 'b' });
    const found = taskService.findById(task.id);
    expect(found.title).toBe('b');
  });
});

// ---------------------------------------------------------------------------
// remove
// ---------------------------------------------------------------------------
describe('taskService.remove', () => {
  it('returns true and removes the task', () => {
    const task = taskService.create({ title: 'delete me' });
    expect(taskService.remove(task.id)).toBe(true);
    expect(taskService.findById(task.id)).toBeUndefined();
  });

  it('returns false for an unknown id', () => {
    expect(taskService.remove('unknown-id')).toBe(false);
  });

  it('does not affect other tasks when one is deleted', () => {
    const a = taskService.create({ title: 'a' });
    const b = taskService.create({ title: 'b' });
    taskService.remove(a.id);
    expect(taskService.findById(b.id)).toBeDefined();
    expect(taskService.getAll()).toHaveLength(1);
  });

  it('returns false on a repeated delete attempt', () => {
    const task = taskService.create({ title: 'x' });
    taskService.remove(task.id);
    expect(taskService.remove(task.id)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// completeTask
// ---------------------------------------------------------------------------
describe('taskService.completeTask', () => {
  it('sets status to "done" and records completedAt', () => {
    const task = taskService.create({ title: 'finish me' });
    const before = Date.now();
    const completed = taskService.completeTask(task.id);
    const after = Date.now();

    expect(completed.status).toBe('done');
    expect(completed.completedAt).toBeDefined();
    const ts = Date.parse(completed.completedAt);
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });

  it('preserves the original priority (does not silently reset it)', () => {
    const task = taskService.create({ title: 'high priority task', priority: 'high' });
    const completed = taskService.completeTask(task.id);
    // BUG: original code resets priority to 'medium' — this test catches that
    expect(completed.priority).toBe('high');
  });

  it('returns null for an unknown id', () => {
    expect(taskService.completeTask('unknown-id')).toBeNull();
  });

  it('persists the completion — findById returns done status', () => {
    const task = taskService.create({ title: 'x' });
    taskService.completeTask(task.id);
    expect(taskService.findById(task.id).status).toBe('done');
  });
});

// ---------------------------------------------------------------------------
// _reset (state isolation helper)
// ---------------------------------------------------------------------------
describe('taskService._reset', () => {
  it('clears all tasks', () => {
    taskService.create({ title: 'a' });
    taskService.create({ title: 'b' });
    taskService._reset();
    expect(taskService.getAll()).toHaveLength(0);
  });
});
