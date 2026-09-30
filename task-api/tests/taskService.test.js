const taskService = require('../src/services/taskService');

describe('taskService Unit Tests', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('create and getAll', () => {
    it('should create a task with default values and return it in getAll', () => {
      const task = taskService.create({ title: 'Learn Testing' });

      expect(task).toHaveProperty('id');
      expect(task.title).toBe('Learn Testing');
      expect(task.description).toBe('');
      expect(task.status).toBe('todo');
      expect(task.priority).toBe('medium');
      expect(task.dueDate).toBeNull();
      expect(task.completedAt).toBeNull();
      expect(task.createdAt).toBeDefined();

      const all = taskService.getAll();
      expect(all.length).toBe(1);
      expect(all[0].id).toBe(task.id);
    });

    it('should create a task with custom fields', () => {
      const task = taskService.create({
        title: 'Custom Task',
        description: 'Detailed description',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2026-12-31T23:59:59.000Z',
      });

      expect(task.status).toBe('in_progress');
      expect(task.priority).toBe('high');
      expect(task.dueDate).toBe('2026-12-31T23:59:59.000Z');
    });
  });

  describe('findById', () => {
    it('should return the task if found by id', () => {
      const created = taskService.create({ title: 'Find Me' });
      const found = taskService.findById(created.id);
      expect(found).toBeDefined();
      expect(found.title).toBe('Find Me');
    });

    it('should return undefined if id does not exist', () => {
      const found = taskService.findById('non-existent-id');
      expect(found).toBeUndefined();
    });
  });

  describe('getByStatus', () => {
    it('should return tasks strictly matching status', () => {
      taskService.create({ title: 'Task 1', status: 'todo' });
      taskService.create({ title: 'Task 2', status: 'in_progress' });
      taskService.create({ title: 'Task 3', status: 'done' });

      const todoTasks = taskService.getByStatus('todo');
      expect(todoTasks.length).toBe(1);
      expect(todoTasks[0].title).toBe('Task 1');
    });

    // BUG: taskService.getByStatus uses String.prototype.includes()
    // Substring queries like 'do' incorrectly match both 'todo' and 'done'
    it('should not return tasks on partial substring matches', () => {
      taskService.create({ title: 'Task 1', status: 'todo' });
      taskService.create({ title: 'Task 2', status: 'done' });

      const matches = taskService.getByStatus('do');
      // Intended behavior: strict enum equality should return 0 results
      expect(matches.length).toBe(0);
    });
  });

  describe('getPaginated', () => {
    // BUG: offset = page * limit skips the first page entirely (off-by-one)
    it('should return the first page starting at index 0', () => {
      for (let i = 1; i <= 5; i++) {
        taskService.create({ title: `Task ${i}` });
      }

      // Page 1 with limit 2 should return Task 1 and Task 2
      const page1 = taskService.getPaginated(1, 2);
      expect(page1.length).toBe(2);
      expect(page1[0].title).toBe('Task 1');
      expect(page1[1].title).toBe('Task 2');
    });

    it('should return an empty array if page is out of bounds', () => {
      taskService.create({ title: 'Task 1' });
      const page = taskService.getPaginated(10, 10);
      expect(page).toEqual([]);
    });
  });

  describe('getStats', () => {
    it('should return accurate counts for each status and calculate overdue tasks', () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString();
      const futureDate = new Date(Date.now() + 86400000).toISOString();

      taskService.create({ title: 'Overdue Todo', status: 'todo', dueDate: pastDate });
      taskService.create({ title: 'Future In Progress', status: 'in_progress', dueDate: futureDate });
      taskService.create({ title: 'Completed Past Due', status: 'done', dueDate: pastDate });

      const stats = taskService.getStats();
      expect(stats.todo).toBe(1);
      expect(stats.in_progress).toBe(1);
      expect(stats.done).toBe(1);
      // Completed tasks must not be counted as overdue even if past dueDate
      expect(stats.overdue).toBe(1);
    });
  });

  describe('update', () => {
    it('should update specific fields of a task', () => {
      const task = taskService.create({ title: 'Original' });
      const updated = taskService.update(task.id, { title: 'Updated' });

      expect(updated.title).toBe('Updated');
      expect(taskService.findById(task.id).title).toBe('Updated');
    });

    it('should return null when updating a non-existent task', () => {
      const result = taskService.update('non-existent', { title: 'New' });
      expect(result).toBeNull();
    });
  });

  describe('remove', () => {
    it('should remove a task by id and return true', () => {
      const task = taskService.create({ title: 'Delete me' });
      const deleted = taskService.remove(task.id);

      expect(deleted).toBe(true);
      expect(taskService.findById(task.id)).toBeUndefined();
    });

    it('should return false if task does not exist', () => {
      const deleted = taskService.remove('non-existent');
      expect(deleted).toBe(false);
    });
  });

  describe('completeTask', () => {
    it('should mark task status as done and set completedAt', () => {
      const task = taskService.create({ title: 'Complete Me' });
      const completed = taskService.completeTask(task.id);

      expect(completed.status).toBe('done');
      expect(completed.completedAt).toBeDefined();
      expect(new Date(completed.completedAt).getTime()).not.toBeNaN();
    });

    // BUG: completeTask silently overwrites priority to 'medium', bad
    it('should preserve original priority when marking a task complete', () => {
      const task = taskService.create({ title: 'High Priority', priority: 'high' });
      const completed = taskService.completeTask(task.id);

      expect(completed.priority).toBe('high');
    });

    it('should return null if task does not exist', () => {
      const result = taskService.completeTask('non-existent');
      expect(result).toBeNull();
    });
  });
});