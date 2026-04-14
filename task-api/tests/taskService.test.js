const taskService = require('../src/services/taskService');

describe('Task Service - Unit Tests', () => {

  beforeEach(() => {
    taskService._reset();
  });

  test('should create a valid task', () => {
    const task = taskService.create({
      title: 'Test Task',
      priority: 'low'
    });

    expect(task).toHaveProperty('id');
    expect(task.title).toBe('Test Task');
    expect(task.status).toBe('todo');
    expect(task.createdAt).toBeDefined();
  });

  test('should return all tasks', () => {
    taskService.create({ title: 'Task 1' });
    taskService.create({ title: 'Task 2' });

    const tasks = taskService.getAll();

    expect(tasks.length).toBe(2);
  });

  test('should find task by id', () => {
    const task = taskService.create({ title: 'Find me' });

    const found = taskService.findById(task.id);

    expect(found.id).toBe(task.id);
  });

  test('should return null for invalid id', () => {
    const result = taskService.findById('invalid-id');
    expect(result).toBeUndefined(); // because .find() returns undefined
  });

  test('should filter by status', () => {
    taskService.create({ title: 'Task 1', status: 'todo' });
    taskService.create({ title: 'Task 2', status: 'done' });

    const filtered = taskService.getByStatus('done');

    expect(filtered.length).toBe(1);
  });

  test('should paginate tasks', () => {
    for (let i = 0; i < 5; i++) {
      taskService.create({ title: `Task ${i}` });
    }

    const page = taskService.getPaginated(0, 2);

    expect(page.length).toBe(2);
  });

  test('should update a task', () => {
    const task = taskService.create({ title: 'Old' });

    const updated = taskService.update(task.id, {
      title: 'New'
    });

    expect(updated.title).toBe('New');
  });

  test('should return null for invalid update', () => {
    const updated = taskService.update('invalid-id', { title: 'x' });

    expect(updated).toBeNull();
  });

  test('should delete a task', () => {
    const task = taskService.create({ title: 'Delete me' });

    const result = taskService.remove(task.id);

    expect(result).toBe(true);
  });

  test('should return false for invalid delete', () => {
    const result = taskService.remove('invalid-id');

    expect(result).toBe(false);
  });

  test('should mark task complete', () => {
    const task = taskService.create({ title: 'Complete me' });

    const updated = taskService.completeTask(task.id);

    expect(updated.status).toBe('done');
    expect(updated.completedAt).not.toBeNull();
  });

  test('should return null for invalid complete', () => {
    const result = taskService.completeTask('invalid-id');

    expect(result).toBeNull();
  });

  test('should return stats', () => {
    taskService.create({ title: 'Task 1', status: 'todo' });
    taskService.create({ title: 'Task 2', status: 'done' });

    const stats = taskService.getStats();

    expect(stats).toHaveProperty('todo');
    expect(stats).toHaveProperty('done');
  });

});