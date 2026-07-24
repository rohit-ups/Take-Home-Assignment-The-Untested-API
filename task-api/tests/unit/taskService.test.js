const taskService = require('../../src/services/taskService');

describe('taskService', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('create', () => {
    test('creates a task with default parameters', () => {
      const task = taskService.create({ title: 'Default Task' });
      expect(task).toHaveProperty('id');
      expect(task.title).toBe('Default Task');
      expect(task.description).toBe('');
      expect(task.status).toBe('todo');
      expect(task.priority).toBe('medium');
      expect(task.dueDate).toBeNull();
      expect(task.completedAt).toBeNull();
      expect(task.createdAt).toBeDefined();
    });

    test('creates a task with custom fields', () => {
      const task = taskService.create({
        title: 'Custom Task',
        description: 'Detailed description',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2026-12-31T00:00:00.000Z',
      });
      expect(task.title).toBe('Custom Task');
      expect(task.description).toBe('Detailed description');
      expect(task.status).toBe('in_progress');
      expect(task.priority).toBe('high');
      expect(task.dueDate).toBe('2026-12-31T00:00:00.000Z');
    });
  });

  describe('getAll', () => {
    test('returns an empty array when no tasks exist', () => {
      expect(taskService.getAll()).toEqual([]);
    });

    test('returns a shallow copy of all tasks', () => {
      const t1 = taskService.create({ title: 'Task 1' });
      const t2 = taskService.create({ title: 'Task 2' });
      const all = taskService.getAll();
      expect(all.length).toBe(2);
      expect(all).toEqual([t1, t2]);
    });
  });

  describe('findById', () => {
    test('finds task by ID', () => {
      const created = taskService.create({ title: 'Searchable Task' });
      const found = taskService.findById(created.id);
      expect(found).toEqual(created);
    });

    test('returns undefined if task is not found', () => {
      expect(taskService.findById('non-existent-id')).toBeUndefined();
    });
  });

  describe('getByStatus', () => {
    test('returns tasks strictly matching status', () => {
      taskService.create({ title: 'Todo Task', status: 'todo' });
      taskService.create({ title: 'Done Task', status: 'done' });
      taskService.create({ title: 'InProgress Task', status: 'in_progress' });

      const todoTasks = taskService.getByStatus('todo');
      expect(todoTasks.length).toBe(1);
      expect(todoTasks[0].title).toBe('Todo Task');

      const doneTasks = taskService.getByStatus('done');
      expect(doneTasks.length).toBe(1);
      expect(doneTasks[0].title).toBe('Done Task');
    });

    test('does not return tasks using substring matching (verifying bug fix)', () => {
      taskService.create({ title: 'Todo Task', status: 'todo' });
      taskService.create({ title: 'Done Task', status: 'done' });

      // Searching for 'do' should not match 'todo' or 'done'
      const partialMatch = taskService.getByStatus('do');
      expect(partialMatch).toEqual([]);
    });
  });

  describe('getPaginated', () => {
    test('returns page 1 correctly with 1-based indexing (verifying bug fix)', () => {
      for (let i = 1; i <= 15; i++) {
        taskService.create({ title: `Task ${i}` });
      }

      const page1 = taskService.getPaginated(1, 10);
      expect(page1.length).toBe(10);
      expect(page1[0].title).toBe('Task 1');
      expect(page1[9].title).toBe('Task 10');

      const page2 = taskService.getPaginated(2, 10);
      expect(page2.length).toBe(5);
      expect(page2[0].title).toBe('Task 11');
      expect(page2[4].title).toBe('Task 15');
    });

    test('supports passing custom task array for paginating filtered results', () => {
      for (let i = 1; i <= 5; i++) {
        taskService.create({ title: `Todo ${i}`, status: 'todo' });
      }
      const filtered = taskService.getByStatus('todo');
      const page1 = taskService.getPaginated(1, 3, filtered);
      expect(page1.length).toBe(3);
      expect(page1[0].title).toBe('Todo 1');
    });

    test('handles fallback defaults when page or limit are undefined or invalid', () => {
      taskService.create({ title: 'Task 1' });
      const result = taskService.getPaginated(undefined, undefined);
      expect(result.length).toBe(1);
      expect(result[0].title).toBe('Task 1');
    });
  });


  describe('getStats', () => {
    test('calculates counts by status and overdue count', () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString();
      const futureDate = new Date(Date.now() + 86400000).toISOString();

      taskService.create({ title: 'T1', status: 'todo', dueDate: pastDate }); // Overdue
      taskService.create({ title: 'T2', status: 'in_progress', dueDate: pastDate }); // Overdue
      taskService.create({ title: 'T3', status: 'done', dueDate: pastDate }); // Not overdue because done
      taskService.create({ title: 'T4', status: 'todo', dueDate: futureDate }); // Not overdue
      taskService.create({ title: 'T5', status: 'todo', dueDate: null }); // Not overdue

      const stats = taskService.getStats();
      expect(stats).toEqual({
        todo: 3,
        in_progress: 1,
        done: 1,
        overdue: 2,
      });
    });

    test('handles tasks with unknown status without error', () => {
      const task = taskService.create({ title: 'Unknown Status Task' });
      task.status = 'custom_unknown_status';
      const stats = taskService.getStats();
      expect(stats.todo).toBe(0);
    });
  });


  describe('update', () => {
    test('updates existing task fields', () => {
      const task = taskService.create({ title: 'Old Title', priority: 'low' });
      const updated = taskService.update(task.id, { title: 'New Title', priority: 'high' });
      expect(updated.title).toBe('New Title');
      expect(updated.priority).toBe('high');
      expect(taskService.findById(task.id).title).toBe('New Title');
    });

    test('returns null when updating non-existent task', () => {
      const result = taskService.update('non-existent-id', { title: 'New' });
      expect(result).toBeNull();
    });
  });

  describe('remove', () => {
    test('removes existing task', () => {
      const task = taskService.create({ title: 'To Delete' });
      const removed = taskService.remove(task.id);
      expect(removed).toBe(true);
      expect(taskService.findById(task.id)).toBeUndefined();
    });

    test('returns false when deleting non-existent task', () => {
      const removed = taskService.remove('non-existent-id');
      expect(removed).toBe(false);
    });
  });

  describe('completeTask', () => {
    test('marks task done, sets completedAt, and preserves original priority (verifying bug fix)', () => {
      const task = taskService.create({ title: 'High Priority Task', priority: 'high' });
      const completed = taskService.completeTask(task.id);

      expect(completed.status).toBe('done');
      expect(completed.completedAt).toBeDefined();
      expect(completed.priority).toBe('high'); // Priority should not be reset to 'medium'
    });

    test('returns null if completing non-existent task', () => {
      expect(taskService.completeTask('non-existent-id')).toBeNull();
    });
  });

  describe('assignTask', () => {
    test('assigns assignee to task', () => {
      const task = taskService.create({ title: 'Unassigned Task' });
      const assigned = taskService.assignTask(task.id, 'Bob Builder');

      expect(assigned.assignee).toBe('Bob Builder');
      expect(taskService.findById(task.id).assignee).toBe('Bob Builder');
    });

    test('returns null when assigning non-existent task', () => {
      expect(taskService.assignTask('non-existent-id', 'Alice')).toBeNull();
    });
  });
});
