// tests/taskService.test.js
// Unit tests for the taskService business logic layer.
// These tests run against the service directly (no HTTP).

const taskService = require('../src/services/taskService');

// Reset the in-memory store before each test to ensure isolation
beforeEach(() => {
  taskService._reset();
});

// ─── getAll ──────────────────────────────────────────────────────────────────

describe('getAll', () => {
  it('returns an empty array when no tasks exist', () => {
    expect(taskService.getAll()).toEqual([]);
  });

  it('returns all created tasks', () => {
    taskService.create({ title: 'Task A' });
    taskService.create({ title: 'Task B' });
    expect(taskService.getAll()).toHaveLength(2);
  });

  it('returns a copy, not the internal array', () => {
    const result = taskService.getAll();
    result.push({ fake: true });
    expect(taskService.getAll()).toHaveLength(0);
  });
});

// ─── create ──────────────────────────────────────────────────────────────────

describe('create', () => {
  it('creates a task with required fields and sensible defaults', () => {
    const task = taskService.create({ title: 'Fix bug' });

    expect(task.id).toBeDefined();
    expect(task.title).toBe('Fix bug');
    expect(task.description).toBe('');
    expect(task.status).toBe('todo');
    expect(task.priority).toBe('medium');
    expect(task.dueDate).toBeNull();
    expect(task.completedAt).toBeNull();
    expect(task.createdAt).toBeDefined();
  });

  it('respects provided optional fields', () => {
    const task = taskService.create({
      title: 'Deploy',
      description: 'Push to prod',
      status: 'in_progress',
      priority: 'high',
      dueDate: '2026-12-31T00:00:00.000Z',
    });

    expect(task.description).toBe('Push to prod');
    expect(task.status).toBe('in_progress');
    expect(task.priority).toBe('high');
    expect(task.dueDate).toBe('2026-12-31T00:00:00.000Z');
  });

  it('assigns a unique id to each task', () => {
    const a = taskService.create({ title: 'A' });
    const b = taskService.create({ title: 'B' });
    expect(a.id).not.toBe(b.id);
  });
});

// ─── findById ────────────────────────────────────────────────────────────────

describe('findById', () => {
  it('finds a task by its id', () => {
    const task = taskService.create({ title: 'Find me' });
    expect(taskService.findById(task.id)).toMatchObject({ title: 'Find me' });
  });

  it('returns undefined when id does not exist', () => {
    expect(taskService.findById('non-existent-id')).toBeUndefined();
  });
});

// ─── getByStatus ─────────────────────────────────────────────────────────────

describe('getByStatus', () => {
  beforeEach(() => {
    taskService.create({ title: 'A', status: 'todo' });
    taskService.create({ title: 'B', status: 'in_progress' });
    taskService.create({ title: 'C', status: 'done' });
    taskService.create({ title: 'D', status: 'todo' });
  });

  it('returns only tasks matching the given status exactly', () => {
    const todos = taskService.getByStatus('todo');
    expect(todos).toHaveLength(2);
    todos.forEach(t => expect(t.status).toBe('todo'));
  });

  it('does not return tasks with a different status', () => {
    const done = taskService.getByStatus('done');
    expect(done).toHaveLength(1);
    expect(done[0].title).toBe('C');
  });

  // ⚠️  BUG TEST — this will FAIL with the current code.
  // getByStatus uses t.status.includes(status), which is a substring match.
  // Querying 'do' matches both 'todo' and 'done' — that's wrong.
  it('does NOT return tasks whose status merely contains the query as a substring', () => {
    const result = taskService.getByStatus('do');
    // 'do' is a substring of both 'todo' and 'done', but it's not a valid
    // status — the result should be empty, not 3 tasks.
    expect(result).toHaveLength(0);
  });

  it('returns empty array when no tasks match', () => {
    expect(taskService.getByStatus('in_progress').filter(t => t.title === 'Z')).toHaveLength(0);
  });
});

// ─── getPaginated ─────────────────────────────────────────────────────────────

describe('getPaginated', () => {
  beforeEach(() => {
    // Create 15 tasks so we have multiple pages
    for (let i = 1; i <= 15; i++) {
      taskService.create({ title: `Task ${i}` });
    }
  });

  // ⚠️  BUG TEST — this will FAIL with the current code.
  // The service uses `offset = page * limit` (0-based internally),
  // but the route calls getPaginated(1, 10) for the first page.
  // page=1 * limit=10 = offset 10, which skips the first 10 items!
  it('page 1 returns the FIRST set of results (items 1–10)', () => {
    const page1 = taskService.getPaginated(1, 10);
    expect(page1).toHaveLength(10);
    expect(page1[0].title).toBe('Task 1'); // first task, not Task 11
  });

  it('page 2 returns the second set of results', () => {
    const page2 = taskService.getPaginated(2, 10);
    expect(page2).toHaveLength(5);
    expect(page2[0].title).toBe('Task 11');
  });

  it('respects the limit parameter', () => {
    const page1 = taskService.getPaginated(1, 5);
    expect(page1).toHaveLength(5);
  });
});

