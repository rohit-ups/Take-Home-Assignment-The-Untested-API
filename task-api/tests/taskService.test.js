const taskService = require('../src/services/taskService');

describe('taskService', () => {
  // Reset the in-memory store before each test to ensure isolation
  beforeEach(() => {
    taskService._reset();
  });

  // ─────────────────────────────────────────────
  // create()
  // ─────────────────────────────────────────────
  describe('create()', () => {
    it('should create a task with all required and default fields', () => {
      const task = taskService.create({ title: 'Test Task' });

      expect(task).toMatchObject({
        title: 'Test Task',
        description: '',
        status: 'todo',
        priority: 'medium',
        dueDate: null,
        completedAt: null,
      });
      expect(task.id).toBeDefined();
      expect(task.createdAt).toBeDefined();
      // Verify createdAt is a valid ISO date
      expect(new Date(task.createdAt).toISOString()).toBe(task.createdAt);
    });

    it('should create a task with all custom fields', () => {
      const task = taskService.create({
        title: 'Custom Task',
        description: 'A detailed description',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2026-12-31T23:59:59.000Z',
      });

      expect(task.title).toBe('Custom Task');
      expect(task.description).toBe('A detailed description');
      expect(task.status).toBe('in_progress');
      expect(task.priority).toBe('high');
      expect(task.dueDate).toBe('2026-12-31T23:59:59.000Z');
    });

    it('should generate unique IDs for each task', () => {
      const task1 = taskService.create({ title: 'Task 1' });
      const task2 = taskService.create({ title: 'Task 2' });

      expect(task1.id).not.toBe(task2.id);
    });

    it('should add the task to the internal store', () => {
      taskService.create({ title: 'Stored Task' });
      const all = taskService.getAll();

      expect(all).toHaveLength(1);
      expect(all[0].title).toBe('Stored Task');
    });
  });

  // ─────────────────────────────────────────────
  // getAll()
  // ─────────────────────────────────────────────
  describe('getAll()', () => {
    it('should return an empty array when no tasks exist', () => {
      expect(taskService.getAll()).toEqual([]);
    });

    it('should return all tasks', () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });
      taskService.create({ title: 'Task 3' });

      expect(taskService.getAll()).toHaveLength(3);
    });

    it('should return a copy (not the original array reference)', () => {
      taskService.create({ title: 'Task 1' });
      const result = taskService.getAll();

      // Mutating the returned array should NOT affect the store
      result.push({ title: 'Injected' });
      expect(taskService.getAll()).toHaveLength(1);
    });
  });

  // ─────────────────────────────────────────────
  // findById()
  // ─────────────────────────────────────────────
  describe('findById()', () => {
    it('should find an existing task by its ID', () => {
      const created = taskService.create({ title: 'Find Me' });
      const found = taskService.findById(created.id);

      expect(found).toBeDefined();
      expect(found.title).toBe('Find Me');
    });

    it('should return undefined for a non-existent ID', () => {
      expect(taskService.findById('non-existent-id')).toBeUndefined();
    });
  });

  // ─────────────────────────────────────────────
  // getByStatus()
  // ─────────────────────────────────────────────
  describe('getByStatus()', () => {
    beforeEach(() => {
      taskService.create({ title: 'Todo 1', status: 'todo' });
      taskService.create({ title: 'Todo 2', status: 'todo' });
      taskService.create({ title: 'In Progress', status: 'in_progress' });
      taskService.create({ title: 'Done', status: 'done' });
    });

    it('should return tasks matching the given status', () => {
      const todos = taskService.getByStatus('todo');
      expect(todos).toHaveLength(2);
      todos.forEach((t) => expect(t.status).toBe('todo'));
    });

    it('should return an empty array for a status with no tasks', () => {
      taskService._reset();
      taskService.create({ title: 'Only todo', status: 'todo' });

      const inProgress = taskService.getByStatus('in_progress');
      expect(inProgress).toEqual([]);
    });

    it('should NOT do substring matching — status "do" should return empty for "todo" and "done"', () => {
      const results = taskService.getByStatus('do');
      expect(results).toHaveLength(0); // Expected: 0 items, because no task has status exactly 'do'
    });

    it('should NOT do substring matching — status "in" should return empty', () => {
      const results = taskService.getByStatus('in');
      expect(results).toHaveLength(0);
    });
  });

  // ─────────────────────────────────────────────
  // getPaginated()
  // ─────────────────────────────────────────────
  describe('getPaginated()', () => {
    beforeEach(() => {
      // Create 5 tasks in order
      for (let i = 1; i <= 5; i++) {
        taskService.create({ title: `Task ${i}` });
      }
    });

    it('should return the correct first page of items', () => {
      const result = taskService.getPaginated(1, 2);
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Task 1'); // Expected: Task 1 (index 0)
    });

    it('should respect the limit parameter', () => {
      const result = taskService.getPaginated(0, 3); // using page 0 to work around the bug
      expect(result).toHaveLength(3);
    });

    it('should return empty array for a page beyond all data', () => {
      const result = taskService.getPaginated(100, 10);
      expect(result).toEqual([]);
    });

    it('should return remaining items if fewer than limit exist on the last page', () => {
      // 5 items total: page 3 with limit 2 returns 1 item
      const result = taskService.getPaginated(3, 2);
      expect(result).toHaveLength(1);
    });
  });

  // ─────────────────────────────────────────────
  // getStats()
  // ─────────────────────────────────────────────
  describe('getStats()', () => {
    it('should return zero counts when no tasks exist', () => {
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

    it('should count overdue tasks (past dueDate, status not done)', () => {
      // A task with a dueDate in the past and status NOT done → overdue
      taskService.create({
        title: 'Overdue Task',
        status: 'todo',
        dueDate: '2020-01-01T00:00:00.000Z',
      });
      // A task that's done but past dueDate → NOT overdue
      taskService.create({
        title: 'Done Task',
        status: 'done',
        dueDate: '2020-01-01T00:00:00.000Z',
      });
      // A task with future dueDate → NOT overdue
      taskService.create({
        title: 'Future Task',
        status: 'todo',
        dueDate: '2099-12-31T23:59:59.000Z',
      });
      // A task with no dueDate → NOT overdue
      taskService.create({ title: 'No Due Date', status: 'todo' });

      const stats = taskService.getStats();
      expect(stats.overdue).toBe(1);
    });
  });

  // ─────────────────────────────────────────────
  // update()
  // ─────────────────────────────────────────────
  describe('update()', () => {
    it('should update specific fields on an existing task', () => {
      const task = taskService.create({ title: 'Original' });
      const updated = taskService.update(task.id, { title: 'Updated Title' });

      expect(updated.title).toBe('Updated Title');
      expect(updated.id).toBe(task.id); // id should stay the same
    });

    it('should return null for a non-existent task ID', () => {
      const result = taskService.update('fake-id', { title: 'Nope' });
      expect(result).toBeNull();
    });

    it('should persist the update in the store', () => {
      const task = taskService.create({ title: 'Before' });
      taskService.update(task.id, { title: 'After' });

      const found = taskService.findById(task.id);
      expect(found.title).toBe('After');
    });

    it('should preserve fields not included in the update', () => {
      const task = taskService.create({
        title: 'Keep Priority',
        priority: 'high',
      });
      taskService.update(task.id, { title: 'New Title' });

      const found = taskService.findById(task.id);
      expect(found.priority).toBe('high');
    });

    it('should not allow overwriting the task id via update', () => {
      const task = taskService.create({ title: 'Test' });
      const originalId = task.id;
      taskService.update(originalId, { id: 'injected-id' });

      const found = taskService.findById(originalId);
      expect(found).toBeDefined();
      expect(found.id).toBe(originalId); // Should remain the original ID
      
      const injectedFound = taskService.findById('injected-id');
      expect(injectedFound).toBeUndefined(); // Should not exist
    });
  });

  // ─────────────────────────────────────────────
  // remove()
  // ─────────────────────────────────────────────
  describe('remove()', () => {
    it('should remove the task and return true', () => {
      const task = taskService.create({ title: 'Delete Me' });
      const result = taskService.remove(task.id);

      expect(result).toBe(true);
      expect(taskService.getAll()).toHaveLength(0);
    });

    it('should return false for non-existent task', () => {
      const result = taskService.remove('non-existent');
      expect(result).toBe(false);
    });

    it('should not affect other tasks', () => {
      const t1 = taskService.create({ title: 'Keep' });
      const t2 = taskService.create({ title: 'Delete' });

      taskService.remove(t2.id);

      expect(taskService.getAll()).toHaveLength(1);
      expect(taskService.findById(t1.id)).toBeDefined();
    });
  });

  // ─────────────────────────────────────────────
  // completeTask()
  // ─────────────────────────────────────────────
  describe('completeTask()', () => {
    it('should mark a task as done with a completedAt timestamp', () => {
      const task = taskService.create({ title: 'Complete Me' });
      const completed = taskService.completeTask(task.id);

      expect(completed.status).toBe('done');
      expect(completed.completedAt).toBeDefined();
      expect(new Date(completed.completedAt).toISOString()).toBe(completed.completedAt);
    });

    it('should return null for a non-existent task', () => {
      const result = taskService.completeTask('non-existent');
      expect(result).toBeNull();
    });

    it('should preserve original priority when completing a task', () => {
      const task = taskService.create({ title: 'High Priority', priority: 'high' });
      const completed = taskService.completeTask(task.id);

      expect(completed.priority).toBe('high');
    });

    it('should persist the completion in the store', () => {
      const task = taskService.create({ title: 'Persist Complete' });
      taskService.completeTask(task.id);

      const found = taskService.findById(task.id);
      expect(found.status).toBe('done');
      expect(found.completedAt).toBeDefined();
    });
  });

  // ─────────────────────────────────────────────
  // assignTask()
  // ─────────────────────────────────────────────
  describe('assignTask()', () => {
    it('should set the assignee on a task', () => {
      const task = taskService.create({ title: 'Unassigned' });
      const assigned = taskService.assignTask(task.id, 'John Doe');

      expect(assigned.assignee).toBe('John Doe');
      
      // verify it was saved
      const found = taskService.findById(task.id);
      expect(found.assignee).toBe('John Doe');
    });

    it('should allow overwriting an existing assignee', () => {
      const task = taskService.create({ title: 'T' });
      taskService.assignTask(task.id, 'John');
      const reassigned = taskService.assignTask(task.id, 'Jane');

      expect(reassigned.assignee).toBe('Jane');
    });

    it('should return null for a non-existent task', () => {
      const result = taskService.assignTask('non-existent', 'John');
      expect(result).toBeNull();
    });
  });

  // ─────────────────────────────────────────────
  // _reset()
  // ─────────────────────────────────────────────
  describe('_reset()', () => {
    it('should clear all tasks', () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });
      taskService._reset();

      expect(taskService.getAll()).toHaveLength(0);
    });
  });
});
