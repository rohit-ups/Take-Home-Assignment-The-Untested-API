const taskService = require('../src/services/taskService');

beforeEach(() => {
  taskService._reset();
});

describe('create', () => {
  test('applies defaults for optional fields', () => {
    const task = taskService.create({ title: 'Write tests' });

    expect(task.title).toBe('Write tests');
    expect(task.description).toBe('');
    expect(task.status).toBe('todo');
    expect(task.priority).toBe('medium');
    expect(task.dueDate).toBeNull();
    expect(task.completedAt).toBeNull();
    expect(typeof task.id).toBe('string');
    expect(task.id.length).toBeGreaterThan(0);
    expect(new Date(task.createdAt).toString()).not.toBe('Invalid Date');
  });

  test('preserves explicitly provided fields', () => {
    const task = taskService.create({
      title: 'Ship feature',
      description: 'details',
      status: 'in_progress',
      priority: 'high',
      dueDate: '2026-12-01T00:00:00.000Z',
    });

    expect(task).toMatchObject({
      title: 'Ship feature',
      description: 'details',
      status: 'in_progress',
      priority: 'high',
      dueDate: '2026-12-01T00:00:00.000Z',
    });
  });

  test('assigns each task a unique id', () => {
    const a = taskService.create({ title: 'A' });
    const b = taskService.create({ title: 'B' });
    expect(a.id).not.toBe(b.id);
  });
});

describe('getAll', () => {
  test('returns an empty array when no tasks exist', () => {
    expect(taskService.getAll()).toEqual([]);
  });

  test('returns every created task', () => {
    taskService.create({ title: 'A' });
    taskService.create({ title: 'B' });
    expect(taskService.getAll()).toHaveLength(2);
  });

  test('returns a copy, not a live reference to internal state', () => {
    taskService.create({ title: 'A' });
    const result = taskService.getAll();
    result.push({ title: 'injected' });
    expect(taskService.getAll()).toHaveLength(1);
  });
});

describe('findById', () => {
  test('returns the matching task', () => {
    const created = taskService.create({ title: 'A' });
    expect(taskService.findById(created.id)).toMatchObject({ id: created.id, title: 'A' });
  });

  test('returns undefined for an unknown id', () => {
    expect(taskService.findById('does-not-exist')).toBeUndefined();
  });
});

describe('getByStatus', () => {
  test('returns only tasks with an exact status match', () => {
    taskService.create({ title: 'A', status: 'todo' });
    taskService.create({ title: 'B', status: 'done' });

    expect(taskService.getByStatus('done').map((t) => t.title)).toEqual(['B']);
  });

  test('returns an empty array for a status nothing matches', () => {
    taskService.create({ title: 'A', status: 'todo' });
    expect(taskService.getByStatus('archived')).toEqual([]);
  });

  // BUG-03 (see BUGS.md): getByStatus does `t.status.includes(status)`, a substring
  // match, instead of an exact comparison. Querying "do" incorrectly matches both
  // "todo" and "done" because both strings contain the substring "do".
  test.failing('does not substring-match an unrelated status filter', () => {
    taskService.create({ title: 'A', status: 'todo' });
    taskService.create({ title: 'B', status: 'done' });

    expect(taskService.getByStatus('do')).toEqual([]);
  });
});

describe('getPaginated', () => {
  beforeEach(() => {
    for (let i = 1; i <= 15; i++) {
      taskService.create({ title: `Task ${i}` });
    }
  });

  // BUG-01 (see BUGS.md): getPaginated computes `offset = page * limit` instead of
  // `(page - 1) * limit`. Page 1 (the default/first page) therefore skips the first
  // `limit` tasks entirely.
  test.failing('page 1 returns the first `limit` tasks', () => {
    const page1 = taskService.getPaginated(1, 5);
    expect(page1.map((t) => t.title)).toEqual(['Task 1', 'Task 2', 'Task 3', 'Task 4', 'Task 5']);
  });

  test('returns an empty array once pages are exhausted', () => {
    expect(taskService.getPaginated(100, 5)).toEqual([]);
  });

  test('respects the limit size', () => {
    expect(taskService.getPaginated(0, 5)).toHaveLength(5);
  });
});

