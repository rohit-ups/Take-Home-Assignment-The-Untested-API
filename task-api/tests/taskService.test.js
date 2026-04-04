const taskService = require('../src/services/taskService');

beforeEach(() => {
  taskService._reset();
});

describe('taskService', () => {
  test('create sets defaults and persists the task', () => {
    const task = taskService.create({ title: 'Write tests' });

    expect(task.id).toBeDefined();
    expect(task.title).toBe('Write tests');
    expect(task.description).toBe('');
    expect(task.status).toBe('todo');
    expect(task.priority).toBe('medium');
    expect(task.dueDate).toBeNull();
    expect(task.assignee).toBeNull();
    expect(task.completedAt).toBeNull();
    expect(task.createdAt).toBeDefined();

    const all = taskService.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe(task.id);
  });

  test('getPaginated returns the expected page', () => {
    const titles = ['t1', 't2', 't3', 't4', 't5'];
    titles.forEach((title) => taskService.create({ title }));

    const page1 = taskService.getPaginated(1, 2);
    const page2 = taskService.getPaginated(2, 2);

    expect(page1.map((t) => t.title)).toEqual(['t1', 't2']);
    expect(page2.map((t) => t.title)).toEqual(['t3', 't4']);
  });

  test('update returns null for unknown id', () => {
    const result = taskService.update('missing-id', { title: 'x' });
    expect(result).toBeNull();
  });

  test('update merges fields for an existing task', () => {
    const task = taskService.create({ title: 'Original', priority: 'low' });
    const updated = taskService.update(task.id, { title: 'Updated', priority: 'high' });

    expect(updated.title).toBe('Updated');
    expect(updated.priority).toBe('high');
    expect(updated.id).toBe(task.id);
  });

  test('remove returns false for unknown id', () => {
    const result = taskService.remove('missing-id');
    expect(result).toBe(false);
  });

  test('remove deletes an existing task', () => {
    const task = taskService.create({ title: 'To delete' });
    const result = taskService.remove(task.id);

    expect(result).toBe(true);
    expect(taskService.getAll()).toHaveLength(0);
  });

  test('completeTask marks done and sets completedAt', () => {
    const task = taskService.create({ title: 'Complete me', priority: 'high' });
    const completed = taskService.completeTask(task.id);

    expect(completed.status).toBe('done');
    expect(completed.completedAt).toBeDefined();
    expect(completed.priority).toBe('high');
  });

  test('getStats counts by status and overdue', () => {
    taskService.create({ title: 'Overdue', dueDate: '2000-01-01T00:00:00Z', status: 'todo' });
    taskService.create({ title: 'In progress', status: 'in_progress' });
    taskService.create({ title: 'Done', status: 'done', dueDate: '2000-01-01T00:00:00Z' });

    const stats = taskService.getStats();
    expect(stats.todo).toBe(1);
    expect(stats.in_progress).toBe(1);
    expect(stats.done).toBe(1);
    expect(stats.overdue).toBe(1);
  });

  test('getByStatus requires an exact match (not substring)', () => {
    taskService.create({ title: 'Todo', status: 'todo' });
    taskService.create({ title: 'Done', status: 'done' });

    const exact = taskService.getByStatus('todo');
    const substring = taskService.getByStatus('do');

    expect(exact).toHaveLength(1);
    expect(exact[0].status).toBe('todo');
    expect(substring).toHaveLength(0);
  });
});
