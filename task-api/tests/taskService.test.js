const taskService = require('../src/services/taskService');

beforeEach(() => {
  taskService._reset();
});

describe('create', () => {
  it('creates a task with default values', () => {
    const task = taskService.create({ title: 'Buy milk' });

    expect(task.title).toBe('Buy milk');
    expect(task.status).toBe('todo');
    expect(task.priority).toBe('medium');
    expect(task.completedAt).toBeNull();
    expect(task.id).toBeTruthy();
  });

  it('adds the task to the list', () => {
    taskService.create({ title: 'Buy milk' });

    expect(taskService.getAll()).toHaveLength(1);
  });
});

describe('findById', () => {
  it('finds a task by id and returns undefined for a wrong id', () => {
    const created = taskService.create({ title: 'Buy milk' });

    expect(taskService.findById(created.id).id).toBe(created.id);
    expect(taskService.findById('wrong-id')).toBeUndefined();
  });
});

describe('update', () => {
  it('updates a task and returns null for a wrong id', () => {
    const created = taskService.create({ title: 'Buy milk' });

    const updated = taskService.update(created.id, { title: 'Buy bread' });
    expect(updated.title).toBe('Buy bread');

    expect(taskService.update('wrong-id', { title: 'x' })).toBeNull();
  });
});

describe('remove', () => {
  it('removes a task and returns false for a wrong id', () => {
    const created = taskService.create({ title: 'Buy milk' });

    expect(taskService.remove(created.id)).toBe(true);
    expect(taskService.getAll()).toHaveLength(0);

    expect(taskService.remove('wrong-id')).toBe(false);
  });
});

describe('completeTask', () => {
  it('marks a task as done', () => {
    const created = taskService.create({ title: 'Buy milk' });

    const completed = taskService.completeTask(created.id);
    expect(completed.status).toBe('done');
    expect(completed.completedAt).toBeTruthy();
  });

  it('keeps the priority when completing a task', () => {
    const created = taskService.create({ title: 'Buy milk', priority: 'high' });

    const completed = taskService.completeTask(created.id);
    expect(completed.priority).toBe('high');
  });

  it('returns null for a wrong id', () => {
    expect(taskService.completeTask('wrong-id')).toBeNull();
  });
});

describe('getStats', () => {
  it('counts tasks by status and overdue tasks', () => {
    taskService.create({ title: 'one' });
    taskService.create({ title: 'two', status: 'done' });
    taskService.create({ title: 'late', dueDate: '2020-01-01' });

    const stats = taskService.getStats();
    expect(stats.todo).toBe(2);
    expect(stats.done).toBe(1);
    expect(stats.in_progress).toBe(0);
    expect(stats.overdue).toBe(1);
  });
});

describe('getByStatus', () => {
  it('returns tasks matching the status string', () => {
    taskService.create({ title: 'one', status: 'in_progress' });
    taskService.create({ title: 'two', status: 'todo' });

    expect(taskService.getByStatus('in_progress')).toHaveLength(1);
    expect(taskService.getByStatus('todo')).toHaveLength(1);
    expect(taskService.getByStatus('nothing')).toHaveLength(0);
  });
});

describe('getPaginated', () => {
  it('returns the first page when page is 1', () => {
    taskService.create({ title: 'one' });
    taskService.create({ title: 'two' });
    taskService.create({ title: 'three' });

    const result = taskService.getPaginated(1, 2);
    expect(result).toHaveLength(2);
    expect(result[0].title).toBe('one');
  });
});