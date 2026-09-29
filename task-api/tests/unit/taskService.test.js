const taskService = require('../../src/services/taskService');

describe('taskService unit tests', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('create', () => {
    test('creates a task with default values', () => {
      const task = taskService.create({ title: 'Task 1' });

      expect(task).toHaveProperty('id');
      expect(task.title).toBe('Task 1');
      expect(task.description).toBe('');
      expect(task.status).toBe('todo');
      expect(task.priority).toBe('medium');
      expect(task.dueDate).toBeNull();
      expect(task.completedAt).toBeNull();
      expect(typeof task.createdAt).toBe('string');
    });

    test('creates a task with custom values', () => {
      const dueDate = '2026-12-31T00:00:00.000Z';
      const task = taskService.create({
        title: 'Custom Task',
        description: 'Detailed description',
        status: 'in_progress',
        priority: 'high',
        dueDate,
      });

      expect(task.title).toBe('Custom Task');
      expect(task.description).toBe('Detailed description');
      expect(task.status).toBe('in_progress');
      expect(task.priority).toBe('high');
      expect(task.dueDate).toBe(dueDate);
    });
  });

  describe('getAll', () => {
    test('returns an empty array initially', () => {
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
  });

  describe('findById', () => {
    test('returns task when matching id exists', () => {
      const created = taskService.create({ title: 'Task 1' });
      const found = taskService.findById(created.id);

      expect(found).toEqual(created);
    });

    test('returns undefined when task id is not found', () => {
      const found = taskService.findById('non-existent-id');
      expect(found).toBeUndefined();
    });
  });

  describe('getByStatus', () => {
    test('filters tasks by status', () => {
      taskService.create({ title: 'Task 1', status: 'todo' });
      taskService.create({ title: 'Task 2', status: 'in_progress' });
      taskService.create({ title: 'Task 3', status: 'done' });

      const todoTasks = taskService.getByStatus('todo');
      expect(todoTasks).toHaveLength(1);
      expect(todoTasks[0].title).toBe('Task 1');
    });

    test('exposes BUG-01 substring matching issue when status is substring', () => {
      taskService.create({ title: 'Todo Task', status: 'todo' });
      taskService.create({ title: 'Done Task', status: 'done' });

      // 'do' is a substring of both 'todo' and 'done'
      const matchedTasks = taskService.getByStatus('do');
      // Demonstrates BUG-01: returns both 'todo' and 'done' due to String.includes()
      expect(matchedTasks).toHaveLength(2);
    });
  });

  describe('getPaginated', () => {
    test('exposes BUG-02 1-based pagination offset calculation', () => {
      const t1 = taskService.create({ title: 'Task 1' });
      const t2 = taskService.create({ title: 'Task 2' });

      // Currently getPaginated(1, 10) calculates offset = 1 * 10 = 10
      // Page 1 returns empty array when total tasks < 10!
      const page1 = taskService.getPaginated(1, 10);
      expect(page1).toEqual([]);

      // Demonstrates BUG-02: To get page 0 (offset 0), getPaginated(0, 10) must be called
      const page0 = taskService.getPaginated(0, 10);
      expect(page0).toHaveLength(2);
    });
  });

  describe('getStats', () => {
    test('calculates counts by status and overdue count', () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString(); // 1 day ago
      const futureDate = new Date(Date.now() + 86400000).toISOString(); // 1 day in future

      taskService.create({ title: 'Todo 1', status: 'todo', dueDate: pastDate }); // overdue
      taskService.create({ title: 'Todo 2', status: 'todo', dueDate: futureDate }); // not overdue
      taskService.create({ title: 'In Progress 1', status: 'in_progress' });
      taskService.create({ title: 'Done 1', status: 'done', dueDate: pastDate }); // completed, not overdue

      const stats = taskService.getStats();
      expect(stats).toEqual({
        todo: 2,
        in_progress: 1,
        done: 1,
        overdue: 1,
      });
    });
  });

  describe('update', () => {
    test('updates existing task fields', () => {
      const created = taskService.create({ title: 'Original Title', priority: 'low' });
      const updated = taskService.update(created.id, { title: 'Updated Title', priority: 'high' });

      expect(updated.title).toBe('Updated Title');
      expect(updated.priority).toBe('high');
      expect(taskService.findById(created.id).title).toBe('Updated Title');
    });

    test('returns null when updating non-existent task', () => {
      const result = taskService.update('non-existent-id', { title: 'New' });
      expect(result).toBeNull();
    });
  });

  describe('remove', () => {
    test('removes task and returns true when id exists', () => {
      const created = taskService.create({ title: 'To delete' });
      const result = taskService.remove(created.id);

      expect(result).toBe(true);
      expect(taskService.findById(created.id)).toBeUndefined();
      expect(taskService.getAll()).toHaveLength(0);
    });

    test('returns false when task id is not found', () => {
      const result = taskService.remove('non-existent-id');
      expect(result).toBe(false);
    });
  });

  describe('completeTask', () => {
    test('marks task as done and sets completedAt timestamp', () => {
      const created = taskService.create({ title: 'Task to complete' });
      const completed = taskService.completeTask(created.id);

      expect(completed.status).toBe('done');
      expect(completed.completedAt).not.toBeNull();
      expect(typeof completed.completedAt).toBe('string');
    });

    test('preserves original task priority (low, medium, high) when completed', () => {
      ['low', 'medium', 'high'].forEach((priority) => {
        const created = taskService.create({ title: `${priority} priority task`, priority });
        const completed = taskService.completeTask(created.id);
        expect(completed.priority).toBe(priority);
      });
    });

    test('returns null when task id does not exist', () => {
      const result = taskService.completeTask('non-existent-id');
      expect(result).toBeNull();
    });
  });

  describe('assignTask', () => {
    test('assigns a user to an existing task and preserves all other fields', () => {
      const created = taskService.create({
        title: 'Task to Assign',
        description: 'Details',
        priority: 'high',
        status: 'in_progress',
        dueDate: '2026-12-31T00:00:00.000Z',
      });

      const assigned = taskService.assignTask(created.id, 'John Doe');

      expect(assigned.assignee).toBe('John Doe');
      expect(assigned.title).toBe('Task to Assign');
      expect(assigned.description).toBe('Details');
      expect(assigned.priority).toBe('high');
      expect(assigned.status).toBe('in_progress');
      expect(assigned.dueDate).toBe('2026-12-31T00:00:00.000Z');
    });

    test('returns null when task id does not exist', () => {
      const result = taskService.assignTask('non-existent-id', 'John Doe');
      expect(result).toBeNull();
    });
  });
});
