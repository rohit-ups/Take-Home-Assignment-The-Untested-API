const taskService = require('../src/services/taskService');

beforeEach(() => {
  taskService._reset();
});

// ============================================================
// create
// ============================================================
describe('create', () => {
  it('should create a task with all fields', () => {
    const task = taskService.create({
      title: 'Test task',
      description: 'A description',
      status: 'in_progress',
      priority: 'high',
      dueDate: '2026-12-31T00:00:00.000Z',
    });

    expect(task).toMatchObject({
      title: 'Test task',
      description: 'A description',
      status: 'in_progress',
      priority: 'high',
      dueDate: '2026-12-31T00:00:00.000Z',
      completedAt: null,
    });
    expect(task.id).toBeDefined();
    expect(task.createdAt).toBeDefined();
  });

  it('should apply default values when optional fields are omitted', () => {
    const task = taskService.create({ title: 'Minimal' });

    expect(task.description).toBe('');
    expect(task.status).toBe('todo');
    expect(task.priority).toBe('medium');
    expect(task.dueDate).toBeNull();
    expect(task.completedAt).toBeNull();
  });

  it('should assign unique ids to different tasks', () => {
    const t1 = taskService.create({ title: 'One' });
    const t2 = taskService.create({ title: 'Two' });
    expect(t1.id).not.toBe(t2.id);
  });
});

// ============================================================
// getAll
// ============================================================
describe('getAll', () => {
  it('should return an empty array when no tasks exist', () => {
    expect(taskService.getAll()).toEqual([]);
  });

  it('should return all created tasks', () => {
    taskService.create({ title: 'A' });
    taskService.create({ title: 'B' });
    const all = taskService.getAll();
    expect(all).toHaveLength(2);
  });

  it('should return a copy (not the internal array)', () => {
    taskService.create({ title: 'A' });
    const all = taskService.getAll();
    all.push({ title: 'rogue' });
    expect(taskService.getAll()).toHaveLength(1);
  });
});

// ============================================================
// findById
// ============================================================
describe('findById', () => {
  it('should return the correct task', () => {
    const created = taskService.create({ title: 'Find me' });
    const found = taskService.findById(created.id);
    expect(found.title).toBe('Find me');
  });

  it('should return undefined for a non-existing id', () => {
    expect(taskService.findById('no-such-id')).toBeUndefined();
  });
});

// ============================================================
// getByStatus
// ============================================================
describe('getByStatus', () => {
  it('should return only tasks matching the exact status', () => {
    taskService.create({ title: 'A', status: 'todo' });
    taskService.create({ title: 'B', status: 'done' });
    taskService.create({ title: 'C', status: 'in_progress' });

    const todos = taskService.getByStatus('todo');
    expect(todos).toHaveLength(1);
    expect(todos[0].title).toBe('A');
  });

  it('should return an empty array when no tasks match', () => {
    taskService.create({ title: 'A', status: 'todo' });
    expect(taskService.getByStatus('done')).toEqual([]);
  });

  // BUG TEST — substring matching
  it('should NOT match partial status strings (e.g. "do" should not match "done")', () => {
    taskService.create({ title: 'Done task', status: 'done' });
    const result = taskService.getByStatus('do');
    expect(result).toEqual([]);
  });
});

// ============================================================
// getPaginated
// ============================================================
describe('getPaginated', () => {
  beforeEach(() => {
    for (let i = 1; i <= 5; i++) {
      taskService.create({ title: `Task ${i}` });
    }
  });

  // BUG TEST — offset calculation
  it('page 1 should return the first `limit` items', () => {
    const page = taskService.getPaginated(1, 2);
    expect(page).toHaveLength(2);
    expect(page[0].title).toBe('Task 1');
    expect(page[1].title).toBe('Task 2');
  });

  it('page 2 with limit 2 should return items 3-4', () => {
    const page = taskService.getPaginated(2, 2);
    expect(page).toHaveLength(2);
    expect(page[0].title).toBe('Task 3');
    expect(page[1].title).toBe('Task 4');
  });

  it('should return an empty array for a page beyond the data', () => {
    const page = taskService.getPaginated(100, 2);
    expect(page).toEqual([]);
  });
});

