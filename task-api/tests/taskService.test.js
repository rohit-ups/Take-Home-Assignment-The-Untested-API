'use strict';

const taskService = require('../src/services/taskService');

beforeEach(() => {
  taskService._reset();
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeTask = (overrides = {}) =>
  taskService.create({ title: 'Test task', ...overrides });

// ─── getAll ───────────────────────────────────────────────────────────────────

describe('getAll', () => {
  it('returns an empty array when no tasks exist', () => {
    expect(taskService.getAll()).toEqual([]);
  });

  it('returns a copy — mutating the result does not affect the store', () => {
    makeTask();
    const all = taskService.getAll();
    all.push({ id: 'fake' });
    expect(taskService.getAll()).toHaveLength(1);
  });

  it('returns all created tasks', () => {
    makeTask({ title: 'A' });
    makeTask({ title: 'B' });
    expect(taskService.getAll()).toHaveLength(2);
  });
});

// ─── findById ─────────────────────────────────────────────────────────────────

describe('findById', () => {
  it('returns the task when it exists', () => {
    const task = makeTask();
    expect(taskService.findById(task.id)).toMatchObject({ id: task.id });
  });

  it('returns undefined for a non-existent id', () => {
    expect(taskService.findById('does-not-exist')).toBeUndefined();
  });
});

// ─── getByStatus ─────────────────────────────────────────────────────────────

describe('getByStatus', () => {
  it('returns only tasks matching the exact status', () => {
    makeTask({ status: 'todo' });
    makeTask({ status: 'done' });
    makeTask({ status: 'in_progress' });

    const todos = taskService.getByStatus('todo');
    expect(todos).toHaveLength(1);
    expect(todos[0].status).toBe('todo');
  });

  it('does NOT return partial substring matches (B1 regression)', () => {
    // "do" is a substring of both "todo" and "done"
    makeTask({ status: 'todo' });
    makeTask({ status: 'done' });

    const result = taskService.getByStatus('do');
    expect(result).toHaveLength(0);
  });

  it('returns an empty array when no tasks match', () => {
    makeTask({ status: 'todo' });
    expect(taskService.getByStatus('done')).toHaveLength(0);
  });

  it('returns all tasks with in_progress status', () => {
    makeTask({ status: 'in_progress' });
    makeTask({ status: 'in_progress' });
    makeTask({ status: 'todo' });
    expect(taskService.getByStatus('in_progress')).toHaveLength(2);
  });
});

// ─── getPaginated ─────────────────────────────────────────────────────────────

describe('getPaginated', () => {
  beforeEach(() => {
    for (let i = 1; i <= 25; i++) {
      makeTask({ title: `Task ${i}` });
    }
  });

  it('page 1 returns the first batch of results', () => {
    const results = taskService.getPaginated(1, 10);
    expect(results).toHaveLength(10);
    expect(results[0].title).toBe('Task 1');
  });

  it('page 2 returns the second batch', () => {
    const results = taskService.getPaginated(2, 10);
    expect(results).toHaveLength(10);
    expect(results[0].title).toBe('Task 11');
  });

  it('last page returns the remaining items', () => {
    const results = taskService.getPaginated(3, 10);
    expect(results).toHaveLength(5);
  });

  it('page beyond the last returns an empty array', () => {
    const results = taskService.getPaginated(100, 10);
    expect(results).toHaveLength(0);
  });

  it('respects a custom limit', () => {
    const results = taskService.getPaginated(1, 5);
    expect(results).toHaveLength(5);
  });
});

// ─── getStats ─────────────────────────────────────────────────────────────────

describe('getStats', () => {
  it('returns zeroes when the store is empty', () => {
    expect(taskService.getStats()).toEqual({ todo: 0, in_progress: 0, done: 0, overdue: 0 });
  });

  it('counts each status correctly', () => {
    makeTask({ status: 'todo' });
    makeTask({ status: 'todo' });
    makeTask({ status: 'in_progress' });
    makeTask({ status: 'done' });
    const stats = taskService.getStats();
    expect(stats.todo).toBe(2);
    expect(stats.in_progress).toBe(1);
    expect(stats.done).toBe(1);
  });

  it('counts overdue tasks (non-done with past dueDate)', () => {
    makeTask({ dueDate: '2000-01-01T00:00:00.000Z', status: 'todo' });
    makeTask({ dueDate: '2000-01-01T00:00:00.000Z', status: 'in_progress' });
    makeTask({ dueDate: '2000-01-01T00:00:00.000Z', status: 'done' }); // done — not overdue
    const stats = taskService.getStats();
    expect(stats.overdue).toBe(2);
  });

  it('does not count future-due tasks as overdue', () => {
    makeTask({ dueDate: '2099-01-01T00:00:00.000Z', status: 'todo' });
    expect(taskService.getStats().overdue).toBe(0);
  });

  it('does not count tasks without a dueDate as overdue', () => {
    makeTask({ status: 'todo', dueDate: null });
    expect(taskService.getStats().overdue).toBe(0);
  });
});

// ─── create ───────────────────────────────────────────────────────────────────

describe('create', () => {
  it('creates a task with required fields and defaults', () => {
    const task = makeTask();
    expect(task).toMatchObject({
      title: 'Test task',
      description: '',
      status: 'todo',
      priority: 'medium',
      dueDate: null,
      completedAt: null,
    });
    expect(task.id).toBeDefined();
    expect(task.createdAt).toBeDefined();
  });

  it('creates a task with all optional fields provided', () => {
    const task = makeTask({
      description: 'desc',
      status: 'in_progress',
      priority: 'high',
      dueDate: '2099-12-31T00:00:00.000Z',
    });
    expect(task.description).toBe('desc');
    expect(task.status).toBe('in_progress');
    expect(task.priority).toBe('high');
    expect(task.dueDate).toBe('2099-12-31T00:00:00.000Z');
  });

  it('assigns unique ids to each task', () => {
    const t1 = makeTask();
    const t2 = makeTask();
    expect(t1.id).not.toBe(t2.id);
  });
});

// ─── update ───────────────────────────────────────────────────────────────────

describe('update', () => {
  it('updates allowed fields and returns the updated task', () => {
    const task = makeTask();
    const updated = taskService.update(task.id, { title: 'Updated', priority: 'high' });
    expect(updated.title).toBe('Updated');
    expect(updated.priority).toBe('high');
  });

  it('preserves fields not mentioned in the update', () => {
    const task = makeTask({ description: 'keep me' });
    const updated = taskService.update(task.id, { title: 'new title' });
    expect(updated.description).toBe('keep me');
  });

  it('returns null for a non-existent id', () => {
    expect(taskService.update('ghost-id', { title: 'x' })).toBeNull();
  });

  it('persists the update in the store', () => {
    const task = makeTask();
    taskService.update(task.id, { title: 'Persisted' });
    expect(taskService.findById(task.id).title).toBe('Persisted');
  });
});

// ─── remove ───────────────────────────────────────────────────────────────────

describe('remove', () => {
  it('returns true and removes the task from the store', () => {
    const task = makeTask();
    expect(taskService.remove(task.id)).toBe(true);
    expect(taskService.findById(task.id)).toBeUndefined();
  });

  it('returns false for a non-existent id', () => {
    expect(taskService.remove('ghost-id')).toBe(false);
  });

  it('only removes the targeted task', () => {
    const t1 = makeTask({ title: 'keep' });
    const t2 = makeTask({ title: 'delete' });
    taskService.remove(t2.id);
    expect(taskService.getAll()).toHaveLength(1);
    expect(taskService.findById(t1.id)).toBeDefined();
  });
});

// ─── completeTask ─────────────────────────────────────────────────────────────

describe('completeTask', () => {
  it('sets status to done and sets completedAt', () => {
    const task = makeTask({ status: 'in_progress' });
    const updated = taskService.completeTask(task.id);
    expect(updated.status).toBe('done');
    expect(updated.completedAt).not.toBeNull();
  });

  it('does NOT change the task priority (B3 regression)', () => {
    const task = makeTask({ priority: 'high' });
    const updated = taskService.completeTask(task.id);
    expect(updated.priority).toBe('high');
  });

  it('returns null for a non-existent id', () => {
    expect(taskService.completeTask('ghost-id')).toBeNull();
  });

  it('persists the completion in the store', () => {
    const task = makeTask();
    taskService.completeTask(task.id);
    expect(taskService.findById(task.id).status).toBe('done');
  });
});

// ─── assignTask ───────────────────────────────────────────────────────────────

describe('assignTask', () => {
  it('sets the assignee on the task and returns the updated task', () => {
    const task = makeTask();
    const updated = taskService.assignTask(task.id, 'Alice');
    expect(updated.assignee).toBe('Alice');
  });

  it('returns null for a non-existent id', () => {
    expect(taskService.assignTask('ghost-id', 'Alice')).toBeNull();
  });

  it('allows reassigning a task to a new person', () => {
    const task = makeTask();
    taskService.assignTask(task.id, 'Alice');
    const updated = taskService.assignTask(task.id, 'Bob');
    expect(updated.assignee).toBe('Bob');
  });

  it('persists the assignee in the store', () => {
    const task = makeTask();
    taskService.assignTask(task.id, 'Alice');
    expect(taskService.findById(task.id).assignee).toBe('Alice');
  });
});
