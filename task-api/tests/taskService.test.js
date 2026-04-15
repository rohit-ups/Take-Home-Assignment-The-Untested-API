const taskService = require('../src/services/taskService');

describe('taskService unit tests', () => {
  beforeEach(() => {
    taskService._reset();
  });

  test('create should persist a task with defaults', () => {
    const task = taskService.create({ title: 'Write tests' });

    expect(task.id).toEqual(expect.any(String));
    expect(task.title).toBe('Write tests');
    expect(task.description).toBe('');
    expect(task.status).toBe('todo');
    expect(task.priority).toBe('medium');
    expect(task.dueDate).toBeNull();
    expect(task.completedAt).toBeNull();
    expect(task.createdAt).toEqual(expect.any(String));
    expect(taskService.getAll()).toHaveLength(1);
  });

  test('create should persist provided fields', () => {
    const dueDate = new Date(Date.now() + 3600000).toISOString();
    const task = taskService.create({
      title: 'High priority work',
      description: 'Do this now',
      status: 'in_progress',
      priority: 'high',
      dueDate,
    });

    expect(task.description).toBe('Do this now');
    expect(task.status).toBe('in_progress');
    expect(task.priority).toBe('high');
    expect(task.dueDate).toBe(dueDate);
  });

  test('getAll should return a copy of task list', () => {
    taskService.create({ title: 'Original' });

    const snapshot = taskService.getAll();
    snapshot.push({ id: 'fake' });

    expect(taskService.getAll()).toHaveLength(1);
  });

  test('findById should return matching task and undefined for unknown id', () => {
    const created = taskService.create({ title: 'Lookup' });

    expect(taskService.findById(created.id)).toMatchObject({ title: 'Lookup' });
    expect(taskService.findById('missing-id')).toBeUndefined();
  });

  test('getByStatus should return only exact status matches', () => {
    taskService.create({ title: 'Todo item', status: 'todo' });
    taskService.create({ title: 'Done item', status: 'done' });

    const result = taskService.getByStatus('todo');

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Todo item');
  });

  test('getByStatus should not treat partial status as a valid match', () => {
    taskService.create({ title: 'Todo item', status: 'todo' });
    taskService.create({ title: 'Done item', status: 'done' });

    expect(taskService.getByStatus('do')).toEqual([]);
  });

  test('getPaginated should use 1-based page numbers', () => {
    for (let i = 1; i <= 5; i++) {
      taskService.create({ title: `Task ${i}` });
    }

    const pageOne = taskService.getPaginated(1, 2).map((task) => task.title);
    const pageThree = taskService.getPaginated(3, 2).map((task) => task.title);

    expect(pageOne).toEqual(['Task 1', 'Task 2']);
    expect(pageThree).toEqual(['Task 5']);
  });

  test('getStats should include status counts and overdue count', () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    const future = new Date(Date.now() + 86400000).toISOString();

    taskService.create({ title: 'A', status: 'todo', dueDate: past });
    taskService.create({ title: 'B', status: 'in_progress', dueDate: future });
    taskService.create({ title: 'C', status: 'done', dueDate: past });

    expect(taskService.getStats()).toEqual({
      todo: 1,
      in_progress: 1,
      done: 1,
      overdue: 1,
    });
  });

  test('update should patch an existing task and return null for unknown id', () => {
    const created = taskService.create({ title: 'Before', priority: 'low' });

    const updated = taskService.update(created.id, {
      title: 'After',
      priority: 'high',
      status: 'in_progress',
    });

    expect(updated).toMatchObject({
      id: created.id,
      title: 'After',
      priority: 'high',
      status: 'in_progress',
    });
    expect(taskService.update('missing-id', { title: 'Nope' })).toBeNull();
  });

  test('remove should delete existing task and return false for unknown id', () => {
    const created = taskService.create({ title: 'Delete me' });

    expect(taskService.remove(created.id)).toBe(true);
    expect(taskService.findById(created.id)).toBeUndefined();
    expect(taskService.remove('missing-id')).toBe(false);
  });

  test('completeTask should mark task done and set completedAt timestamp', () => {
    const created = taskService.create({ title: 'Finish me', status: 'todo' });

    const completed = taskService.completeTask(created.id);

    expect(completed).toMatchObject({
      id: created.id,
      status: 'done',
    });
    expect(completed.completedAt).toEqual(expect.any(String));
    expect(taskService.completeTask('missing-id')).toBeNull();
  });
});