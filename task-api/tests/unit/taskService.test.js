const taskService = require('../../src/services/taskService');

describe('TaskService Unit Tests', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('create', () => {
    test('creates a task with required fields and defaults', () => {
      const task = taskService.create({ title: 'Learn Jest' });

      expect(task).toBeDefined();
      expect(task.id).toBeDefined();
      expect(task.title).toBe('Learn Jest');
      expect(task.description).toBe('');
      expect(task.status).toBe('todo');
      expect(task.priority).toBe('medium');
      expect(task.dueDate).toBeNull();
      expect(task.assignee).toBeNull();
      expect(task.completedAt).toBeNull();
      expect(typeof task.createdAt).toBe('string');
      expect(new Date(task.createdAt).toString()).not.toBe('Invalid Date');
    });

    test('creates a task with custom fields', () => {
      const dueDate = '2026-10-01T00:00:00.000Z';
      const task = taskService.create({
        title: 'Review PR',
        description: 'Check logic',
        status: 'in_progress',
        priority: 'high',
        dueDate,
        assignee: 'Alice',
      });

      expect(task.title).toBe('Review PR');
      expect(task.description).toBe('Check logic');
      expect(task.status).toBe('in_progress');
      expect(task.priority).toBe('high');
      expect(task.dueDate).toBe(dueDate);
      expect(task.assignee).toBe('Alice');
    });
  });

  describe('getAll and findById', () => {
    test('getAll returns all tasks', () => {
      expect(taskService.getAll()).toEqual([]);
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });
      expect(taskService.getAll()).toHaveLength(2);
    });

    test('findById returns matching task or undefined', () => {
      const created = taskService.create({ title: 'Find Me' });
      const found = taskService.findById(created.id);
      expect(found).toEqual(created);

      const notFound = taskService.findById('non-existent-id');
      expect(notFound).toBeUndefined();
    });
  });

  describe('update', () => {
    test('updates fields of an existing task', () => {
      const task = taskService.create({ title: 'Initial Title', priority: 'low' });
      const updated = taskService.update(task.id, { title: 'Updated Title', priority: 'high' });

      expect(updated.title).toBe('Updated Title');
      expect(updated.priority).toBe('high');
      expect(taskService.findById(task.id).title).toBe('Updated Title');
    });

    test('returns null when updating non-existent task', () => {
      const result = taskService.update('random-id', { title: 'New' });
      expect(result).toBeNull();
    });
  });

  describe('remove', () => {
    test('removes an existing task and returns true', () => {
      const task = taskService.create({ title: 'To Delete' });
      const success = taskService.remove(task.id);

      expect(success).toBe(true);
      expect(taskService.findById(task.id)).toBeUndefined();
      expect(taskService.getAll()).toHaveLength(0);
    });

    test('returns false when deleting non-existent task', () => {
      const success = taskService.remove('non-existent-id');
      expect(success).toBe(false);
    });
  });

  describe('completeTask', () => {
    test('marks task as done, sets completedAt timestamp, and preserves priority', () => {
      const task = taskService.create({ title: 'Finish homework', priority: 'high' });
      const completed = taskService.completeTask(task.id);

      expect(completed).toBeDefined();
      expect(completed.status).toBe('done');
      expect(completed.priority).toBe('high');
      expect(completed.completedAt).toBeDefined();
      expect(new Date(completed.completedAt).toString()).not.toBe('Invalid Date');
    });

    test('returns null if completing non-existent task', () => {
      const result = taskService.completeTask('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('assignTask', () => {
    test('assigns an assignee name and trims whitespace', () => {
      const task = taskService.create({ title: 'Assignment Task' });
      const updated = taskService.assignTask(task.id, '  Sarah Connor  ');

      expect(updated).toBeDefined();
      expect(updated.assignee).toBe('Sarah Connor');
      expect(taskService.findById(task.id).assignee).toBe('Sarah Connor');
    });

    test('allows reassigning a task to another assignee', () => {
      const task = taskService.create({ title: 'Task', assignee: 'Old Person' });
      const updated = taskService.assignTask(task.id, 'New Person');

      expect(updated.assignee).toBe('New Person');
    });

    test('returns null if task does not exist', () => {
      const result = taskService.assignTask('invalid-id', 'Nobody');
      expect(result).toBeNull();
    });
  });

  describe('getStats', () => {
    test('calculates counts by status and overdue count', () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString();
      const futureDate = new Date(Date.now() + 86400000).toISOString();

      taskService.create({ title: 'Task 1', status: 'todo', dueDate: pastDate });
      taskService.create({ title: 'Task 2', status: 'in_progress', dueDate: futureDate });
      taskService.create({ title: 'Task 3', status: 'done', dueDate: pastDate });
      taskService.create({ title: 'Task 4', status: 'todo' });

      const stats = taskService.getStats();
      expect(stats.todo).toBe(2);
      expect(stats.in_progress).toBe(1);
      expect(stats.done).toBe(1);
      expect(stats.overdue).toBe(1);
    });
  });

  describe('getByStatus', () => {
    test('filters tasks by exact status', () => {
      taskService.create({ title: 'Task A', status: 'todo' });
      taskService.create({ title: 'Task B', status: 'in_progress' });
      taskService.create({ title: 'Task C', status: 'done' });

      const inProgressTasks = taskService.getByStatus('in_progress');
      expect(inProgressTasks).toHaveLength(1);
      expect(inProgressTasks[0].title).toBe('Task B');
    });
  });

  describe('getPaginated', () => {
    test('returns first page items for page=1 and limit=2', () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });
      taskService.create({ title: 'Task 3' });
      taskService.create({ title: 'Task 4' });
      taskService.create({ title: 'Task 5' });

      const page1 = taskService.getPaginated(1, 2);
      expect(page1).toHaveLength(2);
      expect(page1[0].title).toBe('Task 1');
      expect(page1[1].title).toBe('Task 2');

      const page2 = taskService.getPaginated(2, 2);
      expect(page2).toHaveLength(2);
      expect(page2[0].title).toBe('Task 3');
      expect(page2[1].title).toBe('Task 4');

      const page3 = taskService.getPaginated(3, 2);
      expect(page3).toHaveLength(1);
      expect(page3[0].title).toBe('Task 5');

      const page4 = taskService.getPaginated(4, 2);
      expect(page4).toHaveLength(0);
    });
  });
});
