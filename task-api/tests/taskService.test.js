const taskService = require('../src/services/taskService');

describe('TaskService Unit Tests', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('create', () => {
    test('creates a task with defaults', () => {
      const task = taskService.create({ title: 'Default task' });

      expect(task).toBeDefined();
      expect(task.id).toBeDefined();
      expect(typeof task.id).toBe('string');
      expect(task.title).toBe('Default task');
      expect(task.description).toBe('');
      expect(task.status).toBe('todo');
      expect(task.priority).toBe('medium');
      expect(task.dueDate).toBeNull();
      expect(task.assignee).toBeNull();
      expect(task.completedAt).toBeNull();
      expect(task.createdAt).toBeDefined();
    });

    test('creates a task with custom fields', () => {
      const dueDate = '2026-11-01T00:00:00.000Z';
      const task = taskService.create({
        title: 'Custom task',
        description: 'Detailed description',
        status: 'in_progress',
        priority: 'high',
        dueDate,
      });

      expect(task.title).toBe('Custom task');
      expect(task.description).toBe('Detailed description');
      expect(task.status).toBe('in_progress');
      expect(task.priority).toBe('high');
      expect(task.dueDate).toBe(dueDate);
      expect(task.assignee).toBeNull();
    });
  });

  describe('getAll', () => {
    test('returns an empty array when no tasks exist', () => {
      expect(taskService.getAll()).toEqual([]);
    });

    test('returns all created tasks', () => {
      const task1 = taskService.create({ title: 'Task 1' });
      const task2 = taskService.create({ title: 'Task 2' });

      const all = taskService.getAll();
      expect(all).toHaveLength(2);
      expect(all).toEqual(expect.arrayContaining([task1, task2]));
    });

    test('returns a new array shallow copy', () => {
      taskService.create({ title: 'Task 1' });
      const list1 = taskService.getAll();
      const list2 = taskService.getAll();
      expect(list1).not.toBe(list2);
    });
  });

  describe('findById', () => {
    test('returns the task with the given ID', () => {
      const created = taskService.create({ title: 'Find Me' });
      const found = taskService.findById(created.id);
      expect(found).toEqual(created);
    });

    test('returns undefined when ID does not exist', () => {
      const found = taskService.findById('non-existent-id');
      expect(found).toBeUndefined();
    });
  });

  describe('getByStatus', () => {
    test('filters tasks matching the exact status', () => {
      taskService.create({ title: 'Todo 1', status: 'todo' });
      taskService.create({ title: 'Todo 2', status: 'todo' });
      taskService.create({ title: 'In Progress 1', status: 'in_progress' });
      taskService.create({ title: 'Done 1', status: 'done' });

      const todoTasks = taskService.getByStatus('todo');
      expect(todoTasks).toHaveLength(2);
      expect(todoTasks.every((t) => t.status === 'todo')).toBe(true);

      const inProgressTasks = taskService.getByStatus('in_progress');
      expect(inProgressTasks).toHaveLength(1);
      expect(inProgressTasks[0].title).toBe('In Progress 1');
    });

    test('does not return tasks on substring matches (exact match check)', () => {
      taskService.create({ title: 'Todo 1', status: 'todo' });
      taskService.create({ title: 'Done 1', status: 'done' });

      // 'do' should not match 'todo' or 'done'
      const substringResults = taskService.getByStatus('do');
      expect(substringResults).toHaveLength(0);
    });

    test('returns empty array when no tasks match status', () => {
      taskService.create({ title: 'Todo 1', status: 'todo' });
      expect(taskService.getByStatus('done')).toEqual([]);
    });
  });

  describe('getPaginated', () => {
    test('returns tasks for requested page and limit with 1-based indexing', () => {
      const t1 = taskService.create({ title: 'T1' });
      const t2 = taskService.create({ title: 'T2' });
      const t3 = taskService.create({ title: 'T3' });

      // Page 1 with limit 2 should return the first 2 tasks: [t1, t2]
      const page1 = taskService.getPaginated(1, 2);
      expect(page1).toHaveLength(2);
      expect(page1[0].id).toBe(t1.id);
      expect(page1[1].id).toBe(t2.id);

      // Page 2 with limit 2 should return the 3rd task: [t3]
      const page2 = taskService.getPaginated(2, 2);
      expect(page2).toHaveLength(1);
      expect(page2[0].id).toBe(t3.id);
    });

    test('returns empty array when page is beyond total tasks', () => {
      taskService.create({ title: 'T1' });
      const result = taskService.getPaginated(10, 5);
      expect(result).toEqual([]);
    });

    test('gracefully handles non-positive page numbers by defaulting to page 1', () => {
      const t1 = taskService.create({ title: 'T1' });
      const result = taskService.getPaginated(0, 10);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(t1.id);
    });
  });

  describe('getStats', () => {
    test('calculates counts by status correctly', () => {
      taskService.create({ title: 'T1', status: 'todo' });
      taskService.create({ title: 'T2', status: 'todo' });
      taskService.create({ title: 'T3', status: 'in_progress' });
      taskService.create({ title: 'T4', status: 'done' });

      const stats = taskService.getStats();
      expect(stats.todo).toBe(2);
      expect(stats.in_progress).toBe(1);
      expect(stats.done).toBe(1);
      expect(stats.overdue).toBe(0);
    });

    test('counts overdue tasks correctly for past due dates on incomplete tasks', () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      // Overdue: status != 'done' and dueDate < now
      taskService.create({ title: 'Overdue Todo', status: 'todo', dueDate: yesterday });
      taskService.create({ title: 'Overdue InProgress', status: 'in_progress', dueDate: yesterday });

      // Not overdue: future dueDate
      taskService.create({ title: 'Future Task', status: 'todo', dueDate: tomorrow });

      // Not overdue: completed even though dueDate is in past
      taskService.create({ title: 'Completed Past Due', status: 'done', dueDate: yesterday });

      // Not overdue: no dueDate
      taskService.create({ title: 'No Due Date', status: 'todo', dueDate: null });

      const stats = taskService.getStats();
      expect(stats.overdue).toBe(2);
    });
  });

  describe('update', () => {
    test('updates specified fields on an existing task', () => {
      const task = taskService.create({ title: 'Original' });
      const updated = taskService.update(task.id, {
        title: 'Updated Title',
        description: 'New Description',
        priority: 'high',
      });

      expect(updated).toBeDefined();
      expect(updated.title).toBe('Updated Title');
      expect(updated.description).toBe('New Description');
      expect(updated.priority).toBe('high');
      expect(updated.id).toBe(task.id);
    });

    test('does not allow overwriting immutable id and createdAt', () => {
      const task = taskService.create({ title: 'Original' });
      const originalCreatedAt = task.createdAt;

      const updated = taskService.update(task.id, {
        id: 'hacked-id',
        createdAt: '1970-01-01T00:00:00.000Z',
        title: 'New Title',
      });

      expect(updated.id).toBe(task.id);
      expect(updated.createdAt).toBe(originalCreatedAt);
      expect(updated.title).toBe('New Title');
    });

    test('returns null when updating a non-existent task', () => {
      const result = taskService.update('non-existent-id', { title: 'New Title' });
      expect(result).toBeNull();
    });
  });

  describe('remove', () => {
    test('removes an existing task and returns true', () => {
      const task = taskService.create({ title: 'To Delete' });
      const result = taskService.remove(task.id);

      expect(result).toBe(true);
      expect(taskService.findById(task.id)).toBeUndefined();
      expect(taskService.getAll()).toHaveLength(0);
    });

    test('returns false when task does not exist', () => {
      const result = taskService.remove('non-existent-id');
      expect(result).toBe(false);
    });
  });

  describe('completeTask', () => {
    test('marks task status as done and sets completedAt timestamp', () => {
      const task = taskService.create({ title: 'Complete Me' });
      const completed = taskService.completeTask(task.id);

      expect(completed).toBeDefined();
      expect(completed.status).toBe('done');
      expect(completed.completedAt).toBeDefined();
      expect(new Date(completed.completedAt).getTime()).not.toBeNaN();
    });

    test('preserves the task original priority when completing', () => {
      const highTask = taskService.create({ title: 'High Priority', priority: 'high' });
      const completed = taskService.completeTask(highTask.id);

      expect(completed.priority).toBe('high');
    });

    test('preserves low priority when completing', () => {
      const lowTask = taskService.create({ title: 'Low Priority', priority: 'low' });
      const completed = taskService.completeTask(lowTask.id);

      expect(completed.priority).toBe('low');
    });

    test('returns null when completing non-existent task', () => {
      const result = taskService.completeTask('non-existent-id');
      expect(result).toBeNull();
    });
  });

  describe('assignTask', () => {
    test('assigns an assignee name to the task', () => {
      const task = taskService.create({ title: 'Task to Assign' });
      const updated = taskService.assignTask(task.id, 'Alice Bob');

      expect(updated).toBeDefined();
      expect(updated.assignee).toBe('Alice Bob');
      expect(taskService.findById(task.id).assignee).toBe('Alice Bob');
    });

    test('trims whitespace from the assignee name', () => {
      const task = taskService.create({ title: 'Task to Assign' });
      const updated = taskService.assignTask(task.id, '  Charlie Brown  ');

      expect(updated.assignee).toBe('Charlie Brown');
    });

    test('reassigns a task that is already assigned', () => {
      const task = taskService.create({ title: 'Task to Reassign' });
      taskService.assignTask(task.id, 'User 1');
      const updated = taskService.assignTask(task.id, 'User 2');

      expect(updated.assignee).toBe('User 2');
    });

    test('returns null when task does not exist', () => {
      const result = taskService.assignTask('non-existent-id', 'Alice');
      expect(result).toBeNull();
    });
  });

  describe('_reset', () => {
    test('clears all tasks in the store', () => {
      taskService.create({ title: 'T1' });
      taskService.create({ title: 'T2' });
      expect(taskService.getAll()).toHaveLength(2);

      taskService._reset();
      expect(taskService.getAll()).toHaveLength(0);
    });
  });
});
