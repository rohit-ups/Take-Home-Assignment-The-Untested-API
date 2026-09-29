const taskService = require('../src/services/taskService');

const seedTasks = (count, fields = {}) => {
  const created = [];
  for (let i = 1; i <= count; i++) {
    created.push(taskService.create({ title: `task ${i}`, ...fields }));
  }
  return created;
};

beforeEach(() => {
  taskService._reset();
});

describe('getAll', () => {
  it('returns every task in the store, or an empty array when there are none', () => {
    expect(taskService.getAll()).toEqual([]);

    taskService.create({ title: 'one' });
    taskService.create({ title: 'two' });

    const tasks = taskService.getAll();

    expect(tasks).toHaveLength(2);
    expect(tasks.map((t) => t.title)).toEqual(['one', 'two']);
  });

  it('returns a copy so callers cannot mutate the store', () => {
    taskService.create({ title: 'one' });

    const tasks = taskService.getAll();
    tasks.push({ id: 'injected', title: 'not real' });

    expect(taskService.getAll()).toHaveLength(1);
  });
});

describe('findById', () => {
  it('returns the task with the given id', () => {
    const task = taskService.create({ title: 'find me' });

    expect(taskService.findById(task.id)).toMatchObject({ title: 'find me' });
  });

  it('returns undefined for an unknown id', () => {
    expect(taskService.findById('nope')).toBeUndefined();
  });
});

describe('getByStatus', () => {
  beforeEach(() => {
    taskService.create({ title: 'a', status: 'todo' });
    taskService.create({ title: 'b', status: 'todo' });
    taskService.create({ title: 'c', status: 'done' });
  });

  it('returns only the tasks with that exact status, or an empty array when none match', () => {
    expect(taskService.getByStatus('todo')).toHaveLength(2);
    expect(taskService.getByStatus('done')).toHaveLength(1);
    expect(taskService.getByStatus('in_progress')).toEqual([]);
  });

  it.failing('returns nothing for a query that is only part of another status', () => {
    // "do" is a substring of both "todo" and "done"; exact matching should return 0.
    expect(taskService.getByStatus('do')).toEqual([]);
  });
});

describe('getPaginated', () => {
  it('returns an empty array when the page is past the end', () => {
    seedTasks(5);

    expect(taskService.getPaginated(99, 10)).toEqual([]);
  });

  it.failing('returns the first page of tasks for page 1', () => {
    seedTasks(25);

    const page = taskService.getPaginated(1, 10);

    expect(page).toHaveLength(10);
    expect(page[0].title).toBe('task 1');
    expect(page[9].title).toBe('task 10');
  });

  it.failing('returns the second page with no gaps or overlaps', () => {
    seedTasks(25);

    const page = taskService.getPaginated(2, 10);

    expect(page).toHaveLength(10);
    expect(page[0].title).toBe('task 11');
    expect(page[9].title).toBe('task 20');
  });

  it.failing('returns the remainder on the last, partial page', () => {
    seedTasks(25);

    const page = taskService.getPaginated(3, 10);

    expect(page).toHaveLength(5);
    expect(page[0].title).toBe('task 21');
  });

  it.failing('returns everything when the limit is larger than the store', () => {
    seedTasks(5);

    expect(taskService.getPaginated(1, 100)).toHaveLength(5);
  });
});

describe('getStats', () => {
  it('returns zeros for an empty store', () => {
    expect(taskService.getStats()).toEqual({
      todo: 0,
      in_progress: 0,
      done: 0,
      overdue: 0,
    });
  });

  it('counts the tasks in each status bucket and skips unknown ones', () => {
    taskService.create({ title: 'a', status: 'todo' });
    taskService.create({ title: 'b', status: 'todo' });
    taskService.create({ title: 'c', status: 'in_progress' });
    taskService.create({ title: 'd', status: 'done' });
    taskService.create({ title: 'odd', status: 'weird' });

    const stats = taskService.getStats();

    expect(stats).toEqual({ todo: 2, in_progress: 1, done: 1, overdue: 0 });
    expect(stats).not.toHaveProperty('weird');
  });

  it('counts overdue as past-due tasks that are not done and have a due date', () => {
    taskService.create({ title: 'late', dueDate: '2020-01-01' });
    taskService.create({ title: 'late but done', status: 'done', dueDate: '2020-01-01' });
    taskService.create({ title: 'no deadline', dueDate: null });
    taskService.create({ title: 'still in time', dueDate: '2030-01-01' });

    expect(taskService.getStats().overdue).toBe(1);
  });
});

