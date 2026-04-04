const taskService = require('../src/services/taskService');

describe('Task Service', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('create', () => {
    it('creates a task with defaults', () => {
      const task = taskService.create({ title: 'Test Task' });

      expect(task).toHaveProperty('id');
      expect(task.title).toBe('Test Task');
      expect(task.status).toBe('todo');
      expect(task.priority).toBe('medium');
      expect(task.completedAt).toBeNull();
    });
  });

  describe('getByStatus', () => {
    it('returns only exact status matches', () => {
      taskService.create({ title: 'Todo Task', status: 'todo' });
      taskService.create({ title: 'Done Task', status: 'done' });

      const todoTasks = taskService.getByStatus('todo');
      expect(todoTasks).toHaveLength(1);
      expect(todoTasks[0].title).toBe('Todo Task');
    });

    it('does not treat partial strings as matches', () => {
      taskService.create({ title: 'Todo Task', status: 'todo' });
      taskService.create({ title: 'Done Task', status: 'done' });

      const partialMatches = taskService.getByStatus('o');
      expect(partialMatches).toHaveLength(0);
    });
  });

  describe('getPaginated', () => {
    it('returns first page from the beginning of the list', () => {
      for (let i = 0; i < 15; i++) {
        taskService.create({ title: `Task ${i}` });
      }

      const page1 = taskService.getPaginated(1, 10);
      expect(page1).toHaveLength(10);
      expect(page1[0].title).toBe('Task 0');
      expect(page1[9].title).toBe('Task 9');
    });

    it('returns remaining records on second page', () => {
      for (let i = 0; i < 15; i++) {
        taskService.create({ title: `Task ${i}` });
      }

      const page2 = taskService.getPaginated(2, 10);
      expect(page2).toHaveLength(5);
      expect(page2[0].title).toBe('Task 10');
    });
  });

  describe('findById', () => {
    it('finds a task by id', () => {
      const created = taskService.create({ title: 'Lookup Task' });
      const found = taskService.findById(created.id);

      expect(found).toBeDefined();
      expect(found.id).toBe(created.id);
    });

    it('returns undefined for unknown id', () => {
      expect(taskService.findById('missing-id')).toBeUndefined();
    });
  });

  describe('update', () => {
    it('updates selected fields on an existing task', () => {
      const created = taskService.create({ title: 'Old Title', priority: 'high' });
      const updated = taskService.update(created.id, { title: 'New Title' });

      expect(updated.title).toBe('New Title');
      expect(updated.priority).toBe('high');
    });

    it('returns null for unknown id', () => {
      const updated = taskService.update('missing-id', { title: 'Nope' });
      expect(updated).toBeNull();
    });
  });

  describe('remove', () => {
    it('removes an existing task', () => {
      const created = taskService.create({ title: 'Delete Me' });
      const removed = taskService.remove(created.id);

      expect(removed).toBe(true);
      expect(taskService.findById(created.id)).toBeUndefined();
    });

    it('returns false for unknown id', () => {
      expect(taskService.remove('missing-id')).toBe(false);
    });
  });

  describe('completeTask', () => {
    it('marks task as done and sets completion time', () => {
      const created = taskService.create({ title: 'Complete Me' });
      const completed = taskService.completeTask(created.id);

      expect(completed.status).toBe('done');
      expect(completed.completedAt).not.toBeNull();
    });

    it('preserves the original priority of the task', () => {
      const created = taskService.create({ title: 'High Priority Task', priority: 'high' });
      const completed = taskService.completeTask(created.id);

      expect(completed.priority).toBe('high');
    });

    it('returns null for unknown id', () => {
      expect(taskService.completeTask('missing-id')).toBeNull();
    });
  });

  describe('assign', () => {
    it('sets the assignee on an existing task', () => {
      const created = taskService.create({ title: 'Assign Me' });
      const updated = taskService.assign(created.id, 'Alice');

      expect(updated.assignee).toBe('Alice');
      expect(taskService.findById(created.id).assignee).toBe('Alice');
    });

    it('returns null for unknown id', () => {
      const updated = taskService.assign('missing-id', 'Alice');
      expect(updated).toBeNull();
    });
  });

  describe('getStats', () => {
    it('returns status totals and overdue count', () => {
      taskService.create({ title: 'Todo Overdue', status: 'todo', dueDate: '2020-01-01T00:00:00Z' });
      taskService.create({ title: 'Done Old', status: 'done', dueDate: '2020-01-01T00:00:00Z' });
      taskService.create({ title: 'In Progress', status: 'in_progress', dueDate: '2050-01-01T00:00:00Z' });

      const stats = taskService.getStats();
      expect(stats.todo).toBe(1);
      expect(stats.done).toBe(1);
      expect(stats.in_progress).toBe(1);
      expect(stats.overdue).toBe(1);
    });
  });
});
