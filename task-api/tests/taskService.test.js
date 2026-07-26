const taskService = require('../src/services/taskService');

describe('taskService unit tests', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('create', () => {
    test('should create a task with default parameters', () => {
      const task = taskService.create({ title: 'Test Task' });
      expect(task.id).toBeDefined();
      expect(task.title).toBe('Test Task');
      expect(task.description).toBe('');
      expect(task.status).toBe('todo');
      expect(task.priority).toBe('medium');
      expect(task.dueDate).toBeNull();
      expect(task.assignee).toBeNull();
      expect(task.completedAt).toBeNull();
      expect(task.createdAt).toBeDefined();
    });

    test('should create a task with custom parameters', () => {
      const task = taskService.create({
        title: 'Custom Task',
        description: 'Details',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2026-08-01T12:00:00Z',
        assignee: 'Alice',
      });
      expect(task.title).toBe('Custom Task');
      expect(task.description).toBe('Details');
      expect(task.status).toBe('in_progress');
      expect(task.priority).toBe('high');
      expect(task.dueDate).toBe('2026-08-01T12:00:00Z');
      expect(task.assignee).toBe('Alice');
    });
  });

  describe('getAll', () => {
    test('should return all created tasks', () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });
      const all = taskService.getAll();
      expect(all.length).toBe(2);
      expect(all[0].title).toBe('Task 1');
      expect(all[1].title).toBe('Task 2');
    });
  });

  describe('findById', () => {
    test('should return the correct task by id', () => {
      const task = taskService.create({ title: 'Find Me' });
      const found = taskService.findById(task.id);
      expect(found).toEqual(task);
    });

    test('should return undefined if task does not exist', () => {
      const found = taskService.findById('non-existent-uuid');
      expect(found).toBeUndefined();
    });
  });

  describe('getByStatus', () => {
    test('should return tasks with the exact status matches', () => {
      taskService.create({ title: 'Todo 1', status: 'todo' });
      taskService.create({ title: 'In Progress 1', status: 'in_progress' });
      taskService.create({ title: 'Done 1', status: 'done' });

      const todoTasks = taskService.getByStatus('todo');
      expect(todoTasks.length).toBe(1);
      expect(todoTasks[0].title).toBe('Todo 1');

      const doneTasks = taskService.getByStatus('done');
      expect(doneTasks.length).toBe(1);
      expect(doneTasks[0].title).toBe('Done 1');
    });

    test('should not match partial status substrings (strict equality evaluation)', () => {
      taskService.create({ title: 'Todo Task', status: 'todo' });
      taskService.create({ title: 'Done Task', status: 'done' });

      // If status.includes was used, 'o' would match both 'todo' and 'done' and 'in_progress'
      const oTasks = taskService.getByStatus('o');
      expect(oTasks.length).toBe(0);

      // 'do' should not match 'todo' or 'done'
      const doTasks = taskService.getByStatus('do');
      expect(doTasks.length).toBe(0);
    });
  });

  describe('getPaginated', () => {
    test('should paginate correctly starting at index 0 for page 1', () => {
      for (let i = 1; i <= 15; i++) {
        taskService.create({ title: `Task ${i}` });
      }

      // Page 1, limit 10: Tasks 1-10 (indices 0 to 9)
      const page1 = taskService.getPaginated(1, 10);
      expect(page1.length).toBe(10);
      expect(page1[0].title).toBe('Task 1');
      expect(page1[9].title).toBe('Task 10');

      // Page 2, limit 10: Tasks 11-15 (indices 10 to 14)
      const page2 = taskService.getPaginated(2, 10);
      expect(page2.length).toBe(5);
      expect(page2[0].title).toBe('Task 11');
      expect(page2[4].title).toBe('Task 15');
    });

    test('should return empty array if offset exceeds task count', () => {
      taskService.create({ title: 'Task 1' });
      const page = taskService.getPaginated(2, 10); // offset = 10
      expect(page.length).toBe(0);
    });
  });

  describe('getStats', () => {
    test('should count stats correctly, including overdue tasks', () => {
      // Current date mock context
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      taskService.create({ title: 'T1', status: 'todo', dueDate: yesterday.toISOString() }); // Overdue
      taskService.create({ title: 'T2', status: 'in_progress', dueDate: tomorrow.toISOString() }); // Not overdue
      taskService.create({ title: 'T3', status: 'done', dueDate: yesterday.toISOString() }); // Done (so not counted as overdue)
      taskService.create({ title: 'T4', status: 'todo', dueDate: null }); // No dueDate (so not overdue)

      const stats = taskService.getStats();
      expect(stats.todo).toBe(2);
      expect(stats.in_progress).toBe(1);
      expect(stats.done).toBe(1);
      expect(stats.overdue).toBe(1); // Only T1
    });

    test('should ignore tasks with invalid status when counting stats', () => {
      const task = taskService.create({ title: 'Invalid Status Task' });
      // Mutate status to something not in counts map using update
      taskService.update(task.id, { status: 'weird_status' });

      const stats = taskService.getStats();
      expect(stats.todo).toBe(0);
      expect(stats.in_progress).toBe(0);
      expect(stats.done).toBe(0);
    });
  });

  describe('update', () => {
    test('should update task fields correctly', () => {
      const task = taskService.create({ title: 'Old Title', priority: 'low' });
      const updated = taskService.update(task.id, {
        title: 'New Title',
        priority: 'high',
        description: 'New description',
        status: 'in_progress',
        dueDate: '2026-09-01T00:00:00.000Z',
        assignee: 'Bob'
      });
      expect(updated.id).toBe(task.id);
      expect(updated.title).toBe('New Title');
      expect(updated.priority).toBe('high');
      expect(updated.description).toBe('New description');
      expect(updated.status).toBe('in_progress');
      expect(updated.dueDate).toBe('2026-09-01T00:00:00.000Z');
      expect(updated.assignee).toBe('Bob');
    });

    test('should protect against mass assignment by ignoring id, createdAt, completedAt override attempts', () => {
      const task = taskService.create({ title: 'Original Task' });
      const originalId = task.id;
      const originalCreatedAt = task.createdAt;

      const updated = taskService.update(task.id, {
        id: 'malicious-id',
        createdAt: '2000-01-01',
        completedAt: '2000-01-01',
        title: 'Legit Title Change'
      });

      expect(updated.id).toBe(originalId);
      expect(updated.createdAt).toBe(originalCreatedAt);
      expect(updated.completedAt).toBeNull();
      expect(updated.title).toBe('Legit Title Change');
    });

    test('should return null if task to update does not exist', () => {
      const result = taskService.update('non-existent', { title: 'New' });
      expect(result).toBeNull();
    });
  });

  describe('remove', () => {
    test('should delete task and return true', () => {
      const task = taskService.create({ title: 'To Delete' });
      const deleted = taskService.remove(task.id);
      expect(deleted).toBe(true);
      expect(taskService.getAll().length).toBe(0);
    });

    test('should return false if task to delete does not exist', () => {
      const deleted = taskService.remove('non-existent');
      expect(deleted).toBe(false);
    });
  });

  describe('completeTask', () => {
    test('should mark task as done and preserve its original priority', () => {
      const task = taskService.create({ title: 'T', priority: 'high', status: 'todo' });
      const completed = taskService.completeTask(task.id);
      expect(completed.status).toBe('done');
      expect(completed.completedAt).not.toBeNull();
      // Original priority was high, must remain high instead of resetting to medium!
      expect(completed.priority).toBe('high');
    });

    test('should return null if completing non-existent task', () => {
      const result = taskService.completeTask('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('assign', () => {
    test('should set the assignee on the task', () => {
      const task = taskService.create({ title: 'T', status: 'todo' });
      const updated = taskService.assign(task.id, 'John Doe');
      expect(updated.assignee).toBe('John Doe');
      expect(updated.title).toBe('T'); // Other fields unchanged
    });

    test('should return null if assigning to a non-existent task', () => {
      const result = taskService.assign('non-existent', 'John Doe');
      expect(result).toBeNull();
    });
  });
});
