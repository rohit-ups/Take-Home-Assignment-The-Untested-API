const taskService = require('../src/services/taskService');

describe('taskService (Unit Tests)', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('create()', () => {
    it('creates a task with provided values and generates id and createdAt', () => {
      const task = taskService.create({
        title: 'Complete assignment',
        description: 'Write comprehensive tests',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2026-12-31T23:59:59.000Z',
      });

      expect(task).toBeDefined();
      expect(task.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      expect(task.title).toBe('Complete assignment');
      expect(task.description).toBe('Write comprehensive tests');
      expect(task.status).toBe('in_progress');
      expect(task.priority).toBe('high');
      expect(task.dueDate).toBe('2026-12-31T23:59:59.000Z');
      expect(task.completedAt).toBeNull();
      expect(typeof task.createdAt).toBe('string');
      expect(new Date(task.createdAt).getTime()).not.toBeNaN();
      expect(Date.now() - new Date(task.createdAt).getTime()).toBeLessThan(5000);
    });

    it('applies documented defaults when optional fields are omitted', () => {
      const task = taskService.create({ title: 'Minimal task' });

      expect(task.title).toBe('Minimal task');
      expect(task.description).toBe('');
      expect(task.status).toBe('todo');
      expect(task.priority).toBe('medium');
      expect(task.dueDate).toBeNull();
      expect(task.completedAt).toBeNull();
      expect(task.assignee).toBeNull();
      expect(task.id).toBeDefined();
      expect(task.createdAt).toBeDefined();
    });

    it('generates distinct IDs on successive calls', () => {
      const task1 = taskService.create({ title: 'Task 1' });
      const task2 = taskService.create({ title: 'Task 2' });

      expect(task1.id).not.toBe(task2.id);
    });

    it('only persists explicitly destructured fields, ignoring unexpected keys', () => {
      const task = taskService.create({
        title: 'Task with extra fields',
        foo: 'bar',
        unknownProperty: 12345,
        isAdmin: true,
      });

      expect(task.foo).toBeUndefined();
      expect(task.unknownProperty).toBeUndefined();
      expect(task.isAdmin).toBeUndefined();
      expect(Object.keys(task)).toEqual([
        'id',
        'title',
        'description',
        'status',
        'priority',
        'dueDate',
        'completedAt',
        'createdAt',
        'assignee',
      ]);
    });
  });

  describe('getAll()', () => {
    it('returns empty array when store is empty', () => {
      expect(taskService.getAll()).toEqual([]);
    });

    it('returns all created tasks', () => {
      const t1 = taskService.create({ title: 'Task 1' });
      const t2 = taskService.create({ title: 'Task 2' });

      const all = taskService.getAll();
      expect(all).toHaveLength(2);
      expect(all).toEqual([t1, t2]);
    });

    it('returns a shallow copy of the tasks array', () => {
      taskService.create({ title: 'Task 1' });
      const all = taskService.getAll();
      all.push({ id: 'injected' });

      expect(taskService.getAll()).toHaveLength(1);
    });
  });

  describe('findById()', () => {
    it('returns the task matching the provided ID', () => {
      const created = taskService.create({ title: 'Find me' });
      const found = taskService.findById(created.id);

      expect(found).toEqual(created);
    });

    it('returns undefined for an unknown ID', () => {
      const result = taskService.findById('non-existent-id');
      expect(result).toBeUndefined();
    });
  });

  describe('getByStatus()', () => {
    it('returns tasks matching the exact status', () => {
      const t1 = taskService.create({ title: 'Task 1', status: 'todo' });
      taskService.create({ title: 'Task 2', status: 'in_progress' });
      const t3 = taskService.create({ title: 'Task 3', status: 'todo' });

      const results = taskService.getByStatus('todo');
      expect(results).toHaveLength(2);
      expect(results).toEqual([t1, t3]);
    });

    it('returns an empty array when no tasks have the given status', () => {
      taskService.create({ title: 'Task 1', status: 'todo' });
      const results = taskService.getByStatus('done');
      expect(results).toEqual([]);
    });

    it('returns an empty array for an unknown/invalid status string', () => {
      taskService.create({ title: 'Task 1', status: 'todo' });
      const results = taskService.getByStatus('bogus_status');
      expect(results).toEqual([]);
    });

    // BUG DISCOVERY: Substring matching probe
    // getByStatus uses String.prototype.includes(), so 'do' matches both 'todo' and 'done'
    test.failing('does not return tasks whose status merely contains the search term as a substring', () => {
      taskService.create({ title: 'Task Todo', status: 'todo' });
      taskService.create({ title: 'Task Done', status: 'done' });

      const results = taskService.getByStatus('do');
      // A caller querying 'do' expects only tasks with exact status === 'do' (which is none)
      expect(results).toHaveLength(0);
    });
  });

  describe('getPaginated()', () => {
    beforeEach(() => {
      for (let i = 1; i <= 25; i++) {
        taskService.create({ title: `Task ${i}` });
      }
    });

    it('returns the first page (items 1 to 10) for page=1 and limit=10', () => {
      const page1 = taskService.getPaginated(1, 10);
      expect(page1).toHaveLength(10);
      expect(page1[0].title).toBe('Task 1');
      expect(page1[9].title).toBe('Task 10');
    });

    it('returns the second page (items 11 to 20) for page=2 and limit=10 without gaps or overlaps', () => {
      const page1 = taskService.getPaginated(1, 10);
      const page2 = taskService.getPaginated(2, 10);

      expect(page2).toHaveLength(10);
      expect(page2[0].title).toBe('Task 11');
      expect(page2[9].title).toBe('Task 20');

      const allTitles = [...page1.map((t) => t.title), ...page2.map((t) => t.title)];
      const uniqueTitles = new Set(allTitles);
      expect(uniqueTitles.size).toBe(20);
    });

    it('returns remaining items on the last partial page', () => {
      const page3 = taskService.getPaginated(3, 10);
      expect(page3).toHaveLength(5);
      expect(page3[0].title).toBe('Task 21');
      expect(page3[4].title).toBe('Task 25');
    });

    it('returns empty array when page is beyond the total items', () => {
      const result = taskService.getPaginated(10, 10);
      expect(result).toEqual([]);
    });

    it('clamps non-positive page numbers to page 1', () => {
      const page0 = taskService.getPaginated(0, 10);
      expect(page0).toHaveLength(10);
      expect(page0[0].title).toBe('Task 1');

      const pageNeg = taskService.getPaginated(-2, 10);
      expect(pageNeg).toHaveLength(10);
      expect(pageNeg[0].title).toBe('Task 1');
    });

    it('returns all items if limit is larger than total count', () => {
      const result = taskService.getPaginated(1, 50);
      expect(result).toHaveLength(25);
    });
  });

  describe('getStats()', () => {
    it('returns all zeroes on an empty store', () => {
      const stats = taskService.getStats();
      expect(stats).toEqual({
        todo: 0,
        in_progress: 0,
        done: 0,
        overdue: 0,
      });
    });

    it('correctly aggregates counts for each status bucket', () => {
      taskService.create({ title: 'T1', status: 'todo' });
      taskService.create({ title: 'T2', status: 'todo' });
      taskService.create({ title: 'T3', status: 'in_progress' });
      taskService.create({ title: 'T4', status: 'done' });
      // Task with non-standard status should not increment standard count buckets
      taskService.create({ title: 'T5', status: 'custom_status' });

      const stats = taskService.getStats();
      expect(stats).toEqual({
        todo: 2,
        in_progress: 1,
        done: 1,
        overdue: 0,
      });
    });

    it('counts overdue tasks: past dueDate and status !== "done"', () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString();
      const futureDate = new Date(Date.now() + 86400000).toISOString();

      // Overdue: past dueDate and status === 'todo'
      taskService.create({ title: 'Overdue Todo', status: 'todo', dueDate: pastDate });
      // Overdue: past dueDate and status === 'in_progress'
      taskService.create({ title: 'Overdue In Progress', status: 'in_progress', dueDate: pastDate });
      // NOT overdue: past dueDate but status === 'done'
      taskService.create({ title: 'Completed Past Due', status: 'done', dueDate: pastDate });
      // NOT overdue: future dueDate
      taskService.create({ title: 'Future Due', status: 'todo', dueDate: futureDate });
      // NOT overdue: null dueDate
      taskService.create({ title: 'No Due Date', status: 'todo', dueDate: null });

      const stats = taskService.getStats();
      expect(stats.todo).toBe(3);
      expect(stats.in_progress).toBe(1);
      expect(stats.done).toBe(1);
      expect(stats.overdue).toBe(2);
    });
  });

  describe('update()', () => {
    it('updates specified fields while keeping other fields unchanged', () => {
      const task = taskService.create({
        title: 'Original Title',
        description: 'Original Desc',
        priority: 'low',
        status: 'todo',
      });

      const updated = taskService.update(task.id, {
        title: 'Updated Title',
        priority: 'high',
      });

      expect(updated.id).toBe(task.id);
      expect(updated.title).toBe('Updated Title');
      expect(updated.description).toBe('Original Desc');
      expect(updated.priority).toBe('high');
      expect(updated.status).toBe('todo');
      expect(updated.createdAt).toBe(task.createdAt);
    });

    it('returns null when attempting to update a non-existent task ID', () => {
      const result = taskService.update('non-existent-id', { title: 'New Title' });
      expect(result).toBeNull();
    });

    // BUG DISCOVERY: Immutable field probe
    // taskService.update blindly applies `{ ...tasks[index], ...fields }`, allowing caller to overwrite id and createdAt
    test.failing('does not allow overwriting server-managed immutable fields (id and createdAt)', () => {
      const original = taskService.create({ title: 'Original Task' });
      const updated = taskService.update(original.id, {
        id: 'attacker-controlled-id',
        createdAt: '1970-01-01T00:00:00.000Z',
      });

      expect(updated.id).toBe(original.id);
      expect(updated.createdAt).toBe(original.createdAt);
      expect(taskService.findById(original.id)).toBeDefined();
      expect(taskService.findById('attacker-controlled-id')).toBeUndefined();
    });
  });

  describe('remove()', () => {
    it('removes the task and returns true on success', () => {
      const task = taskService.create({ title: 'To be deleted' });
      const result = taskService.remove(task.id);

      expect(result).toBe(true);
      expect(taskService.findById(task.id)).toBeUndefined();
      expect(taskService.getAll()).toHaveLength(0);
    });

    it('returns false when attempting to remove a non-existent ID without throwing', () => {
      const result = taskService.remove('non-existent-id');
      expect(result).toBe(false);
    });
  });

  describe('completeTask()', () => {
    it('sets status to "done" and sets completedAt timestamp', () => {
      const task = taskService.create({ title: 'Task to finish' });
      const completed = taskService.completeTask(task.id);

      expect(completed).toBeDefined();
      expect(completed.id).toBe(task.id);
      expect(completed.status).toBe('done');
      expect(typeof completed.completedAt).toBe('string');
      expect(new Date(completed.completedAt).getTime()).not.toBeNaN();
      expect(Date.now() - new Date(completed.completedAt).getTime()).toBeLessThan(5000);
    });

    it('returns null for an unknown ID', () => {
      const result = taskService.completeTask('non-existent-id');
      expect(result).toBeNull();
    });

    // BUG DISCOVERY: Side-effect probe
    // completeTask hardcodes `priority: 'medium'`, overwriting 'high' or 'low'
    test.failing('preserves the original priority when marking a task as complete', () => {
      const task = taskService.create({
        title: 'Urgent Task',
        priority: 'high',
      });

      const completed = taskService.completeTask(task.id);
      expect(completed.priority).toBe('high');
    });
  });

  describe('_reset()', () => {
    it('clears all stored tasks', () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });
      expect(taskService.getAll()).toHaveLength(2);

      taskService._reset();
      expect(taskService.getAll()).toEqual([]);
    });
  });
});
