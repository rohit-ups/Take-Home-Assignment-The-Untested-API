const taskService = require('../src/services/taskService');

describe('taskService', () => {
  beforeEach(() => {
    taskService._reset();
  });

  test('create() stores a task with defaults', () => {
    const task = taskService.create({ title: 'Write tests' });

    expect(task.id).toBeDefined();
    expect(task.title).toBe('Write tests');
    expect(task.status).toBe('todo');
    expect(task.priority).toBe('medium');
    expect(task.description).toBe('');
    expect(task.completedAt).toBeNull();
    expect(task.createdAt).toBeDefined();
    expect(taskService.getAll()).toHaveLength(1);
  });

  test('findById() returns matching task or undefined', () => {
    const task = taskService.create({ title: 'A task' });

    expect(taskService.findById(task.id)).toMatchObject({ title: 'A task' });
    expect(taskService.findById('missing-id')).toBeUndefined();
  });

  test('getByStatus() returns only tasks for the requested status', () => {
    taskService.create({ title: 'Todo', status: 'todo' });
    taskService.create({ title: 'Done', status: 'done' });

    const done = taskService.getByStatus('done');
    expect(done).toHaveLength(1);
    expect(done[0].title).toBe('Done');
  });

  test('getPaginated() returns first page correctly', () => {
    taskService.create({ title: 'Task 1' });
    taskService.create({ title: 'Task 2' });
    taskService.create({ title: 'Task 3' });

    const page1 = taskService.getPaginated(1, 2);
    const page2 = taskService.getPaginated(2, 2);

    expect(page1.map((t) => t.title)).toEqual(['Task 1', 'Task 2']);
    expect(page2.map((t) => t.title)).toEqual(['Task 3']);
  });

  test('update() replaces provided fields and keeps others', () => {
    const task = taskService.create({ title: 'Old title', priority: 'low' });

    const updated = taskService.update(task.id, { title: 'New title' });

    expect(updated.title).toBe('New title');
    expect(updated.priority).toBe('low');
    expect(taskService.update('missing-id', { title: 'x' })).toBeNull();
  });

  test('remove() deletes an existing task', () => {
    const task = taskService.create({ title: 'Delete me' });

    expect(taskService.remove(task.id)).toBe(true);
    expect(taskService.findById(task.id)).toBeUndefined();
    expect(taskService.remove('missing-id')).toBe(false);
  });

  test('completeTask() marks task done and sets completedAt', () => {
    const task = taskService.create({ title: 'Complete me', status: 'in_progress', priority: 'high' });

    const updated = taskService.completeTask(task.id);

    expect(updated.status).toBe('done');
    expect(updated.completedAt).toBeTruthy();
    expect(taskService.completeTask('missing-id')).toBeNull();
  });

  test('assignTask() assigns a task and returns updated value', () => {
    const task = taskService.create({ title: 'Assign me' });

    const assigned = taskService.assignTask(task.id, 'Alice');

    expect(assigned.assignee).toBe('Alice');
    expect(taskService.assignTask('missing-id', 'Bob')).toBeNull();
  });

  test('getStats() returns counts and overdue values', () => {
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    taskService.create({ title: 'T1', status: 'todo', dueDate: past });
    taskService.create({ title: 'T2', status: 'in_progress', dueDate: future });
    taskService.create({ title: 'T3', status: 'done', dueDate: past });

    const stats = taskService.getStats();

    expect(stats).toEqual({
      todo: 1,
      in_progress: 1,
      done: 1,
      overdue: 1,
    });
  });
});
