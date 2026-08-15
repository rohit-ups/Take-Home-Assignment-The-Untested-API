const taskService = require('../src/services/taskService');

describe('taskService unit tests', () => {
  beforeEach(() => {
    taskService._reset();
  });

  test('create() adds a task with defaults and getAll() returns it', () => {
    const t = taskService.create({ title: 'Test task' });
    expect(t.id).toBeDefined();
    expect(t.title).toBe('Test task');
    expect(t.status).toBe('todo');
    expect(t.priority).toBe('medium');
    expect(taskService.getAll()).toHaveLength(1);
  });

  test('getByStatus() filters tasks by status', () => {
    taskService.create({ title: 'A', status: 'todo' });
    taskService.create({ title: 'B', status: 'done' });
    const done = taskService.getByStatus('done');
    expect(done).toHaveLength(1);
    expect(done[0].title).toBe('B');
  });

  test('getPaginated() returns correct slice', () => {
    for (let i = 0; i < 12; i++) taskService.create({ title: `t${i}` });
    const page1 = taskService.getPaginated(1, 5); // page 1 should return first 5 items
    expect(page1).toHaveLength(5);
    expect(page1[0].title).toBe('t0');
  });

  test('getStats() counts by status and overdue', () => {
    const past = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString();
    taskService.create({ title: 't1', status: 'todo', dueDate: past });
    taskService.create({ title: 't2', status: 'in_progress' });
    taskService.create({ title: 't3', status: 'done' });
    const stats = taskService.getStats();
    expect(stats.todo).toBe(1);
    expect(stats.in_progress).toBe(1);
    expect(stats.done).toBe(1);
    expect(stats.overdue).toBeGreaterThanOrEqual(1);
  });

  test('update() updates existing task and returns null for missing', () => {
    const t = taskService.create({ title: 'orig' });
    const updated = taskService.update(t.id, { title: 'new' });
    expect(updated.title).toBe('new');
    const missing = taskService.update('no-id', { title: 'x' });
    expect(missing).toBeNull();
  });

  test('remove() deletes and returns booleans', () => {
    const t = taskService.create({ title: 'to delete' });
    expect(taskService.remove(t.id)).toBe(true);
    expect(taskService.remove('nope')).toBe(false);
  });

  test('completeTask() marks done and sets completedAt', () => {
    const t = taskService.create({ title: 'c' });
    const done = taskService.completeTask(t.id);
    expect(done.status).toBe('done');
    expect(done.completedAt).toBeDefined();
    expect(taskService.completeTask('missing')).toBeNull();
  });

  test('assignTask assigns and overwrites assignee', () => {
    const t = taskService.create({ title: 'assignable' });
    const a1 = taskService.assignTask(t.id, 'Alice');
    expect(a1.assignee).toBe('Alice');
    const a2 = taskService.assignTask(t.id, 'Bob');
    expect(a2.assignee).toBe('Bob');
    expect(taskService.assignTask('no-id', 'X')).toBeNull();
  });
});
