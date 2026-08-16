const taskService = require('../src/services/taskService');

beforeEach(() => {
  taskService._reset();
});

describe('create', () => {
  test('creates a task with default values', () => {
    const task = taskService.create({
      title: 'Learn Jest'
    });

    expect(task.title).toBe('Learn Jest');
    expect(task.description).toBe('');
    expect(task.status).toBe('todo');
    expect(task.priority).toBe('medium');
    expect(task.dueDate).toBeNull();
    expect(task.completedAt).toBeNull();
    expect(task.id).toBeDefined();
    expect(task.createdAt).toBeDefined();
  });

  test('creates a task with provided values', () => {
    const task = taskService.create({
      title: 'Finish assignment',
      description: 'Write tests',
      status: 'in_progress',
      priority: 'high',
      dueDate: '2026-08-20T00:00:00.000Z'
    });

    expect(task.title).toBe('Finish assignment');
    expect(task.description).toBe('Write tests');
    expect(task.status).toBe('in_progress');
    expect(task.priority).toBe('high');
    expect(task.dueDate).toBe('2026-08-20T00:00:00.000Z');
  });

  test('stores the created task', () => {
    const task = taskService.create({
      title: 'Test task'
    });

    const tasks = taskService.getAll();

    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toEqual(task);
  });
});

describe('getAll', () => {
  test('returns an empty array when there are no tasks', () => {
    expect(taskService.getAll()).toEqual([]);
  });

  test('returns all created tasks', () => {
    taskService.create({ title: 'Task 1' });
    taskService.create({ title: 'Task 2' });

    const tasks = taskService.getAll();

    expect(tasks).toHaveLength(2);
    expect(tasks[0].title).toBe('Task 1');
    expect(tasks[1].title).toBe('Task 2');
  });

  test('does not expose the internal tasks array', () => {
    taskService.create({ title: 'Task 1' });

    const tasks = taskService.getAll();
    tasks.push({ title: 'Fake task' });

    expect(taskService.getAll()).toHaveLength(1);
  });
});

describe('findById', () => {
  test('returns a task when the ID exists', () => {
    const task = taskService.create({
      title: 'Find me'
    });

    const result = taskService.findById(task.id);

    expect(result).toEqual(task);
  });

  test('returns undefined when task does not exist', () => {
    const result = taskService.findById('non-existent-id');

    expect(result).toBeUndefined();
  });
});

describe('getByStatus', () => {
  test('returns tasks with the requested status', () => {
    taskService.create({
      title: 'Todo task',
      status: 'todo'
    });

    taskService.create({
      title: 'Working task',
      status: 'in_progress'
    });

    const result = taskService.getByStatus('todo');

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Todo task');
  });

  test('returns empty array when no tasks match', () => {
    taskService.create({
      title: 'Todo task',
      status: 'todo'
    });

    expect(taskService.getByStatus('done')).toEqual([]);
  });

  // Known behavior: getByStatus() uses String.includes(), so a partial
  // value like "in" also matches "in_progress". Left as-is (out of scope
  // for this pass) but documented so it isn't mistaken for a regression.
  test('matches partial status values due to includes()', () => {
    taskService.create({
      title: 'Working task',
      status: 'in_progress'
    });

    const result = taskService.getByStatus('in');

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Working task');
  });
});

describe('getPaginated', () => {
  beforeEach(() => {
    for (let i = 1; i <= 25; i++) {
      taskService.create({
        title: `Task ${i}`
      });
    }
  });

  // FIXED: offset now computed as (page - 1) * limit, so page=1 correctly
  // returns the first 10 tasks instead of skipping them.
  test('returns the first page of tasks', () => {
    const result = taskService.getPaginated(1, 10);

    expect(result).toHaveLength(10);
    expect(result[0].title).toBe('Task 1');
    expect(result[9].title).toBe('Task 10');
  });

  test('returns the second page of tasks', () => {
    const result = taskService.getPaginated(2, 10);

    expect(result[0].title).toBe('Task 11');
    expect(result[9].title).toBe('Task 20');
  });

  test('returns the remaining tasks on the last partial page', () => {
    const result = taskService.getPaginated(3, 10);

    expect(result).toHaveLength(5);
    expect(result[0].title).toBe('Task 21');
    expect(result[4].title).toBe('Task 25');
  });

  test('returns an empty array for a page beyond available tasks', () => {
    const result = taskService.getPaginated(10, 10);

    expect(result).toEqual([]);
  });
});

