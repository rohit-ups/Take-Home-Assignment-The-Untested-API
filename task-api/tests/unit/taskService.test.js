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

    test('prevents store mutation via returned task object references (reference leak guard)', () => {
      const created = taskService.create({ title: 'Original Task' });
      const fetched = taskService.getAll()[0];
      fetched.title = 'Mutated Externally';

      const verifyStore = taskService.findById(created.id);
      expect(verifyStore.title).toBe('Original Task');
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
    test('filters tasks by exact status', () => {
      taskService.create({ title: 'Task 1', status: 'todo' });
      taskService.create({ title: 'Task 2', status: 'in_progress' });
      taskService.create({ title: 'Task 3', status: 'done' });

      const todoTasks = taskService.getByStatus('todo');
      expect(todoTasks).toHaveLength(1);
      expect(todoTasks[0].title).toBe('Task 1');
    });

    test('returns empty array when searching by partial substring status (BUG-01 fixed)', () => {
      taskService.create({ title: 'Todo Task', status: 'todo' });
      taskService.create({ title: 'Done Task', status: 'done' });

      const matchedTasks = taskService.getByStatus('do');
      expect(matchedTasks).toEqual([]);
    });
  });

  describe('getPaginated', () => {
    test('calculates 1-based page offset correctly (BUG-02 fixed)', () => {
      const t1 = taskService.create({ title: 'Task 1' });
      const t2 = taskService.create({ title: 'Task 2' });
      const t3 = taskService.create({ title: 'Task 3' });

      const page1 = taskService.getPaginated(1, 2);
      expect(page1).toHaveLength(2);
      expect(page1[0].title).toBe('Task 1');
      expect(page1[1].title).toBe('Task 2');

      const page2 = taskService.getPaginated(2, 2);
      expect(page2).toHaveLength(1);
      expect(page2[0].title).toBe('Task 3');
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

    test('prevents updating protected system metadata (id, createdAt, completedAt)', () => {
      const created = taskService.create({ title: 'Protected Meta Task' });
      const originalCreatedAt = created.createdAt;

      const updated = taskService.update(created.id, {
        id: 'hacked-id',
        createdAt: '1999-01-01T00:00:00.000Z',
        completedAt: '1999-01-01T00:00:00.000Z',
        title: 'New Title',
      });

      expect(updated.id).toBe(created.id);
      expect(updated.createdAt).toBe(originalCreatedAt);
      expect(updated.completedAt).toBeNull();
      expect(updated.title).toBe('New Title');
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
