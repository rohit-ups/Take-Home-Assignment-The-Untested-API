const taskService = require('../src/services/taskService');

describe('taskService', () => {
  beforeEach(() => {
    taskService._reset();
  });

  test('create() returns task with defaults and unique id', () => {
    const task = taskService.create({ title: 'Test task' });

    expect(task.id).toBeDefined();
    expect(task.title).toBe('Test task');
    expect(task.status).toBe('todo');
    expect(task.priority).toBe('medium');
    expect(task.description).toBe('');
    expect(task.completedAt).toBeNull();
    expect(task.dueDate).toBeNull();
    expect(task.createdAt).toBeDefined();
  });

  test('getAll() returns all tasks', () => {
    const a = taskService.create({ title: 'A' });
    const b = taskService.create({ title: 'B' });

    expect(taskService.getAll()).toEqual(expect.arrayContaining([a, b]));
  });

  test('findById() returns correct or undefined', () => {
    const task = taskService.create({ title: 'Find me' });
    expect(taskService.findById(task.id)).toEqual(task);
    expect(taskService.findById('nope')).toBeUndefined();
  });

  test('getByStatus() filters by exact status', () => {
    const t1 = taskService.create({ title: 'Todo1', status: 'todo' });
    taskService.create({ title: 'Done1', status: 'done' });

    const todos = taskService.getByStatus('todo');
    expect(todos).toEqual([t1]);
    expect(taskService.getByStatus('in_progress')).toEqual([]);
  });

  test('getPaginated() returns correct pages', () => {
    for (let i = 1; i <= 12; i++) {
      taskService.create({ title: `Task ${i}` });
    }

    expect(taskService.getPaginated(1, 5).map((t) => t.title)).toEqual([
      'Task 1',
      'Task 2',
      'Task 3',
      'Task 4',
      'Task 5',
    ]);

    expect(taskService.getPaginated(2, 5).map((t) => t.title)).toEqual([
      'Task 6',
      'Task 7',
      'Task 8',
      'Task 9',
      'Task 10',
    ]);

    expect(taskService.getPaginated(3, 5).map((t) => t.title)).toEqual([
      'Task 11',
      'Task 12',
    ]);
  });

  test('getStats() counts statuses and overdue tasks', () => {
    const now = new Date();
    const past = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const future = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

    taskService.create({ title: 'Todo old', status: 'todo', dueDate: past });
    taskService.create({ title: 'InProgress', status: 'in_progress', dueDate: future });
    taskService.create({ title: 'Done old', status: 'done', dueDate: past });

    expect(taskService.getStats()).toMatchObject({
      todo: 1,
      in_progress: 1,
      done: 1,
      overdue: 1,
    });
  });

  test('update() works and returns null on missing', () => {
    const task = taskService.create({ title: 'Old' });
    const updated = taskService.update(task.id, { title: 'New', status: 'in_progress' });

    expect(updated.title).toBe('New');
    expect(updated.status).toBe('in_progress');
    expect(taskService.findById(task.id).title).toBe('New');

    expect(taskService.update('missing', { title: 'X' })).toBeNull();
  });

  test('remove() removes and returns correct bool', () => {
    const task = taskService.create({ title: 'ToDelete' });
    expect(taskService.remove(task.id)).toBe(true);
    expect(taskService.findById(task.id)).toBeUndefined();
    expect(taskService.remove('not-there')).toBe(false);
  });

  test('completeTask() marks done and sets completedAt', () => {
    const task = taskService.create({ title: 'ToComplete', priority: 'high', status: 'in_progress' });
    const completed = taskService.completeTask(task.id);

    expect(completed.status).toBe('done');
    expect(completed.priority).toBe('medium');
    expect(completed.completedAt).toBeTruthy();

    expect(taskService.completeTask('missing')).toBeNull();
  });
});
