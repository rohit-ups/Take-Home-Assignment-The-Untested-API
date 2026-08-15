const taskService = require('../src/services/taskService');

beforeEach(() => {
  taskService._reset();
});

describe('taskService', () => {
  describe('getAll', () => {
    test('returns an empty array when there are no tasks', () => {
      expect(taskService.getAll()).toEqual([]);
    });

    test('returns all created tasks', () => {
      taskService.create({
        title: 'Task 1',
        description: 'First task',
        priority: 'high',
      });

      taskService.create({
        title: 'Task 2',
        description: 'Second task',
        priority: 'low',
      });

      const tasks = taskService.getAll();

      expect(tasks).toHaveLength(2);
      expect(tasks[0].title).toBe('Task 1');
      expect(tasks[1].title).toBe('Task 2');
    });
  });

  describe('create', () => {
    test('creates a task with the provided fields', () => {
      const task = taskService.create({
        title: 'Learn Jest',
        description: 'Write unit tests',
        priority: 'high',
      });

      expect(task.title).toBe('Learn Jest');
      expect(task.description).toBe('Write unit tests');
      expect(task.priority).toBe('high');
    });

    test('creates a task with default values', () => {
      const task = taskService.create({
        title: 'Default task',
      });

      expect(task.status).toBe('todo');
      expect(task.priority).toBe('medium');
      expect(task.description).toBe('');
      expect(task.dueDate).toBeNull();
      expect(task.completedAt).toBeNull();
    });

    test('generates an id and createdAt for the task', () => {
      const task = taskService.create({
        title: 'Test task',
      });

      expect(task.id).toBeDefined();
      expect(typeof task.id).toBe('string');

      expect(task.createdAt).toBeDefined();
      expect(typeof task.createdAt).toBe('string');
    });

    test('stores the created task', () => {
      taskService.create({
        title: 'Stored task',
      });

      const tasks = taskService.getAll();

      expect(tasks).toHaveLength(1);
      expect(tasks[0].title).toBe('Stored task');
    });
  });

  describe('findById', () => {
    test('returns the task when the id exists', () => {
      const createdTask = taskService.create({
        title: 'Find me',
      });

      const task = taskService.findById(createdTask.id);

      expect(task).toBeDefined();
      expect(task.id).toBe(createdTask.id);
      expect(task.title).toBe('Find me');
    });

    test('returns undefined when the id does not exist', () => {
      const task = taskService.findById('non-existent-id');

      expect(task).toBeUndefined();
    });
  });

  describe('getByStatus', () => {
    test('returns tasks matching the requested status', () => {
      taskService.create({
        title: 'Todo task',
        status: 'todo',
      });

      taskService.create({
        title: 'Progress task',
        status: 'in_progress',
      });

      taskService.create({
        title: 'Done task',
        status: 'done',
      });

      const tasks = taskService.getByStatus('todo');

      expect(tasks).toHaveLength(1);
      expect(tasks[0].title).toBe('Todo task');
      expect(tasks[0].status).toBe('todo');
    });

    test('returns multiple tasks with the same status', () => {
      taskService.create({
        title: 'Todo task 1',
        status: 'todo',
      });

      taskService.create({
        title: 'Todo task 2',
        status: 'todo',
      });

      taskService.create({
        title: 'Done task',
        status: 'done',
      });

      const tasks = taskService.getByStatus('todo');

      expect(tasks).toHaveLength(2);
      expect(tasks.every((task) => task.status === 'todo')).toBe(true);
    });

    test('returns an empty array when no tasks match the status', () => {
      taskService.create({
        title: 'Todo task',
        status: 'todo',
      });

      const tasks = taskService.getByStatus('done');

      expect(tasks).toEqual([]);
    });
  });

  describe('getPaginated', () => {
    test('returns the first page of tasks', () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });
      taskService.create({ title: 'Task 3' });
      taskService.create({ title: 'Task 4' });

      const tasks = taskService.getPaginated(1, 2);

      expect(tasks).toHaveLength(2);
      expect(tasks[0].title).toBe('Task 1');
      expect(tasks[1].title).toBe('Task 2');
    });

    test('returns the second page of tasks', () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });
      taskService.create({ title: 'Task 3' });
      taskService.create({ title: 'Task 4' });

      const tasks = taskService.getPaginated(2, 2);

      expect(tasks).toHaveLength(2);
      expect(tasks[0].title).toBe('Task 3');
      expect(tasks[1].title).toBe('Task 4');
    });

    test('returns an empty array when the page is beyond the available tasks', () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });

      const tasks = taskService.getPaginated(3, 2);

      expect(tasks).toEqual([]);
    });
  });

  describe('getStats', () => {
    test('returns zero counts when there are no tasks', () => {
      expect(taskService.getStats()).toEqual({
        todo: 0,
        in_progress: 0,
        done: 0,
        overdue: 0,
      });
    });

    test('counts tasks correctly by status', () => {
      taskService.create({
        title: 'Todo 1',
        status: 'todo',
      });

      taskService.create({
        title: 'Todo 2',
        status: 'todo',
      });

      taskService.create({
        title: 'In progress',
        status: 'in_progress',
      });

      taskService.create({
        title: 'Done',
        status: 'done',
      });

      expect(taskService.getStats()).toEqual({
        todo: 2,
        in_progress: 1,
        done: 1,
        overdue: 0,
      });
    });

    test('counts an overdue incomplete task', () => {
      taskService.create({
        title: 'Overdue task',
        status: 'todo',
        dueDate: '2020-01-01T00:00:00.000Z',
      });

      expect(taskService.getStats().overdue).toBe(1);
    });

    test('does not count a completed overdue task as overdue', () => {
      taskService.create({
        title: 'Completed overdue task',
        status: 'done',
        dueDate: '2020-01-01T00:00:00.000Z',
      });

      expect(taskService.getStats().overdue).toBe(0);
    });
  });

  describe('update', () => {
    test('updates an existing task', () => {
      const task = taskService.create({
        title: 'Original title',
        description: 'Original description',
        priority: 'low',
      });

      const updated = taskService.update(task.id, {
        title: 'Updated title',
        description: 'Updated description',
        priority: 'high',
      });

      expect(updated.title).toBe('Updated title');
      expect(updated.description).toBe('Updated description');
      expect(updated.priority).toBe('high');
      expect(updated.id).toBe(task.id);
    });

    test('preserves fields that are not updated', () => {
      const task = taskService.create({
        title: 'Original title',
        description: 'Original description',
        priority: 'high',
      });

      const updated = taskService.update(task.id, {
        title: 'Updated title',
      });

      expect(updated.title).toBe('Updated title');
      expect(updated.description).toBe('Original description');
      expect(updated.priority).toBe('high');
    });

    test('returns null when the task does not exist', () => {
      const updated = taskService.update('non-existent-id', {
        title: 'Updated title',
      });

      expect(updated).toBeNull();
    });
  });

  describe('remove', () => {
    test('removes an existing task', () => {
      const task = taskService.create({
        title: 'Delete me',
      });

      const result = taskService.remove(task.id);

      expect(result).toBe(true);
      expect(taskService.findById(task.id)).toBeUndefined();
    });

    test('returns false when the task does not exist', () => {
      const result = taskService.remove('non-existent-id');

      expect(result).toBe(false);
    });

    test('removes only the requested task', () => {
      const task1 = taskService.create({
        title: 'Keep me',
      });

      const task2 = taskService.create({
        title: 'Delete me',
      });

      taskService.remove(task2.id);

      const remainingTasks = taskService.getAll();

      expect(remainingTasks).toHaveLength(1);
      expect(remainingTasks[0].id).toBe(task1.id);
    });
  });

  describe('completeTask', () => {
    test('marks an existing task as done', () => {
      const task = taskService.create({
        title: 'Complete me',
        priority: 'high',
      });

      const completed = taskService.completeTask(task.id);

      expect(completed.status).toBe('done');
      expect(completed.completedAt).toBeDefined();
      expect(typeof completed.completedAt).toBe('string');
    });

    test('returns null when the task does not exist', () => {
      const result = taskService.completeTask('non-existent-id');

      expect(result).toBeNull();
    });

    test('preserves the task priority when completing it', () => {
      const task = taskService.create({
        title: 'High priority task',
        priority: 'high',
      });

      const completed = taskService.completeTask(task.id);

      expect(completed.priority).toBe('high');
    });
  });

  describe('assignTask', () => {
    test('assigns a task to a user', () => {
      const task = taskService.create({
        title: 'Assign me',
      });

      const updated = taskService.assignTask(task.id, 'Kashish');

      expect(updated.assignee).toBe('Kashish');
      expect(updated.id).toBe(task.id);
    });

    test('returns null when assigning a non-existent task', () => {
      const result = taskService.assignTask(
        'non-existent-id',
        'Kashish'
      );

      expect(result).toBeNull();
    });

    test('preserves existing task fields when assigning', () => {
      const task = taskService.create({
        title: 'Important task',
        description: 'Test assignment',
        priority: 'high',
      });

      const updated = taskService.assignTask(task.id, 'Kashish');

      expect(updated.title).toBe('Important task');
      expect(updated.description).toBe('Test assignment');
      expect(updated.priority).toBe('high');
      expect(updated.assignee).toBe('Kashish');
    });
  });
});