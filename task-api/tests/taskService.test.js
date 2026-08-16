const taskService = require('../src/services/taskService');

describe('taskService - Unit Tests', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('create', () => {
    test('should create a task with all default values', () => {
      const task = taskService.create({ title: 'My Task' });
      expect(task.id).toBeDefined();
      expect(task.title).toBe('My Task');
      expect(task.description).toBe('');
      expect(task.status).toBe('todo');
      expect(task.priority).toBe('medium');
      expect(task.dueDate).toBeNull();
      expect(task.completedAt).toBeNull();
      expect(task.createdAt).toBeDefined();
    });

    test('should create a task with custom fields', () => {
      const dueDate = '2025-12-31T23:59:59Z';
      const task = taskService.create({
        title: 'Important Task',
        description: 'Do this ASAP',
        status: 'in_progress',
        priority: 'high',
        dueDate,
      });
      expect(task.title).toBe('Important Task');
      expect(task.description).toBe('Do this ASAP');
      expect(task.status).toBe('in_progress');
      expect(task.priority).toBe('high');
      expect(task.dueDate).toBe(dueDate);
    });

    test('should add created task to the store', () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });
      const all = taskService.getAll();
      expect(all.length).toBe(2);
    });
  });

  describe('getAll', () => {
    test('should return empty array when no tasks exist', () => {
      const tasks = taskService.getAll();
      expect(tasks).toEqual([]);
    });

    test('should return all created tasks', () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });
      taskService.create({ title: 'Task 3' });
      const tasks = taskService.getAll();
      expect(tasks.length).toBe(3);
      expect(tasks[0].title).toBe('Task 1');
    });

    test('should return a copy, not reference to internal array', () => {
      taskService.create({ title: 'Task 1' });
      const tasks = taskService.getAll();
      tasks.push({ fake: 'task' });
      const tasksAgain = taskService.getAll();
      expect(tasksAgain.length).toBe(1); // Should still be 1
    });
  });

  describe('findById', () => {
    test('should find a task by id', () => {
      const created = taskService.create({ title: 'Find Me' });
      const found = taskService.findById(created.id);
      expect(found).toBeDefined();
      expect(found.id).toBe(created.id);
      expect(found.title).toBe('Find Me');
    });

    test('should return undefined if task not found', () => {
      const found = taskService.findById('nonexistent-id');
      expect(found).toBeUndefined();
    });
  });

  describe('getByStatus', () => {
    beforeEach(() => {
      taskService.create({ title: 'Todo 1', status: 'todo' });
      taskService.create({ title: 'In Progress 1', status: 'in_progress' });
      taskService.create({ title: 'Done 1', status: 'done' });
      taskService.create({ title: 'Todo 2', status: 'todo' });
    });

    test('should filter tasks by exact status - todo', () => {
      const tasks = taskService.getByStatus('todo');
      expect(tasks.length).toBe(2);
      expect(tasks.every((t) => t.status === 'todo')).toBe(true);
    });

    test('should filter tasks by exact status - in_progress', () => {
      const tasks = taskService.getByStatus('in_progress');
      expect(tasks.length).toBe(1);
      expect(tasks[0].status).toBe('in_progress');
    });

    test('should filter tasks by exact status - done', () => {
      const tasks = taskService.getByStatus('done');
      expect(tasks.length).toBe(1);
      expect(tasks[0].status).toBe('done');
    });

    test('should return empty array if no tasks match status', () => {
      const tasks = taskService.getByStatus('nonexistent');
      expect(tasks).toEqual([]);
    });
  });

  describe('getPaginated', () => {
    beforeEach(() => {
      for (let i = 1; i <= 25; i++) {
        taskService.create({ title: `Task ${i}` });
      }
    });

    test('page 1 with limit 10 should return first 10 tasks', () => {
      const result = taskService.getPaginated(1, 10);
      expect(result.length).toBe(10);
      expect(result[0].title).toBe('Task 1');
      expect(result[9].title).toBe('Task 10');
    });

    test('page 2 with limit 10 should return second 10 tasks', () => {
      const result = taskService.getPaginated(2, 10);
      expect(result.length).toBe(10);
      expect(result[0].title).toBe('Task 11');
      expect(result[9].title).toBe('Task 20');
    });

    test('page 3 with limit 10 should return remaining 5 tasks', () => {
      const result = taskService.getPaginated(3, 10);
      expect(result.length).toBe(5);
      expect(result[0].title).toBe('Task 21');
      expect(result[4].title).toBe('Task 25');
    });

    test('should return empty array for page beyond available data', () => {
      const result = taskService.getPaginated(5, 10);
      expect(result).toEqual([]);
    });

    test('should handle different limit sizes', () => {
      const result = taskService.getPaginated(1, 5);
      expect(result.length).toBe(5);
      expect(result[0].title).toBe('Task 1');
      expect(result[4].title).toBe('Task 5');
    });
  });

  describe('update', () => {
    let taskId;
    beforeEach(() => {
      const task = taskService.create({
        title: 'Original Title',
        description: 'Original Desc',
        status: 'todo',
        priority: 'low',
      });
      taskId = task.id;
    });

    test('should update task fields', () => {
      const updated = taskService.update(taskId, { title: 'New Title' });
      expect(updated.title).toBe('New Title');
      expect(updated.description).toBe('Original Desc'); // Should remain unchanged
    });

    test('should update multiple fields', () => {
      const updated = taskService.update(taskId, {
        title: 'New Title',
        status: 'in_progress',
        priority: 'high',
      });
      expect(updated.title).toBe('New Title');
      expect(updated.status).toBe('in_progress');
      expect(updated.priority).toBe('high');
    });

    test('should return null if task not found', () => {
      const result = taskService.update('nonexistent', { title: 'New' });
      expect(result).toBeNull();
    });

    test('should persist updates in store', () => {
      taskService.update(taskId, { title: 'Persisted Title' });
      const found = taskService.findById(taskId);
      expect(found.title).toBe('Persisted Title');
    });
  });

  describe('remove', () => {
    let taskId;
    beforeEach(() => {
      const task = taskService.create({ title: 'Remove Me' });
      taskId = task.id;
    });

    test('should remove a task by id', () => {
      const result = taskService.remove(taskId);
      expect(result).toBe(true);
      const found = taskService.findById(taskId);
      expect(found).toBeUndefined();
    });

    test('should return false if task not found', () => {
      const result = taskService.remove('nonexistent');
      expect(result).toBe(false);
    });

    test('should reduce total task count', () => {
      taskService.create({ title: 'Keep Me' });
      expect(taskService.getAll().length).toBe(2);
      taskService.remove(taskId);
      expect(taskService.getAll().length).toBe(1);
    });
  });

  describe('completeTask', () => {
    let taskId;
    beforeEach(() => {
      const task = taskService.create({
        title: 'Complete Me',
        priority: 'high',
        status: 'todo',
      });
      taskId = task.id;
    });

    test('should mark task as done', () => {
      const updated = taskService.completeTask(taskId);
      expect(updated.status).toBe('done');
    });

    test('should set completedAt timestamp', () => {
      const updated = taskService.completeTask(taskId);
      expect(updated.completedAt).toBeDefined();
      expect(new Date(updated.completedAt)).toBeInstanceOf(Date);
    });

    test('should return null if task not found', () => {
      const result = taskService.completeTask('nonexistent');
      expect(result).toBeNull();
    });

    test('should persist completion in store', () => {
      taskService.completeTask(taskId);
      const found = taskService.findById(taskId);
      expect(found.status).toBe('done');
      expect(found.completedAt).toBeDefined();
    });
  });

  describe('getStats', () => {
    beforeEach(() => {
      taskService.create({ title: 'Todo 1', status: 'todo' });
      taskService.create({ title: 'Todo 2', status: 'todo' });
      taskService.create({ title: 'In Progress', status: 'in_progress' });
      taskService.create({ title: 'Done', status: 'done' });
    });

    test('should return correct status counts', () => {
      const stats = taskService.getStats();
      expect(stats.todo).toBe(2);
      expect(stats.in_progress).toBe(1);
      expect(stats.done).toBe(1);
    });

    test('should count overdue tasks', () => {
      const yesterday = new Date(Date.now() - 86400000).toISOString();
      taskService.create({
        title: 'Overdue Task',
        status: 'todo',
        dueDate: yesterday,
      });
      const stats = taskService.getStats();
      expect(stats.overdue).toBe(1);
    });

    test('should not count completed tasks as overdue', () => {
      const yesterday = new Date(Date.now() - 86400000).toISOString();
      const task = taskService.create({
        title: 'Overdue But Done',
        status: 'todo',
        dueDate: yesterday,
      });
      taskService.completeTask(task.id);
      const stats = taskService.getStats();
      expect(stats.overdue).toBe(0);
    });

    test('should return zero counts when no tasks exist', () => {
      taskService._reset();
      const stats = taskService.getStats();
      expect(stats.todo).toBe(0);
      expect(stats.in_progress).toBe(0);
      expect(stats.done).toBe(0);
      expect(stats.overdue).toBe(0);
    });
  });

  describe('assignTask', () => {
    let taskId;
    beforeEach(() => {
      const task = taskService.create({ title: 'Assign Me' });
      taskId = task.id;
    });

    test('should assign a task to a person', () => {
      const updated = taskService.assignTask(taskId, 'John Doe');
      expect(updated.assignee).toBe('John Doe');
      expect(updated.id).toBe(taskId);
    });

    test('should update assignee when reassigning', () => {
      taskService.assignTask(taskId, 'John Doe');
      const updated = taskService.assignTask(taskId, 'Jane Smith');
      expect(updated.assignee).toBe('Jane Smith');
    });

    test('should return null if task not found', () => {
      const result = taskService.assignTask('nonexistent', 'John Doe');
      expect(result).toBeNull();
    });

    test('should persist assignment in store', () => {
      taskService.assignTask(taskId, 'John Doe');
      const found = taskService.findById(taskId);
      expect(found.assignee).toBe('John Doe');
    });

    test('should preserve other task fields when assigning', () => {
      const updated = taskService.assignTask(taskId, 'John Doe');
      expect(updated.title).toBe('Assign Me');
      expect(updated.status).toBe('todo');
      expect(updated.id).toBe(taskId);
    });
  });
});
