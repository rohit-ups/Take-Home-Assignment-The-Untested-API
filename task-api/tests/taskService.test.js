const taskService = require('../src/services/taskService');

// reset the in-memory store before each test
beforeEach(() => {
  taskService._reset();
});

// Create a task via the API

describe('taskService.create', () => {
  it('should create a task with all default fields populated', () => {
    const task = taskService.create({ title: 'My Task' });

    expect(task).toMatchObject({
      title: 'My Task',
      description: '',
      status: 'todo',
      priority: 'medium',
      dueDate: null,
      completedAt: null,
    });
    expect(task.id).toBeDefined();
    expect(task.createdAt).toBeDefined();
  });

  it('should create a task with all provided fields', () => {
    const input = {
      title: 'Full Task',
      description: 'detailed description',
      status: 'in_progress',
      priority: 'high',
      dueDate: '2026-12-31T00:00:00.000Z',
    };
    const task = taskService.create(input);

    expect(task.title).toBe('Full Task');
    expect(task.description).toBe('detailed description');
    expect(task.status).toBe('in_progress');
    expect(task.priority).toBe('high');
    expect(task.dueDate).toBe('2026-12-31T00:00:00.000Z');
  });

  it('should generate unique IDs for each task', () => {
    const t1 = taskService.create({ title: 'Task A' });
    const t2 = taskService.create({ title: 'Task B' });
    expect(t1.id).not.toBe(t2.id);
  });
});

// GET ALL

describe('taskService.getAll', () => {
  it('should return an empty array when no tasks exist', () => {
    expect(taskService.getAll()).toEqual([]);
  });

  it('should return all created tasks', () => {
    taskService.create({ title: 'A' });
    taskService.create({ title: 'B' });
    expect(taskService.getAll()).toHaveLength(2);
  });

  it('should return a copy, not the internal array reference', () => {
    taskService.create({ title: 'A' });
    const all = taskService.getAll();
    all.push({ fake: true });
    // internal store should be unaffected
    expect(taskService.getAll()).toHaveLength(1);
  });
});

// FIND BY ID
describe('taskService.findById', () => {
  it('should find a task by its ID', () => {
    const task = taskService.create({ title: 'Find Me' });
    const found = taskService.findById(task.id);
    expect(found).toBeDefined();
    expect(found.title).toBe('Find Me');
  });

  it('should return undefined for a non-existent ID', () => {
    expect(taskService.findById('non-existent-id')).toBeUndefined();
  });
});

// GET BY STATUS
// 
describe('taskService.getByStatus', () => {
  it('should filter tasks by status', () => {
    taskService.create({ title: 'Todo 1', status: 'todo' });
    taskService.create({ title: 'In Prog', status: 'in_progress' });
    taskService.create({ title: 'Done', status: 'done' });

    const todoTasks = taskService.getByStatus('todo');
    expect(todoTasks).toHaveLength(1);
    expect(todoTasks[0].title).toBe('Todo 1');
  });

  it('should return an empty array when no tasks match the status', () => {
    taskService.create({ title: 'Todo', status: 'todo' });
    const result = taskService.getByStatus('done');
    expect(result).toEqual([]);
  });

  it('should not partially match status values', () => {
    taskService.create({ title: 'Completed', status: 'done' });

    const result = taskService.getByStatus('do');

    expect(result).toHaveLength(0);
  });
});

// GET PAGINATED
describe('taskService.getPaginated', () => {
  beforeEach(() => {
    for (let i = 1; i <= 15; i++) {
      taskService.create({ title: `Task ${i}` });
    }
  });

  it('should return the first 5 items for page 1 with limit 5', () => {
    const result = taskService.getPaginated(1, 5);
    expect(result).toHaveLength(5);
    expect(result[0].title).toBe('Task 1');
    expect(result[4].title).toBe('Task 5');
  });

  it('should return items 6-10 for page 2 with limit 5', () => {
    const result = taskService.getPaginated(2, 5);
    expect(result).toHaveLength(5);
    expect(result[0].title).toBe('Task 6');
    expect(result[4].title).toBe('Task 10');
  });

  it('should return empty array when page exceeds available data', () => {
    const result = taskService.getPaginated(100, 5);
    expect(result).toEqual([]);
  });
});

