const taskService = require('../src/services/taskService');

describe('taskService', () => {
  beforeEach(() => {
    taskService._reset();
  });

  it('creates a task with defaults', () => {
    const task = taskService.create({ title: 'Write tests' });

    expect(task).toMatchObject({
      title: 'Write tests',
      description: '',
      status: 'todo',
      priority: 'medium',
      dueDate: null,
      assignee: null,
      completedAt: null,
    });
    expect(task.id).toEqual(expect.any(String));
    expect(task.createdAt).toEqual(expect.any(String));
  });

  it('filters tasks by exact status', () => {
    taskService.create({ title: 'Todo task', status: 'todo' });
    taskService.create({ title: 'Doing task', status: 'in_progress' });
    taskService.create({ title: 'Done task', status: 'done' });

    const tasks = taskService.getByStatus('todo');

    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toBe('Todo task');
  });

  it('returns the first page of paginated tasks using 1-based pages', () => {
    const titles = ['one', 'two', 'three', 'four'];
    titles.forEach((title) => taskService.create({ title }));

    // This test locks in the bug fix so page=1 keeps returning the first records.
    const pageOne = taskService.getPaginated(1, 2);
    const pageTwo = taskService.getPaginated(2, 2);

    expect(pageOne.map((task) => task.title)).toEqual(['one', 'two']);
    expect(pageTwo.map((task) => task.title)).toEqual(['three', 'four']);
  });

  it('calculates stats including overdue incomplete tasks', () => {
    // Only unfinished tasks with past due dates should count as overdue.
    taskService.create({
      title: 'Overdue todo',
      status: 'todo',
      dueDate: '2000-01-01T00:00:00.000Z',
    });
    taskService.create({
      title: 'In progress task',
      status: 'in_progress',
      dueDate: '2999-01-01T00:00:00.000Z',
    });
    taskService.create({
      title: 'Completed task',
      status: 'done',
      dueDate: '2000-01-01T00:00:00.000Z',
    });

    const stats = taskService.getStats();

    expect(stats).toEqual({
      todo: 1,
      in_progress: 1,
      done: 1,
      overdue: 1,
    });
  });

  it('updates an existing task and returns null for unknown ids', () => {
    const task = taskService.create({ title: 'Original' });

    const updated = taskService.update(task.id, { title: 'Updated', priority: 'high' });

    expect(updated).toMatchObject({
      id: task.id,
      title: 'Updated',
      priority: 'high',
    });
    expect(taskService.update('missing-id', { title: 'Nope' })).toBeNull();
  });

  it('marks a task complete and stamps completedAt', () => {
    const task = taskService.create({ title: 'Ship feature', status: 'in_progress', priority: 'high' });

    const completed = taskService.completeTask(task.id);

    expect(completed).toMatchObject({
      id: task.id,
      status: 'done',
      priority: 'medium',
    });
    expect(completed.completedAt).toEqual(expect.any(String));
  });

  it('assigns a task to a user', () => {
    const task = taskService.create({ title: 'Pair on API' });

    const updated = taskService.assignTask(task.id, 'Jamie');

    expect(updated).toMatchObject({
      id: task.id,
      assignee: 'Jamie',
    });
  });

  it('removes a task and reports whether deletion happened', () => {
    const task = taskService.create({ title: 'Delete me' });

    expect(taskService.remove(task.id)).toBe(true);
    expect(taskService.findById(task.id)).toBeUndefined();
    expect(taskService.remove(task.id)).toBe(false);
  });
});
