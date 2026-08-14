const taskService = require('../src/services/taskService');

const createTask = (fields = {}) => taskService.create({ title: 'Task', ...fields });

beforeEach(() => {
  taskService._reset();
});

describe('taskService', () => {
  test('creates, lists, and finds tasks with sanitized values and defaults', () => {
    const task = createTask({ title: '  Write tests  ', description: '  Cover the service  ' });

    expect(task).toMatchObject({
      title: 'Write tests',
      description: 'Cover the service',
      status: 'todo',
      priority: 'medium',
      dueDate: null,
      completedAt: null,
    });
    expect(task.id).toEqual(expect.any(String));
    expect(Date.parse(task.createdAt)).not.toBeNaN();
    expect(taskService.getAll()).toEqual([task]);
    expect(taskService.findById(task.id)).toEqual(task);
    expect(taskService.findById('missing')).toBeUndefined();
  });

  test('filters statuses using exact equality', () => {
    createTask({ title: 'Todo', status: 'todo' });
    createTask({ title: 'Started', status: 'in_progress' });

    expect(taskService.getByStatus('todo').map((task) => task.title)).toEqual(['Todo']);
    expect(taskService.getByStatus('progress')).toEqual([]);
  });

  test('returns the requested 1-based page', () => {
    for (let number = 1; number <= 6; number++) createTask({ title: `Task ${number}` });

    expect(taskService.getPaginated(1, 5).map((task) => task.title)).toEqual([
      'Task 1',
      'Task 2',
      'Task 3',
      'Task 4',
      'Task 5',
    ]);
    expect(taskService.getPaginated(2, 5).map((task) => task.title)).toEqual(['Task 6']);
  });

  test('counts statuses and only incomplete overdue tasks', () => {
    createTask({ status: 'todo', dueDate: '2000-01-01T00:00:00.000Z' });
    createTask({ status: 'in_progress', dueDate: '2999-01-01T00:00:00.000Z' });
    createTask({ status: 'done', dueDate: '2000-01-01T00:00:00.000Z' });

    expect(taskService.getStats()).toEqual({ todo: 1, in_progress: 1, done: 1, overdue: 1 });
  });

  test('updates sanitized public fields without replacing internal fields', () => {
    const task = createTask();
    const updated = taskService.update(task.id, {
      id: 'replacement-id',
      title: '  Updated  ',
      description: '  New description  ',
      priority: 'high',
      createdAt: 'replacement-created-at',
      completedAt: 'replacement-completed-at',
    });

    expect(updated).toMatchObject({
      id: task.id,
      title: 'Updated',
      description: 'New description',
      priority: 'high',
      createdAt: task.createdAt,
      completedAt: null,
    });
    expect(taskService.update('missing', { title: 'No task' })).toBeNull();
  });

  test('removes existing tasks and reports missing tasks', () => {
    const task = createTask();

    expect(taskService.remove(task.id)).toBe(true);
    expect(taskService.remove(task.id)).toBe(false);
    expect(taskService.getAll()).toEqual([]);
  });

  test('completes tasks without changing their priority', () => {
    const task = createTask({ priority: 'high' });
    const completed = taskService.completeTask(task.id);

    expect(completed.status).toBe('done');
    expect(completed.priority).toBe('high');
    expect(Date.parse(completed.completedAt)).not.toBeNaN();
    expect(taskService.completeTask('missing')).toBeNull();
  });

  test('assigns and reassigns tasks', () => {
    const task = createTask();

    expect(taskService.assign(task.id, '  Ada  ').assignee).toBe('Ada');
    expect(taskService.assign(task.id, 'Grace').assignee).toBe('Grace');
    expect(taskService.assign('missing', 'Ada')).toBeNull();
  });
});