// ============================================================
// getStats
// ============================================================
describe('getStats', () => {
  it('should return zeroes when there are no tasks', () => {
    expect(taskService.getStats()).toEqual({
      todo: 0,
      in_progress: 0,
      done: 0,
      overdue: 0,
    });
  });

  it('should count tasks by status', () => {
    taskService.create({ title: 'A', status: 'todo' });
    taskService.create({ title: 'B', status: 'todo' });
    taskService.create({ title: 'C', status: 'in_progress' });
    taskService.create({ title: 'D', status: 'done' });

    const stats = taskService.getStats();
    expect(stats.todo).toBe(2);
    expect(stats.in_progress).toBe(1);
    expect(stats.done).toBe(1);
  });

  it('should count overdue tasks (past dueDate, not done)', () => {
    taskService.create({
      title: 'Overdue',
      status: 'todo',
      dueDate: '2020-01-01T00:00:00.000Z',
    });
    taskService.create({
      title: 'Done but past due',
      status: 'done',
      dueDate: '2020-01-01T00:00:00.000Z',
    });

    const stats = taskService.getStats();
    expect(stats.overdue).toBe(1);
  });

  it('should not count tasks with future dueDate as overdue', () => {
    taskService.create({
      title: 'Future',
      status: 'todo',
      dueDate: '2099-12-31T00:00:00.000Z',
    });

    expect(taskService.getStats().overdue).toBe(0);
  });
});

// ============================================================
// update
// ============================================================
describe('update', () => {
  it('should update specified fields only', () => {
    const task = taskService.create({ title: 'Original', priority: 'low' });
    const updated = taskService.update(task.id, { title: 'Updated' });

    expect(updated.title).toBe('Updated');
    expect(updated.priority).toBe('low'); // unchanged
  });

  it('should return null for a non-existing id', () => {
    expect(taskService.update('no-such-id', { title: 'X' })).toBeNull();
  });

  it('should persist the update in the store', () => {
    const task = taskService.create({ title: 'Before' });
    taskService.update(task.id, { title: 'After' });
    expect(taskService.findById(task.id).title).toBe('After');
  });
});

// ============================================================
// remove
// ============================================================
describe('remove', () => {
  it('should remove an existing task and return true', () => {
    const task = taskService.create({ title: 'Doomed' });
    expect(taskService.remove(task.id)).toBe(true);
    expect(taskService.findById(task.id)).toBeUndefined();
  });

  it('should return false for a non-existing id', () => {
    expect(taskService.remove('no-such-id')).toBe(false);
  });
});

// ============================================================
// completeTask
// ============================================================
describe('completeTask', () => {
  it('should mark a task as done with a completedAt timestamp', () => {
    const task = taskService.create({ title: 'Finish me' });
    const completed = taskService.completeTask(task.id);

    expect(completed.status).toBe('done');
    expect(completed.completedAt).toBeDefined();
    expect(new Date(completed.completedAt).getTime()).not.toBeNaN();
  });

  it('should return null for a non-existing id', () => {
    expect(taskService.completeTask('no-such-id')).toBeNull();
  });

  // BUG TEST — priority reset
  it('should NOT change the priority of the task', () => {
    const task = taskService.create({ title: 'Important', priority: 'high' });
    const completed = taskService.completeTask(task.id);
    expect(completed.priority).toBe('high');
  });

  it('should persist the completed state in the store', () => {
    const task = taskService.create({ title: 'Persist me' });
    taskService.completeTask(task.id);
    expect(taskService.findById(task.id).status).toBe('done');
  });

  it('should be idempotent (not update completedAt if already done)', () => {
    const task = taskService.create({ title: 'Idempotent' });
    const firstComplete = taskService.completeTask(task.id);
    const originalTime = firstComplete.completedAt;

    // Wait a tiny bit (simulated/logical, or just call it immediately; timestamp resolution might be fast but it shouldn't be recreated)
    const secondComplete = taskService.completeTask(task.id);
    expect(secondComplete.completedAt).toBe(originalTime);
  });
});

// ============================================================
// _reset
// ============================================================
describe('_reset', () => {
  it('should clear all tasks', () => {
    taskService.create({ title: 'A' });
    taskService.create({ title: 'B' });
    taskService._reset();
    expect(taskService.getAll()).toEqual([]);
  });
});

// ============================================================
// assignTask
// ============================================================
describe('assignTask', () => {
  it('should assign a person to a task', () => {
    const task = taskService.create({ title: 'Assign me' });
    const assigned = taskService.assignTask(task.id, 'Alice');
    expect(assigned.assignee).toBe('Alice');
  });

  it('should return null for a non-existing id', () => {
    expect(taskService.assignTask('no-such-id', 'Alice')).toBeNull();
  });

  it('should allow reassigning to a different person', () => {
    const task = taskService.create({ title: 'Reassign me' });
    taskService.assignTask(task.id, 'Alice');
    const reassigned = taskService.assignTask(task.id, 'Bob');
    expect(reassigned.assignee).toBe('Bob');
  });

  it('should persist the assignee in the store', () => {
    const task = taskService.create({ title: 'Persist' });
    taskService.assignTask(task.id, 'Charlie');
    expect(taskService.findById(task.id).assignee).toBe('Charlie');
  });
});