// GET STATS
describe('taskService.getStats', () => {
  it('should return zero counts when no tasks exist', () => {
    const stats = taskService.getStats();
    expect(stats).toEqual({ todo: 0, in_progress: 0, done: 0, overdue: 0 });
  });

  it('should count tasks by status correctly', () => {
    taskService.create({ title: 'A', status: 'todo' });
    taskService.create({ title: 'B', status: 'todo' });
    taskService.create({ title: 'C', status: 'in_progress' });
    taskService.create({ title: 'D', status: 'done' });

    const stats = taskService.getStats();
    expect(stats.todo).toBe(2);
    expect(stats.in_progress).toBe(1);
    expect(stats.done).toBe(1);
  });

  it('should count overdue tasks (past dueDate + not done)', () => {
    taskService.create({
      title: 'Overdue',
      status: 'todo',
      dueDate: '2020-01-01T00:00:00.000Z',
    });
    taskService.create({
      title: 'Not Overdue',
      status: 'done',
      dueDate: '2020-01-01T00:00:00.000Z',
    });

    const stats = taskService.getStats();
    expect(stats.overdue).toBe(1);
  });

  it('should NOT count tasks with future dueDate as overdue', () => {
    taskService.create({
      title: 'Future',
      status: 'todo',
      dueDate: '2099-12-31T00:00:00.000Z',
    });
    const stats = taskService.getStats();
    expect(stats.overdue).toBe(0);
  });
});

// 
// UPDATE
// 
describe('taskService.update', () => {
  it('should update specific fields of a task', () => {
    const task = taskService.create({ title: 'Original' });
    const updated = taskService.update(task.id, { title: 'Updated', priority: 'high' });

    expect(updated.title).toBe('Updated');
    expect(updated.priority).toBe('high');
    expect(updated.id).toBe(task.id);
  });

  it('should return null when task ID does not exist', () => {
    const result = taskService.update('nonexistent', { title: 'Nope' });
    expect(result).toBeNull();
  });

  it('should persist the update in the store', () => {
    const task = taskService.create({ title: 'Before' });
    taskService.update(task.id, { title: 'After' });
    const found = taskService.findById(task.id);
    expect(found.title).toBe('After');
  });
});

// REMOVE
describe('taskService.remove', () => {
  it('should remove a task and return true', () => {
    const task = taskService.create({ title: 'Delete Me' });
    const result = taskService.remove(task.id);
    expect(result).toBe(true);
    expect(taskService.findById(task.id)).toBeUndefined();
  });

  it('should return false when task ID does not exist', () => {
    expect(taskService.remove('nonexistent')).toBe(false);
  });

  it('should reduce the total task count by one', () => {
    taskService.create({ title: 'A' });
    const task = taskService.create({ title: 'B' });
    taskService.remove(task.id);
    expect(taskService.getAll()).toHaveLength(1);
  });
});

// 
// COMPLETE TASK
describe('taskService.completeTask', () => {
  it('should mark a task as done and set completedAt', () => {
    const task = taskService.create({ title: 'Finish this', status: 'todo' });
    const completed = taskService.completeTask(task.id);

    expect(completed.status).toBe('done');
    expect(completed.completedAt).toBeDefined();
    expect(new Date(completed.completedAt).getTime()).not.toBeNaN();
  });

  it('should return null for a non-existent task', () => {
    expect(taskService.completeTask('nonexistent')).toBeNull();
  });

  // completeTask silently resets priority to 'medium'.
  it('completeTask resets priority to medium regardless of original priority', () => {
    const task = taskService.create({ title: 'Urgent', priority: 'high' });
    const completed = taskService.completeTask(task.id);

    expect(completed.priority).toBe('high'); 
  });

  it('should persist the completion in the store', () => {
    const task = taskService.create({ title: 'Persist test' });
    taskService.completeTask(task.id);
    const found = taskService.findById(task.id);
    expect(found.status).toBe('done');
    expect(found.completedAt).toBeDefined();
  });
});


// ASSIGN TASK
describe('taskService.assignTask', () => {
  it('should assign a person to a task', () => {
    const task = taskService.create({ title: 'Assign Me' });
    const result = taskService.assignTask(task.id, 'Alice');

    expect(result.assignee).toBe('Alice');
    expect(result.id).toBe(task.id);
  });

  it('should return null for a non-existent task', () => {
    expect(taskService.assignTask('nonexistent', 'Bob')).toBeNull();
  });

  it('should allow reassigning a task to a different person', () => {
    const task = taskService.create({ title: 'Reassign Me' });
    taskService.assignTask(task.id, 'Alice');
    const result = taskService.assignTask(task.id, 'Bob');

    expect(result.assignee).toBe('Bob');
  });

  it('should persist the assignment in the store', () => {
    const task = taskService.create({ title: 'Persist' });
    taskService.assignTask(task.id, 'Charlie');
    const found = taskService.findById(task.id);
    expect(found.assignee).toBe('Charlie');
  });

  it('should default assignee to null on task creation', () => {
    const task = taskService.create({ title: 'No Assignee' });
    expect(task.assignee).toBeNull();
  });
});

// _RESET (test utility)
describe('taskService._reset', () => {
  it('should clear all tasks', () => {
    taskService.create({ title: 'A' });
    taskService.create({ title: 'B' });
    taskService._reset();
    expect(taskService.getAll()).toEqual([]);
  });
});
