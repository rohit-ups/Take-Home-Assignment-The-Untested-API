const taskService = require('../src/services/taskService');

beforeEach(() => {
  taskService._reset();
});

describe('taskService', () => {
  describe('getAll', () => {
    it('should return an empty array initially', () => {
      expect(taskService.getAll()).toEqual([]);
    });

    it('should return a copy, not the original array', () => {
      taskService.create({ title: 'Test' });
      const result = taskService.getAll();
      result.push({ fake: true });
      expect(taskService.getAll().length).toBe(1);
    });

    it('should return all created tasks', () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });
      expect(taskService.getAll().length).toBe(2);
    });
  });

  describe('create', () => {
    it('should create a task with required fields', () => {
      const task = taskService.create({ title: 'My Task' });
      expect(task).toHaveProperty('id');
      expect(task.title).toBe('My Task');
      expect(task.description).toBe('');
      expect(task.status).toBe('todo');
      expect(task.priority).toBe('medium');
      expect(task.dueDate).toBeNull();
      expect(task.completedAt).toBeNull();
      expect(task).toHaveProperty('createdAt');
    });

    it('should create a task with all optional fields', () => {
      const task = taskService.create({
        title: 'Full Task',
        description: 'A description',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2026-12-31T00:00:00.000Z',
      });
      expect(task.title).toBe('Full Task');
      expect(task.description).toBe('A description');
      expect(task.status).toBe('in_progress');
      expect(task.priority).toBe('high');
      expect(task.dueDate).toBe('2026-12-31T00:00:00.000Z');
    });

    it('should generate a unique id for each task', () => {
      const task1 = taskService.create({ title: 'Task 1' });
      const task2 = taskService.create({ title: 'Task 2' });
      expect(task1.id).not.toBe(task2.id);
    });

    it('should set createdAt to an ISO string', () => {
      const task = taskService.create({ title: 'Timed' });
      expect(new Date(task.createdAt).toISOString()).toBe(task.createdAt);
    });
  });

  describe('findById', () => {
    it('should find a task by its id', () => {
      const created = taskService.create({ title: 'Find Me' });
      const found = taskService.findById(created.id);
      expect(found).toBeDefined();
      expect(found.title).toBe('Find Me');
    });

    it('should return undefined for non-existent id', () => {
      expect(taskService.findById('non-existent-id')).toBeUndefined();
    });
  });

  describe('getByStatus', () => {
    beforeEach(() => {
      taskService.create({ title: 'Todo 1', status: 'todo' });
      taskService.create({ title: 'Todo 2', status: 'todo' });
      taskService.create({ title: 'In Progress 1', status: 'in_progress' });
      taskService.create({ title: 'Done 1', status: 'done' });
    });

    it('should filter tasks by exact status', () => {
      const todoTasks = taskService.getByStatus('todo');
      expect(todoTasks.length).toBe(2);
      todoTasks.forEach((t) => expect(t.status).toBe('todo'));
    });

    it('should return in_progress tasks', () => {
      const inProgress = taskService.getByStatus('in_progress');
      expect(inProgress.length).toBe(1);
      expect(inProgress[0].status).toBe('in_progress');
    });

    it('should return done tasks', () => {
      const done = taskService.getByStatus('done');
      expect(done.length).toBe(1);
      expect(done[0].status).toBe('done');
    });

    it('should return empty array for non-matching status', () => {
      const result = taskService.getByStatus('nonexistent');
      expect(result).toEqual([]);
    });
  });

  describe('getPaginated', () => {
    beforeEach(() => {
      for (let i = 1; i <= 25; i++) {
        taskService.create({ title: `Task ${i}` });
      }
    });

    it('should return the first page of results', () => {
      const page = taskService.getPaginated(1, 10);
      expect(page.length).toBe(10);
      expect(page[0].title).toBe('Task 1');
    });

    it('should return the second page of results', () => {
      const page = taskService.getPaginated(2, 10);
      expect(page.length).toBe(10);
      expect(page[0].title).toBe('Task 11');
    });

    it('should return partial results on the last page', () => {
      const page = taskService.getPaginated(3, 10);
      expect(page.length).toBe(5);
      expect(page[0].title).toBe('Task 21');
    });

    it('should return empty array for page beyond data', () => {
      const page = taskService.getPaginated(10, 10);
      expect(page).toEqual([]);
    });

    it('should handle limit larger than total tasks', () => {
      const page = taskService.getPaginated(1, 100);
      expect(page.length).toBe(25);
    });
  });

  describe('getStats', () => {
    it('should return zero counts for empty store', () => {
      const stats = taskService.getStats();
      expect(stats).toEqual({ todo: 0, in_progress: 0, done: 0, overdue: 0 });
    });

    it('should count tasks by status correctly', () => {
      taskService.create({ title: 'T1', status: 'todo' });
      taskService.create({ title: 'T2', status: 'todo' });
      taskService.create({ title: 'T3', status: 'in_progress' });
      taskService.create({ title: 'T4', status: 'done' });
      const stats = taskService.getStats();
      expect(stats.todo).toBe(2);
      expect(stats.in_progress).toBe(1);
      expect(stats.done).toBe(1);
    });

    it('should count overdue tasks (past due, not done)', () => {
      taskService.create({
        title: 'Overdue',
        status: 'todo',
        dueDate: '2020-01-01T00:00:00.000Z',
      });
      taskService.create({
        title: 'Not Overdue - Done',
        status: 'done',
        dueDate: '2020-01-01T00:00:00.000Z',
      });
      taskService.create({
        title: 'Not Overdue - No Date',
        status: 'todo',
      });
      const stats = taskService.getStats();
      expect(stats.overdue).toBe(1);
    });

    it('should count overdue in_progress tasks', () => {
      taskService.create({
        title: 'Overdue IP',
        status: 'in_progress',
        dueDate: '2020-01-01T00:00:00.000Z',
      });
      const stats = taskService.getStats();
      expect(stats.overdue).toBe(1);
    });
  });

  describe('update', () => {
    it('should update a task and return the updated version', () => {
      const created = taskService.create({ title: 'Original' });
      const updated = taskService.update(created.id, { title: 'Updated' });
      expect(updated.title).toBe('Updated');
      expect(updated.id).toBe(created.id);
    });

    it('should return null for non-existent task', () => {
      expect(taskService.update('fake-id', { title: 'X' })).toBeNull();
    });

    it('should preserve fields not included in update', () => {
      const created = taskService.create({ title: 'T', description: 'Desc' });
      const updated = taskService.update(created.id, { title: 'New Title' });
      expect(updated.description).toBe('Desc');
    });
  });

  describe('remove', () => {
    it('should remove an existing task and return true', () => {
      const created = taskService.create({ title: 'Delete Me' });
      expect(taskService.remove(created.id)).toBe(true);
      expect(taskService.findById(created.id)).toBeUndefined();
    });

    it('should return false for non-existent task', () => {
      expect(taskService.remove('fake-id')).toBe(false);
    });

    it('should not affect other tasks', () => {
      const t1 = taskService.create({ title: 'Keep' });
      const t2 = taskService.create({ title: 'Remove' });
      taskService.remove(t2.id);
      expect(taskService.getAll().length).toBe(1);
      expect(taskService.findById(t1.id)).toBeDefined();
    });
  });

  describe('completeTask', () => {
    it('should mark a task as done', () => {
      const created = taskService.create({ title: 'Complete Me' });
      const completed = taskService.completeTask(created.id);
      expect(completed.status).toBe('done');
      expect(completed).toHaveProperty('completedAt');
      expect(new Date(completed.completedAt).toISOString()).toBe(completed.completedAt);
    });

    it('should return null for non-existent task', () => {
      expect(taskService.completeTask('fake-id')).toBeNull();
    });

    it('should preserve the original priority', () => {
      const created = taskService.create({ title: 'High Priority', priority: 'high' });
      const completed = taskService.completeTask(created.id);
      expect(completed.priority).toBe('high');
    });

    it('should preserve the original title and description', () => {
      const created = taskService.create({
        title: 'Important',
        description: 'Critical task',
      });
      const completed = taskService.completeTask(created.id);
      expect(completed.title).toBe('Important');
      expect(completed.description).toBe('Critical task');
    });
  });

  describe('_reset', () => {
    it('should clear all tasks', () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });
      taskService._reset();
      expect(taskService.getAll()).toEqual([]);
    });
  });

  describe('assignTask', () => {
    it('should assign a task to a user and return updated task', () => {
      const created = taskService.create({ title: 'Assignable' });
      const assigned = taskService.assignTask(created.id, 'Alice');
      expect(assigned.assignee).toBe('Alice');
      expect(assigned).toHaveProperty('assignedAt');
      expect(new Date(assigned.assignedAt).toISOString()).toBe(assigned.assignedAt);
    });

    it('should return null for non-existent task', () => {
      expect(taskService.assignTask('fake-id', 'Alice')).toBeNull();
    });

    it('should allow reassignment to a different user', () => {
      const created = taskService.create({ title: 'Reassign' });
      taskService.assignTask(created.id, 'Alice');
      const reassigned = taskService.assignTask(created.id, 'Bob');
      expect(reassigned.assignee).toBe('Bob');
    });

    it('should preserve other task fields after assignment', () => {
      const created = taskService.create({
        title: 'Keep Fields',
        priority: 'high',
        description: 'Important',
      });
      const assigned = taskService.assignTask(created.id, 'Alice');
      expect(assigned.title).toBe('Keep Fields');
      expect(assigned.priority).toBe('high');
      expect(assigned.description).toBe('Important');
      expect(assigned.status).toBe('todo');
    });
  });
});
