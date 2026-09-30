const taskService = require('../src/services/taskService');

describe('taskService Unit Tests', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('create', () => {
    it('creates a task with default values for omitted optional fields', () => {
      const task = taskService.create({ title: 'Buy groceries' });
      expect(task).toHaveProperty('id');
      expect(task.title).toBe('Buy groceries');
      expect(task.description).toBe('');
      expect(task.status).toBe('todo');
      expect(task.priority).toBe('medium');
      expect(task.dueDate).toBeNull();
      expect(task.completedAt).toBeNull();
      expect(task.assignee).toBeNull();
      expect(task.createdAt).toBeDefined();
      expect(new Date(task.createdAt).toString()).not.toBe('Invalid Date');
    });

    it('creates a task with custom values', () => {
      const dueDate = new Date(Date.now() + 86400000).toISOString();
      const task = taskService.create({
        title: 'Submit report',
        description: 'Quarterly financial report',
        status: 'in_progress',
        priority: 'high',
        dueDate,
      });
      expect(task.title).toBe('Submit report');
      expect(task.description).toBe('Quarterly financial report');
      expect(task.status).toBe('in_progress');
      expect(task.priority).toBe('high');
      expect(task.dueDate).toBe(dueDate);
    });
  });

  describe('getAll', () => {
    it('returns empty array when no tasks exist', () => {
      expect(taskService.getAll()).toEqual([]);
    });

    it('returns all created tasks', () => {
      const t1 = taskService.create({ title: 'Task 1' });
      const t2 = taskService.create({ title: 'Task 2' });
      const all = taskService.getAll();
      expect(all.length).toBe(2);
      expect(all.map((t) => t.id)).toEqual([t1.id, t2.id]);
    });

    it.failing('BUG-4: getAll should return deep copies or frozen objects so store is not mutated directly', () => {
      const t1 = taskService.create({ title: 'Immutable Test' });
      const all = taskService.getAll();
      all[0].title = 'Directly Mutated Title';
      const fetched = taskService.findById(t1.id);
      expect(fetched.title).toBe('Immutable Test');
    });
  });

  describe('findById', () => {
    it('returns task when found by ID', () => {
      const created = taskService.create({ title: 'Find Me' });
      const found = taskService.findById(created.id);
      expect(found).toEqual(created);
    });

    it('returns undefined when task ID is non-existent', () => {
      expect(taskService.findById('non-existent-uuid')).toBeUndefined();
    });

    it.failing('BUG-4: findById should return object copy to prevent accidental state mutation', () => {
      const created = taskService.create({ title: 'Original Title' });
      const found = taskService.findById(created.id);
      found.title = 'Mutated Directly';
      const refreshed = taskService.findById(created.id);
      expect(refreshed.title).toBe('Original Title');
    });
  });

  describe('getByStatus', () => {
    it('returns tasks matching exact status filter', () => {
      taskService.create({ title: 'Todo task', status: 'todo' });
      taskService.create({ title: 'In progress task', status: 'in_progress' });
      taskService.create({ title: 'Done task', status: 'done' });

      const todoTasks = taskService.getByStatus('todo');
      expect(todoTasks.length).toBe(1);
      expect(todoTasks[0].title).toBe('Todo task');

      const doneTasks = taskService.getByStatus('done');
      expect(doneTasks.length).toBe(1);
      expect(doneTasks[0].title).toBe('Done task');
    });

    it('returns empty array when no tasks match status', () => {
      taskService.create({ title: 'Todo task', status: 'todo' });
      expect(taskService.getByStatus('done')).toEqual([]);
    });

    it.failing('BUG-2: getByStatus should not perform substring matching like "do" matching "todo" or "done"', () => {
      taskService.create({ title: 'Todo task', status: 'todo' });
      taskService.create({ title: 'Done task', status: 'done' });
      // "do" is not a valid status enum, should return empty array, not both tasks
      const results = taskService.getByStatus('do');
      expect(results.length).toBe(0);
    });
  });

  describe('getPaginated', () => {
    it('BUG-1 [FIXED]: getPaginated(1, 10) should return first page (offset 0)', () => {
      for (let i = 1; i <= 5; i++) {
        taskService.create({ title: `Task ${i}` });
      }
      const page1 = taskService.getPaginated(1, 2);
      expect(page1.length).toBe(2);
      expect(page1[0].title).toBe('Task 1');
      expect(page1[1].title).toBe('Task 2');
    });

    it('handles requests for pages past total count', () => {
      taskService.create({ title: 'Task 1' });
      const page = taskService.getPaginated(10, 10);
      expect(page).toEqual([]);
    });

    it('handles limit 0 gracefully', () => {
      taskService.create({ title: 'Task 1' });
      const page = taskService.getPaginated(1, 0);
      expect(page).toEqual([]);
    });
  });

  describe('getStats', () => {
    it('returns counts by status and overdue count', () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString();
      const futureDate = new Date(Date.now() + 86400000).toISOString();

      taskService.create({ title: 'T1', status: 'todo', dueDate: pastDate }); // Overdue
      taskService.create({ title: 'T2', status: 'in_progress', dueDate: futureDate }); // Not overdue
      taskService.create({ title: 'T3', status: 'done', dueDate: pastDate }); // Done task with past date -> Not overdue
      taskService.create({ title: 'T4', status: 'todo', dueDate: null }); // No dueDate -> Not overdue

      const stats = taskService.getStats();
      expect(stats).toEqual({
        todo: 2,
        in_progress: 1,
        done: 1,
        overdue: 1,
      });
    });

    it('handles tasks with unknown or custom status without crashing', () => {
      taskService.create({ title: 'Unknown status task', status: 'unknown_status' });
      const stats = taskService.getStats();
      expect(stats.todo).toBe(0);
      expect(stats.in_progress).toBe(0);
      expect(stats.done).toBe(0);
    });

    it('returns zeros when store is empty', () => {
      expect(taskService.getStats()).toEqual({
        todo: 0,
        in_progress: 0,
        done: 0,
        overdue: 0,
      });
    });
  });

  describe('update', () => {
    it('updates specified fields of existing task', () => {
      const created = taskService.create({ title: 'Old Title', priority: 'low' });
      const updated = taskService.update(created.id, { title: 'New Title', priority: 'high' });
      expect(updated).not.toBeNull();
      expect(updated.title).toBe('New Title');
      expect(updated.priority).toBe('high');
      expect(updated.status).toBe('todo'); // Untouched
    });

    it('returns null for non-existent task ID', () => {
      expect(taskService.update('unknown-id', { title: 'New' })).toBeNull();
    });
  });

  describe('remove', () => {
    it('removes existing task and returns true', () => {
      const created = taskService.create({ title: 'To Delete' });
      const result = taskService.remove(created.id);
      expect(result).toBe(true);
      expect(taskService.findById(created.id)).toBeUndefined();
    });

    it('returns false for non-existent task ID', () => {
      expect(taskService.remove('unknown-id')).toBe(false);
    });
  });

  describe('completeTask', () => {
    it('marks task as completed with status done and completedAt set', () => {
      const created = taskService.create({ title: 'Finish work' });
      const completed = taskService.completeTask(created.id);
      expect(completed.status).toBe('done');
      expect(completed.completedAt).toBeDefined();
      expect(new Date(completed.completedAt).toString()).not.toBe('Invalid Date');
    });

    it('returns null for non-existent task ID', () => {
      expect(taskService.completeTask('unknown-id')).toBeNull();
    });

    it.failing('BUG-3: completeTask should preserve existing task priority instead of resetting it to medium', () => {
      const created = taskService.create({ title: 'Urgent Task', priority: 'high' });
      const completed = taskService.completeTask(created.id);
      expect(completed.priority).toBe('high');
    });
  });

  describe('assignTask', () => {
    it('assigns task to a user and trims whitespace', () => {
      const created = taskService.create({ title: 'Task to assign' });
      const updated = taskService.assignTask(created.id, '  Alice Smith  ');
      expect(updated).not.toBeNull();
      expect(updated.assignee).toBe('Alice Smith');
    });

    it('allows reassignment to a different user', () => {
      const created = taskService.create({ title: 'Task to reassign' });
      taskService.assignTask(created.id, 'Alice');
      const updated = taskService.assignTask(created.id, 'Bob');
      expect(updated.assignee).toBe('Bob');
    });

    it('returns null when task ID does not exist', () => {
      expect(taskService.assignTask('unknown-id', 'Alice')).toBeNull();
    });
  });

  describe('_reset', () => {
    it('resets in-memory tasks array to empty', () => {
      taskService.create({ title: 'T1' });
      taskService._reset();
      expect(taskService.getAll()).toEqual([]);
    });
  });
});
