const taskService = require('../src/services/taskService');

describe('taskService', () => {
  beforeEach(() => {
    taskService._reset();
  });

  test('create should build a task with defaults', () => {
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
    expect(typeof task.id).toBe('string');
    expect(Number.isNaN(Date.parse(task.createdAt))).toBe(false);
  });

  test('getAll should return a copy of in-memory tasks', () => {
    taskService.create({ title: 'A' });

    const tasks = taskService.getAll();
    tasks.push({ id: 'fake' });

    expect(taskService.getAll()).toHaveLength(1);
  });

  test('findById should return the matching task', () => {
    const created = taskService.create({ title: 'Find me' });

    const found = taskService.findById(created.id);

    expect(found).toEqual(created);
  });

  test('getByStatus should return tasks matching status', () => {
    taskService.create({ title: 'Todo one', status: 'todo' });
    taskService.create({ title: 'Done one', status: 'done' });

    const doneTasks = taskService.getByStatus('done');

    expect(doneTasks).toHaveLength(1);
    expect(doneTasks[0].title).toBe('Done one');
  });

  test('getPaginated should return tasks page-wise', () => {
    taskService.create({ title: 'Task 1' });
    taskService.create({ title: 'Task 2' });
    taskService.create({ title: 'Task 3' });

    const firstPage = taskService.getPaginated(1, 2);
    const secondPage = taskService.getPaginated(2, 2);

    expect(firstPage.map((t) => t.title)).toEqual(['Task 1', 'Task 2']);
    expect(secondPage.map((t) => t.title)).toEqual(['Task 3']);
  });

  test('update should update existing task and return null for missing id', () => {
    const created = taskService.create({ title: 'Old title' });

    const updated = taskService.update(created.id, { title: 'New title' });
    const missing = taskService.update('missing-id', { title: 'Nope' });

    expect(updated.title).toBe('New title');
    expect(missing).toBeNull();
  });

  test('remove should delete existing task and return false for missing id', () => {
    const created = taskService.create({ title: 'Delete me' });

    const removed = taskService.remove(created.id);
    const removedAgain = taskService.remove(created.id);

    expect(removed).toBe(true);
    expect(removedAgain).toBe(false);
  });

  test('completeTask should mark task as done and set completedAt', () => {
    const created = taskService.create({ title: 'Complete me', status: 'todo' });

    const completed = taskService.completeTask(created.id);

    expect(completed.status).toBe('done');
    expect(Number.isNaN(Date.parse(completed.completedAt))).toBe(false);
  });

  test('getStats should include status counts and overdue tasks', () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString();
    const futureDate = new Date(Date.now() + 86400000).toISOString();

    taskService.create({ title: 'Overdue todo', status: 'todo', dueDate: pastDate });
    taskService.create({ title: 'Future in progress', status: 'in_progress', dueDate: futureDate });
    taskService.create({ title: 'Done in past', status: 'done', dueDate: pastDate });

    const stats = taskService.getStats();

    expect(stats).toEqual({
      todo: 1,
      in_progress: 1,
      done: 1,
      overdue: 1,
    });
  });

  test('assignTask should assign and trim assignee name', () => {
    const created = taskService.create({ title: 'Assign me' });

    const updated = taskService.assignTask(created.id, '  Rohit  ');

    expect(updated.assignee).toBe('Rohit');
  });

  test('assignTask should return null when task does not exist', () => {
    const result = taskService.assignTask('missing-id', 'Rohit');

    expect(result).toBeNull();
  });

  test('assignTask should block assignment when already assigned', () => {
    const created = taskService.create({ title: 'Assigned already' });
    taskService.assignTask(created.id, 'Alice');

    const secondAttempt = taskService.assignTask(created.id, 'Bob');

    expect(secondAttempt).toBe('already_assigned');
    expect(taskService.findById(created.id).assignee).toBe('Alice');
  });
});
