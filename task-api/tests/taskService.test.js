const taskService = require('../src/services/taskService');

describe('Task Service - create and retrieval', () => {
  beforeEach(() => {
    taskService._reset();
  });

  test('should create a task with default values', () => {
    const task = taskService.create({
      title: 'Write tests',
    });

    expect(task).toHaveProperty('id');
    expect(task.title).toBe('Write tests');
    expect(task.description).toBe('');
    expect(task.status).toBe('todo');
    expect(task.priority).toBe('medium');
    expect(task.dueDate).toBeNull();
    expect(task.completedAt).toBeNull();
    expect(task).toHaveProperty('createdAt');
  });

  test('should return all created tasks', () => {
    taskService.create({ title: 'Task 1' });
    taskService.create({ title: 'Task 2' });

    const tasks = taskService.getAll();

    expect(tasks).toHaveLength(2);
    expect(tasks[0].title).toBe('Task 1');
    expect(tasks[1].title).toBe('Task 2');
  });

  test('should find a task by id', () => {
    const createdTask = taskService.create({
      title: 'Find this task',
    });

    const foundTask = taskService.findById(createdTask.id);

    expect(foundTask).toEqual(createdTask);
  });

  test('should return undefined when task id does not exist', () => {
    const foundTask = taskService.findById('non-existing-id');

    expect(foundTask).toBeUndefined();
  });

  test('should return tasks by exact status', () => {
    taskService.create({
      title: 'Task 1',
      status: 'todo',
    });

    taskService.create({
      title: 'Task 2',
      status: 'done',
    });

    const tasks = taskService.getByStatus('todo');

    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toBe('Task 1');
    expect(tasks[0].status).toBe('todo');
  });

  test('should return an empty array when no tasks match the status', () => {
    taskService.create({
      title: 'Task 1',
      status: 'todo',
    });

    const tasks = taskService.getByStatus('done');

    expect(tasks).toEqual([]);
  });

  test('should return the first page of tasks when page is 1 and limit is 2', () => {
    taskService.create({ title: 'Task 1' });
    taskService.create({ title: 'Task 2' });
    taskService.create({ title: 'Task 3' });
    taskService.create({ title: 'Task 4' });

    const tasks = taskService.getPaginated(1, 2);

    expect(tasks).toHaveLength(2);
    expect(tasks[0].title).toBe('Task 1');
    expect(tasks[1].title).toBe('Task 2');
  });

  test('should return correct task counts by status', () => {
    taskService.create({
      title: 'Task 1',
      status: 'todo',
    });

    taskService.create({
      title: 'Task 2',
      status: 'in_progress',
    });

    taskService.create({
      title: 'Task 3',
      status: 'done',
    });

    taskService.create({
      title: 'Task 4',
      status: 'todo',
    });

    const stats = taskService.getStats();

    expect(stats.todo).toBe(2);
    expect(stats.in_progress).toBe(1);
    expect(stats.done).toBe(1);
  });

  test('should count overdue incomplete tasks', () => {
    taskService.create({
      title: 'Overdue task',
      dueDate: '2020-01-01T00:00:00.000Z',
      status: 'todo',
    });

    taskService.create({
      title: 'Completed old task',
      dueDate: '2020-01-01T00:00:00.000Z',
      status: 'done',
    });

    const stats = taskService.getStats();

    expect(stats.overdue).toBe(1);
  });

  test('should update an existing task', () => {
    const task = taskService.create({
      title: 'Original title',
      priority: 'low',
    });

    const updatedTask = taskService.update(task.id, {
      title: 'Updated title',
      priority: 'high',
    });

    expect(updatedTask.title).toBe('Updated title');
    expect(updatedTask.priority).toBe('high');
    expect(updatedTask.id).toBe(task.id);
  });

  test('should return null when updating a non-existing task', () => {
    const updatedTask = taskService.update('non-existing-id', {
      title: 'Updated title',
    });

    expect(updatedTask).toBeNull();
  });

  test('should remove an existing task', () => {
    const task = taskService.create({
      title: 'Task to delete',
    });

    const result = taskService.remove(task.id);

    expect(result).toBe(true);
    expect(taskService.findById(task.id)).toBeUndefined();
  });

  test('should return false when removing a non-existing task', () => {
    const result = taskService.remove('non-existing-id');

    expect(result).toBe(false);
  });

  test('should mark a task as completed without changing its priority', () => {
    const task = taskService.create({
      title: 'Complete this task',
      priority: 'high',
    });

    const completedTask = taskService.completeTask(task.id);

    expect(completedTask.status).toBe('done');
    expect(completedTask.completedAt).not.toBeNull();
    expect(completedTask.priority).toBe('high');
  });

  test('should return null when completing a non-existing task', () => {
    const completedTask = taskService.completeTask('non-existing-id');

    expect(completedTask).toBeNull();
  });
});