const taskService = require('../src/services/taskService');

describe('taskService', () => {
  beforeEach(() => {
    // The store is in memory, so reset it before every test for isolation.
    taskService._reset();
  });

  test('creates a task with documented defaults', () => {
    const task = taskService.create({ title: 'Test task' });

    expect(task).toEqual(expect.objectContaining({
      title: 'Test task',
      status: 'todo',
      priority: 'medium',
      dueDate: null,
      completedAt: null,
    }));
    expect(task.id).toEqual(expect.any(String));
    expect(task.createdAt).toEqual(expect.any(String));
  });

  test('findById returns a task or null', () => {
    const task = taskService.create({ title: 'Find me' });

    expect(taskService.findById(task.id)).toEqual(task);
    expect(taskService.findById('missing-id')).toBeUndefined();
  });

  test('getByStatus filters tasks', () => {
    taskService.create({ title: 'Todo', status: 'todo' });
    taskService.create({ title: 'Done', status: 'done' });

    expect(taskService.getByStatus('todo')).toHaveLength(1);
    expect(taskService.getByStatus('todo')[0].title).toBe('Todo');
  });

  test('getPaginated returns the requested slice from the underlying service', () => {
    for (let i = 1; i <= 5; i += 1) {
      taskService.create({ title: `Task ${i}` });
    }

    // The original service uses a zero-based page internally. The submission
    // adapter translates the public one-based API page before calling it.
    expect(taskService.getPaginated(0, 2).map(t => t.title)).toEqual(['Task 1', 'Task 2']);
    expect(taskService.getPaginated(1, 2).map(t => t.title)).toEqual(['Task 3', 'Task 4']);
  });

  test('getStats counts statuses and overdue open tasks', () => {
    taskService.create({ title: 'Todo', status: 'todo' });
    taskService.create({ title: 'Done', status: 'done' });
    taskService.create({ title: 'Overdue', dueDate: '2000-01-01T00:00:00.000Z' });

    expect(taskService.getStats()).toEqual(expect.objectContaining({
      todo: 2,
      done: 1,
      in_progress: 0,
      overdue: 1,
    }));
  });

  test('update changes supplied fields and returns the task', () => {
    const task = taskService.create({ title: 'Original', priority: 'high' });
    const updated = taskService.update(task.id, { title: 'Updated' });

    expect(updated.title).toBe('Updated');
    expect(updated.priority).toBe('high');
  });

  test('update returns null for an unknown task', () => {
    expect(taskService.update('missing-id', { title: 'Nope' })).toBeNull();
  });

  test('remove deletes an existing task', () => {
    const task = taskService.create({ title: 'Delete me' });

    expect(taskService.remove(task.id)).toBe(true);
    expect(taskService.findById(task.id)).toBeUndefined();
  });

  test('remove returns false for an unknown task', () => {
    expect(taskService.remove('missing-id')).toBe(false);
  });

  test('completeTask marks a task done and records completion time', () => {
    const task = taskService.create({ title: 'Complete me' });
    const completed = taskService.completeTask(task.id);

    expect(completed.status).toBe('done');
    expect(completed.completedAt).toEqual(expect.any(String));
  });

  test('completeTask returns null for an unknown task', () => {
    expect(taskService.completeTask('missing-id')).toBeNull();
  });
});