// ─── getStats ────────────────────────────────────────────────────────────────

describe('getStats', () => {
  it('returns zero counts when store is empty', () => {
    expect(taskService.getStats()).toEqual({ todo: 0, in_progress: 0, done: 0, overdue: 0 });
  });

  it('counts tasks by status correctly', () => {
    taskService.create({ title: 'A' });                              // todo
    taskService.create({ title: 'B', status: 'in_progress' });
    taskService.create({ title: 'C', status: 'done' });
    taskService.create({ title: 'D' });                              // todo

    const stats = taskService.getStats();
    expect(stats.todo).toBe(2);
    expect(stats.in_progress).toBe(1);
    expect(stats.done).toBe(1);
  });

  it('counts overdue tasks (non-done with past dueDate)', () => {
    const pastDate = '2020-01-01T00:00:00.000Z';
    const futureDate = '2099-01-01T00:00:00.000Z';

    taskService.create({ title: 'Overdue todo', dueDate: pastDate });
    taskService.create({ title: 'Overdue in_progress', status: 'in_progress', dueDate: pastDate });
    taskService.create({ title: 'Overdue but done', status: 'done', dueDate: pastDate }); // should NOT count
    taskService.create({ title: 'Future due', dueDate: futureDate });
    taskService.create({ title: 'No due date' });

    const stats = taskService.getStats();
    expect(stats.overdue).toBe(2); // only the non-done past-due tasks
  });

  it('does not count done tasks as overdue even if due date is past', () => {
    taskService.create({ title: 'Done overdue', status: 'done', dueDate: '2020-01-01T00:00:00.000Z' });
    expect(taskService.getStats().overdue).toBe(0);
  });
});

// ─── update ──────────────────────────────────────────────────────────────────

describe('update', () => {
  it('updates allowed fields on an existing task', () => {
    const task = taskService.create({ title: 'Original' });
    const updated = taskService.update(task.id, { title: 'Updated', status: 'in_progress' });

    expect(updated.title).toBe('Updated');
    expect(updated.status).toBe('in_progress');
    expect(updated.id).toBe(task.id); // id must not change
  });

  it('returns null for a non-existent id', () => {
    expect(taskService.update('bad-id', { title: 'x' })).toBeNull();
  });

  it('persists the update in the store', () => {
    const task = taskService.create({ title: 'Persist me' });
    taskService.update(task.id, { title: 'Persisted' });
    expect(taskService.findById(task.id).title).toBe('Persisted');
  });
});

// ─── remove ──────────────────────────────────────────────────────────────────

describe('remove', () => {
  it('removes an existing task and returns true', () => {
    const task = taskService.create({ title: 'Delete me' });
    expect(taskService.remove(task.id)).toBe(true);
    expect(taskService.findById(task.id)).toBeUndefined();
  });

  it('returns false for a non-existent id', () => {
    expect(taskService.remove('bad-id')).toBe(false);
  });

  it('only removes the targeted task, not others', () => {
    const a = taskService.create({ title: 'Keep' });
    const b = taskService.create({ title: 'Remove' });
    taskService.remove(b.id);
    expect(taskService.findById(a.id)).toBeDefined();
    expect(taskService.getAll()).toHaveLength(1);
  });
});

// ─── completeTask ─────────────────────────────────────────────────────────────

describe('completeTask', () => {
  it('sets status to done and records completedAt', () => {
    const task = taskService.create({ title: 'Finish me' });
    const completed = taskService.completeTask(task.id);

    expect(completed.status).toBe('done');
    expect(completed.completedAt).not.toBeNull();
  });

  it('returns null for a non-existent id', () => {
    expect(taskService.completeTask('bad-id')).toBeNull();
  });

  // ⚠️  BUG TEST — this will FAIL with the current code.
  // completeTask hardcodes priority: 'medium', clobbering whatever was set.
  // A high-priority task should still be high-priority after being marked done.
  it('does NOT change the priority when completing a task', () => {
    const task = taskService.create({ title: 'Urgent', priority: 'high' });
    const completed = taskService.completeTask(task.id);

    // Priority should be preserved — but the current code sets it to 'medium'!
    expect(completed.priority).toBe('high');
  });

  it('preserves all other fields (title, description, etc.)', () => {
    const task = taskService.create({
      title: 'Keep fields',
      description: 'Important context',
      priority: 'low',
    });
    const completed = taskService.completeTask(task.id);

    expect(completed.title).toBe('Keep fields');
    expect(completed.description).toBe('Important context');
    expect(completed.id).toBe(task.id);
  });

  it('persists the completed state in the store', () => {
    const task = taskService.create({ title: 'Persist done' });
    taskService.completeTask(task.id);
    expect(taskService.findById(task.id).status).toBe('done');
  });
});