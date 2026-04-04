const taskService = require('../src/services/taskService');

describe('taskService unit tests', () => {
  beforeEach(() => {
    taskService._reset();
  });

  it('create adds a task with defaults', () => {
    const task = taskService.create({ title: 'Unit task' });

    expect(task.id).toBeDefined();
    expect(task.title).toBe('Unit task');
    expect(task.status).toBe('todo');
    expect(task.priority).toBe('medium');
    expect(task.description).toBe('');
    expect(task.dueDate).toBeNull();
    expect(task.assignee).toBeNull();
    expect(task.completedAt).toBeNull();
    expect(task.createdAt).toBeDefined();
  });

  it('getAll returns a copy, not the internal array', () => {
    taskService.create({ title: 'A' });
    const all = taskService.getAll();

    all.push({ id: 'fake' });

    expect(taskService.getAll()).toHaveLength(1);
  });

  it('findById returns the matching task', () => {
    const created = taskService.create({ title: 'Find me' });

    const found = taskService.findById(created.id);

    expect(found.id).toBe(created.id);
    expect(found.title).toBe('Find me');
  });

  it('getByStatus filters by exact status only', () => {
    taskService.create({ title: 'Todo', status: 'todo' });
    taskService.create({ title: 'In progress', status: 'in_progress' });

    const exact = taskService.getByStatus('in_progress');
    const partial = taskService.getByStatus('in_');

    expect(exact).toHaveLength(1);
    expect(exact[0].status).toBe('in_progress');
    expect(partial).toHaveLength(0);
  });

  it('getPaginated returns first page correctly', () => {
    taskService.create({ title: 'T1' });
    taskService.create({ title: 'T2' });
    taskService.create({ title: 'T3' });

    const page1 = taskService.getPaginated(1, 2);
    const page2 = taskService.getPaginated(2, 2);

    expect(page1.map((t) => t.title)).toEqual(['T1', 'T2']);
    expect(page2.map((t) => t.title)).toEqual(['T3']);
  });

  it('update modifies existing task and returns null for missing id', () => {
    const created = taskService.create({ title: 'Before', priority: 'low' });

    const updated = taskService.update(created.id, { title: 'After' });
    const missing = taskService.update('missing-id', { title: 'X' });

    expect(updated.title).toBe('After');
    expect(updated.priority).toBe('low');
    expect(missing).toBeNull();
  });

  it('remove deletes existing task and returns false for missing id', () => {
    const created = taskService.create({ title: 'Delete me' });

    expect(taskService.remove(created.id)).toBe(true);
    expect(taskService.remove(created.id)).toBe(false);
  });

  it('completeTask marks task done and sets completedAt', () => {
    const created = taskService.create({ title: 'Finish', status: 'in_progress', priority: 'high' });

    const completed = taskService.completeTask(created.id);

    expect(completed.status).toBe('done');
    expect(completed.priority).toBe('high');
    expect(completed.completedAt).toBeDefined();
    expect(taskService.completeTask('missing-id')).toBeNull();
  });

  it('assignTask sets assignee, handles missing id, and prevents reassignment', () => {
    const created = taskService.create({ title: 'Assignable' });

    const assigned = taskService.assignTask(created.id, 'Amit');
    const reassigned = taskService.assignTask(created.id, 'John');
    const missing = taskService.assignTask('missing-id', 'Ghost');

    expect(assigned.assignee).toBe('Amit');
    expect(reassigned).toBe(false);
    expect(missing).toBeNull();
  });

  it('getStats counts statuses and overdue tasks', () => {
    const past = new Date(Date.now() - 86400000).toISOString();

    taskService.create({ title: 'Todo overdue', status: 'todo', dueDate: past });
    taskService.create({ title: 'In progress', status: 'in_progress' });
    taskService.create({ title: 'Done', status: 'done', dueDate: past });

    const stats = taskService.getStats();

    expect(stats).toEqual({
      todo: 1,
      in_progress: 1,
      done: 1,
      overdue: 1,
    });
  });
});