describe('getStats', () => {
  test('counts tasks per status', () => {
    taskService.create({ title: 'A', status: 'todo' });
    taskService.create({ title: 'B', status: 'todo' });
    taskService.create({ title: 'C', status: 'in_progress' });
    taskService.create({ title: 'D', status: 'done' });

    const stats = taskService.getStats();
    expect(stats).toMatchObject({ todo: 2, in_progress: 1, done: 1 });
  });

  test('counts a task with a past dueDate as overdue', () => {
    taskService.create({ title: 'Late', dueDate: '2000-01-01T00:00:00.000Z' });
    expect(taskService.getStats().overdue).toBe(1);
  });

  test('does not count a done task as overdue even with a past dueDate', () => {
    const task = taskService.create({ title: 'Late but done', dueDate: '2000-01-01T00:00:00.000Z' });
    taskService.completeTask(task.id);
    expect(taskService.getStats().overdue).toBe(0);
  });

  test('does not count a task with no dueDate as overdue', () => {
    taskService.create({ title: 'No due date' });
    expect(taskService.getStats().overdue).toBe(0);
  });

  // The public API can't produce a status outside todo/in_progress/done (the
  // route layer validates it), but getStats() guards against it anyway. Reach
  // the store directly to exercise that guard rather than skipping the branch.
  test('does not crash or miscount when a task has an unrecognized status', () => {
    const task = taskService.create({ title: 'Weird' });
    taskService.update(task.id, { status: 'archived' });

    expect(() => taskService.getStats()).not.toThrow();
    expect(taskService.getStats()).toMatchObject({ todo: 0, in_progress: 0, done: 0 });
  });
});

describe('update', () => {
  test('merges provided fields into the existing task', () => {
    const created = taskService.create({ title: 'A', priority: 'low' });
    const updated = taskService.update(created.id, { title: 'A revised', priority: 'high' });

    expect(updated).toMatchObject({ id: created.id, title: 'A revised', priority: 'high' });
  });

  test('leaves fields not present in the patch untouched', () => {
    const created = taskService.create({ title: 'A', description: 'keep me' });
    const updated = taskService.update(created.id, { title: 'A revised' });

    expect(updated.description).toBe('keep me');
  });

  test('returns null for an unknown id', () => {
    expect(taskService.update('does-not-exist', { title: 'X' })).toBeNull();
  });

  // BUG-04 (see BUGS.md): update() spreads the entire patch body onto the stored
  // task with no field whitelist, so a caller can overwrite server-owned fields
  // like `id` and `createdAt` via PUT /tasks/:id.
  test.failing('does not allow the patch to overwrite the task id', () => {
    const created = taskService.create({ title: 'A' });
    const updated = taskService.update(created.id, { id: 'hacked-id' });

    expect(updated.id).toBe(created.id);
  });

  test.failing('does not allow the patch to overwrite createdAt', () => {
    const created = taskService.create({ title: 'A' });
    const updated = taskService.update(created.id, { createdAt: '1999-01-01T00:00:00.000Z' });

    expect(updated.createdAt).toBe(created.createdAt);
  });
});

describe('remove', () => {
  test('deletes an existing task and returns true', () => {
    const created = taskService.create({ title: 'A' });
    expect(taskService.remove(created.id)).toBe(true);
    expect(taskService.findById(created.id)).toBeUndefined();
  });

  test('returns false for an unknown id', () => {
    expect(taskService.remove('does-not-exist')).toBe(false);
  });
});

describe('completeTask', () => {
  test('sets status to done and stamps completedAt', () => {
    const created = taskService.create({ title: 'A' });
    const completed = taskService.completeTask(created.id);

    expect(completed.status).toBe('done');
    expect(new Date(completed.completedAt).toString()).not.toBe('Invalid Date');
  });

  test('returns null for an unknown id', () => {
    expect(taskService.completeTask('does-not-exist')).toBeNull();
  });

  // BUG-02 (see BUGS.md) — the bug fixed in this submission.
  // completeTask() previously hardcoded `priority: 'medium'`, silently discarding
  // whatever priority the task actually had.
  test('preserves the task priority it had before completion', () => {
    const created = taskService.create({ title: 'A', priority: 'high' });
    const completed = taskService.completeTask(created.id);

    expect(completed.priority).toBe('high');
  });
});

// New for PATCH /tasks/:id/assign (see ASSIGNMENT.md Part C).
describe('assignTask', () => {
  test('sets the assignee on the task', () => {
    const created = taskService.create({ title: 'A' });
    const assigned = taskService.assignTask(created.id, 'Priya');

    expect(assigned.assignee).toBe('Priya');
  });

  test('returns null for an unknown id', () => {
    expect(taskService.assignTask('does-not-exist', 'Priya')).toBeNull();
  });

  test('overwrites a previous assignee on reassignment', () => {
    const created = taskService.create({ title: 'A' });
    taskService.assignTask(created.id, 'Priya');
    const reassigned = taskService.assignTask(created.id, 'Sam');

    expect(reassigned.assignee).toBe('Sam');
  });

  test('does not change other fields on the task', () => {
    const created = taskService.create({ title: 'A', priority: 'high' });
    const assigned = taskService.assignTask(created.id, 'Priya');

    expect(assigned).toMatchObject({ id: created.id, title: 'A', priority: 'high' });
  });
});
