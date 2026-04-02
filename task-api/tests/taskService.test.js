const taskService = require('../src/services/taskService');

// Before each test, reset the in-memory store so tests don't affect each other
beforeEach(() => {
  taskService._reset();
});

//getAll 

describe('getAll', () => {
  test('returns empty array when no tasks exist', () => {
    expect(taskService.getAll()).toEqual([]);
  });

  test('returns all created tasks', () => {
    taskService.create({ title: 'Task 1' });
    taskService.create({ title: 'Task 2' });
    expect(taskService.getAll()).toHaveLength(2);
  });
});

// findById 

describe('findById', () => {
  test('returns the correct task by id', () => {
    const task = taskService.create({ title: 'Find me' });
    expect(taskService.findById(task.id)).toEqual(task);
  });

  test('returns undefined for a non-existent id', () => {
    expect(taskService.findById('non-existent-id')).toBeUndefined();
  });
});

// getByStatus

describe('getByStatus', () => {
  test('returns only tasks matching the given status', () => {
    taskService.create({ title: 'Todo task', status: 'todo' });
    taskService.create({ title: 'In progress task', status: 'in_progress' });
    const result = taskService.getByStatus('todo');
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('todo');
  });

  test('returns empty array when no tasks match the status', () => {
    taskService.create({ title: 'Todo task', status: 'todo' });
    expect(taskService.getByStatus('done')).toEqual([]);
  });

  // This test WILL FAIL — it exposes the .includes() bug we spotted 
  test('does not return tasks with partially matching status', () => {
    taskService.create({ title: 'Todo task', status: 'todo' });
    const result = taskService.getByStatus('tod');
    expect(result).toHaveLength(0);
  });
});

// getPaginated 
describe('getPaginated', () => {
  beforeEach(() => {
    // Create 5 tasks to paginate over
    for (let i = 1; i <= 5; i++) {
      taskService.create({ title: `Task ${i}` });
    }
  });

  test('page 1 with limit 2 returns first 2 tasks', () => {
    const result = taskService.getPaginated(1, 2);
    expect(result).toHaveLength(2);
    expect(result[0].title).toBe('Task 1');
  });

  test('page 2 with limit 2 returns next 2 tasks', () => {
    const result = taskService.getPaginated(2, 2);
    expect(result).toHaveLength(2);
    expect(result[0].title).toBe('Task 3');
  });

  // This test WILL FAIL — it exposes the page * limit bug we spotted
  test('page 1 with limit 10 returns all tasks when total is less than limit', () => {
    const result = taskService.getPaginated(1, 10);
    expect(result).toHaveLength(5);
  });
});

// getStats

describe('getStats', () => {
  test('returns zero counts when no tasks exist', () => {
    expect(taskService.getStats()).toEqual({
      todo: 0,
      in_progress: 0,
      done: 0,
      overdue: 0,
    });
  });

  test('counts tasks correctly by status', () => {
    taskService.create({ title: 'T1', status: 'todo' });
    taskService.create({ title: 'T2', status: 'in_progress' });
    taskService.create({ title: 'T3', status: 'done' });
    const stats = taskService.getStats();
    expect(stats.todo).toBe(1);
    expect(stats.in_progress).toBe(1);
    expect(stats.done).toBe(1);
  });

  test('counts overdue tasks correctly', () => {
    // A task with a past due date and status not done = overdue
    taskService.create({ title: 'Overdue', status: 'todo', dueDate: '2000-01-01T00:00:00.000Z' });
    // A done task with a past due date should NOT be counted as overdue
    taskService.create({ title: 'Done overdue', status: 'done', dueDate: '2000-01-01T00:00:00.000Z' });
    const stats = taskService.getStats();
    expect(stats.overdue).toBe(1);
  });
});

// create

describe('create', () => {
  test('creates a task with correct default values', () => {
    const task = taskService.create({ title: 'New task' });
    expect(task.title).toBe('New task');
    expect(task.status).toBe('todo');
    expect(task.priority).toBe('medium');
    expect(task.description).toBe('');
    expect(task.dueDate).toBeNull();
    expect(task.completedAt).toBeNull();
    expect(task.id).toBeDefined();
    expect(task.createdAt).toBeDefined();
  });

  test('creates a task with provided values', () => {
    const task = taskService.create({
      title: 'Custom task',
      status: 'in_progress',
      priority: 'high',
      description: 'Some description',
    });
    expect(task.status).toBe('in_progress');
    expect(task.priority).toBe('high');
    expect(task.description).toBe('Some description');
  });
});

// update 

describe('update', () => {
  test('updates fields on an existing task', () => {
    const task = taskService.create({ title: 'Original' });
    const updated = taskService.update(task.id, { title: 'Updated' });
    expect(updated.title).toBe('Updated');
  });

  test('returns null for a non-existent id', () => {
    expect(taskService.update('bad-id', { title: 'X' })).toBeNull();
  });

  test('does not affect other fields when partially updating', () => {
    const task = taskService.create({ title: 'Original', priority: 'high' });
    const updated = taskService.update(task.id, { title: 'Updated' });
    expect(updated.priority).toBe('high');
  });
});

// remove

describe('remove', () => {
  test('removes an existing task and returns true', () => {
    const task = taskService.create({ title: 'To delete' });
    expect(taskService.remove(task.id)).toBe(true);
    expect(taskService.findById(task.id)).toBeUndefined();
  });

  test('returns false for a non-existent id', () => {
    expect(taskService.remove('bad-id')).toBe(false);
  });
});

// completeTask

describe('completeTask', () => {
  test('marks a task as done and sets completedAt', () => {
    const task = taskService.create({ title: 'Finish me' });
    const completed = taskService.completeTask(task.id);
    expect(completed.status).toBe('done');
    expect(completed.completedAt).not.toBeNull();
  });

  test('returns null for a non-existent id', () => {
    expect(taskService.completeTask('bad-id')).toBeNull();
  });

  // This test WILL FAIL — it exposes the priority reset bug we spotted
  test('does not change the priority when completing a task', () => {
    const task = taskService.create({ title: 'High priority', priority: 'high' });
    const completed = taskService.completeTask(task.id);
    expect(completed.priority).toBe('high');
  });
});