describe('getStats', () => {
  test('returns zero counts when there are no tasks', () => {
    expect(taskService.getStats()).toEqual({
      todo: 0,
      in_progress: 0,
      done: 0,
      overdue: 0
    });
  });

  test('counts tasks by status', () => {
    taskService.create({ title: 'Todo 1', status: 'todo' });
    taskService.create({ title: 'Todo 2', status: 'todo' });
    taskService.create({ title: 'Working', status: 'in_progress' });
    taskService.create({ title: 'Done', status: 'done' });

    expect(taskService.getStats()).toEqual({
      todo: 2,
      in_progress: 1,
      done: 1,
      overdue: 0
    });
  });

  test('counts overdue unfinished tasks', () => {
    taskService.create({
      title: 'Overdue',
      dueDate: '2020-01-01T00:00:00.000Z'
    });

    expect(taskService.getStats().overdue).toBe(1);
  });

  test('does not count completed overdue tasks', () => {
    taskService.create({
      title: 'Completed overdue',
      status: 'done',
      dueDate: '2020-01-01T00:00:00.000Z'
    });

    expect(taskService.getStats().overdue).toBe(0);
  });

  test('does not count tasks with a future due date as overdue', () => {
    taskService.create({
      title: 'Not due yet',
      dueDate: '2099-01-01T00:00:00.000Z'
    });

    expect(taskService.getStats().overdue).toBe(0);
  });
});

describe('update', () => {
  test('updates an existing task', () => {
    const task = taskService.create({
      title: 'Old title'
    });

    const updated = taskService.update(task.id, {
      title: 'New title',
      priority: 'high'
    });

    expect(updated.title).toBe('New title');
    expect(updated.priority).toBe('high');
    expect(updated.id).toBe(task.id);
  });

  test('returns null for a non-existent task', () => {
    const result = taskService.update('invalid-id', {
      title: 'New title'
    });

    expect(result).toBeNull();
  });

  test('preserves fields that are not updated', () => {
    taskService.create({
      title: 'Original',
      description: 'Description'
    });
    const task = taskService.getAll()[0];

    const updated = taskService.update(task.id, {
      title: 'Changed'
    });

    expect(updated.description).toBe('Description');
  });

  test('persists the update in the internal store', () => {
    const task = taskService.create({ title: 'Original' });

    taskService.update(task.id, { title: 'Changed' });

    expect(taskService.findById(task.id).title).toBe('Changed');
  });
});

describe('remove', () => {
  test('removes an existing task', () => {
    const task = taskService.create({
      title: 'Delete me'
    });

    const result = taskService.remove(task.id);

    expect(result).toBe(true);
    expect(taskService.findById(task.id)).toBeUndefined();
  });

  test('returns false when task does not exist', () => {
    expect(taskService.remove('invalid-id')).toBe(false);
  });

  test('does not affect other tasks', () => {
    const task1 = taskService.create({ title: 'Keep me' });
    const task2 = taskService.create({ title: 'Delete me' });

    taskService.remove(task2.id);

    expect(taskService.getAll()).toHaveLength(1);
    expect(taskService.findById(task1.id)).toEqual(task1);
  });
});

describe('completeTask', () => {
  test('marks a task as done', () => {
    const task = taskService.create({
      title: 'Complete me',
      priority: 'high'
    });

    const completed = taskService.completeTask(task.id);

    expect(completed.status).toBe('done');
    expect(completed.completedAt).not.toBeNull();
  });

  // FIXED: completeTask() no longer hard-codes priority: 'medium', so the
  // original priority is preserved through completion.
  test('preserves the task priority when completing it', () => {
    const task = taskService.create({
      title: 'Important task',
      priority: 'high'
    });

    const completed = taskService.completeTask(task.id);

    expect(completed.priority).toBe('high');
  });

  test('returns null for a non-existent task', () => {
    expect(taskService.completeTask('invalid-id')).toBeNull();
  });

  test('persists the completed task in the internal store', () => {
    const task = taskService.create({ title: 'Complete me' });

    taskService.completeTask(task.id);

    expect(taskService.findById(task.id).status).toBe('done');
  });
});

describe('assignTask', () => {
  test('assigns a task to a user', () => {
    const task = taskService.create({
      title: 'Assigned task'
    });

    const updated = taskService.assignTask(task.id, 'Pritul');

    expect(updated.assignee).toBe('Pritul');
    expect(updated.id).toBe(task.id);
  });

  test('returns null for a non-existent task', () => {
    const result = taskService.assignTask('invalid-id', 'Pritul');

    expect(result).toBeNull();
  });

  test('persists the assignee in the task store', () => {
    const task = taskService.create({
      title: 'Assigned task'
    });

    taskService.assignTask(task.id, 'Pritul');

    expect(taskService.findById(task.id).assignee).toBe('Pritul');
  });

  test('allows reassigning an already assigned task', () => {
    const task = taskService.create({
      title: 'Assigned task'
    });

    taskService.assignTask(task.id, 'Alice');

    const updated = taskService.assignTask(task.id, 'Bob');

    expect(updated.assignee).toBe('Bob');
  });

  test('preserves other fields when assigning', () => {
    const task = taskService.create({
      title: 'Assigned task',
      priority: 'high'
    });

    const updated = taskService.assignTask(task.id, 'Pritul');

    expect(updated.priority).toBe('high');
    expect(updated.title).toBe('Assigned task');
  });
});