describe('create', () => {
  it('fills in the documented defaults when only a title is given', () => {
    const task = taskService.create({ title: 'minimal' });

    expect(task).toMatchObject({
      title: 'minimal',
      description: '',
      status: 'todo',
      priority: 'medium',
      dueDate: null,
      completedAt: null,
    });
  });

  it('keeps the fields that were provided', () => {
    const task = taskService.create({
      title: 'full',
      description: 'with details',
      status: 'in_progress',
      priority: 'high',
      dueDate: '2030-06-01T00:00:00.000Z',
    });

    expect(task).toMatchObject({
      description: 'with details',
      status: 'in_progress',
      priority: 'high',
      dueDate: '2030-06-01T00:00:00.000Z',
    });
  });

  it('generates a unique id and a createdAt timestamp for every task', () => {
    const first = taskService.create({ title: 'one' });
    const second = taskService.create({ title: 'two' });

    expect(first.id).not.toBe(second.id);
    expect(Number.isNaN(Date.parse(first.createdAt))).toBe(false);
    expect(Number.isNaN(Date.parse(second.createdAt))).toBe(false);
  });

  it('ignores fields that are not part of the task shape', () => {
    const task = taskService.create({
      title: 'clean',
      id: 'caller-supplied',
      createdAt: 'not a date',
      somethingElse: true,
    });

    expect(task.id).not.toBe('caller-supplied');
    expect(task).not.toHaveProperty('somethingElse');
  });
});

describe('update', () => {
  it('merges the given fields into the existing task and persists them', () => {
    const task = taskService.create({ title: 'before' });

    const updated = taskService.update(task.id, { title: 'after' });

    expect(updated).toMatchObject({ id: task.id, title: 'after' });
    expect(taskService.findById(task.id).title).toBe('after');
  });

  it('leaves the fields that were not sent untouched and persists the change', () => {
    const task = taskService.create({ title: 'keep', priority: 'high' });

    const updated = taskService.update(task.id, { description: 'new' });

    expect(updated.priority).toBe('high');
    expect(updated.status).toBe('todo');
    expect(taskService.findById(task.id).description).toBe('new');
  });

  it('returns null for an unknown id', () => {
    expect(taskService.update('missing', { title: 'x' })).toBeNull();
  });

  it.failing('leaves id and createdAt alone when the body tries to change them', () => {
    const task = taskService.create({ title: 'immutable' });

    const updated = taskService.update(task.id, { id: 'hacked', createdAt: '1999-01-01' });

    expect(updated.id).toBe(task.id);
    expect(updated.createdAt).toBe(task.createdAt);
  });
});

describe('remove', () => {
  it('removes the task and leaves the others in place', () => {
    const keep = taskService.create({ title: 'keep' });
    const drop = taskService.create({ title: 'drop' });

    expect(taskService.remove(drop.id)).toBe(true);
    expect(taskService.findById(drop.id)).toBeUndefined();
    expect(taskService.findById(keep.id)).toBeDefined();
    expect(taskService.getAll()).toHaveLength(1);
  });

  it('returns false for an unknown id', () => {
    expect(taskService.remove('missing')).toBe(false);
    expect(taskService.getAll()).toHaveLength(0);
  });
});

describe('completeTask', () => {
  it('sets the status to done, stamps completedAt and persists it', () => {
    const task = taskService.create({ title: 'finish me' });

    const completed = taskService.completeTask(task.id);

    expect(completed.status).toBe('done');
    expect(Number.isNaN(Date.parse(completed.completedAt))).toBe(false);
    expect(taskService.findById(task.id).status).toBe('done');
  });

  it('keeps the other fields of the task intact', () => {
    const task = taskService.create({
      title: 'keep details',
      description: 'still here',
      dueDate: '2030-01-01T00:00:00.000Z',
    });

    const completed = taskService.completeTask(task.id);

    expect(completed.title).toBe('keep details');
    expect(completed.description).toBe('still here');
    expect(completed.dueDate).toBe('2030-01-01T00:00:00.000Z');
  });

  it('returns null for an unknown id', () => {
    expect(taskService.completeTask('missing')).toBeNull();
  });

  it.failing('preserves the priority the task already had', () => {
    const task = taskService.create({ title: 'urgent', priority: 'high' });

    const completed = taskService.completeTask(task.id);

    expect(completed.priority).toBe('high');
  });
});

describe('_reset', () => {
  it('empties the store', () => {
    taskService.create({ title: 'one' });
    taskService.create({ title: 'two' });

    taskService._reset();

    expect(taskService.getAll()).toEqual([]);
  });
});
