const taskService = require('../../src/services/taskService');

describe('taskService Unit Tests', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('create()', () => {
    it('should create a task with default values', () => {
      const task = taskService.create({ title: 'Test Task' });

      expect(task).toBeDefined();
      expect(task.id).toBeDefined();
      expect(task.title).toBe('Test Task');
      expect(task.description).toBe('');
      expect(task.status).toBe('todo');
      expect(task.priority).toBe('medium');
      expect(task.dueDate).toBeNull();
      expect(task.completedAt).toBeNull();
      expect(typeof task.createdAt).toBe('string');
      expect(new Date(task.createdAt).toString()).not.toBe('Invalid Date');
    });

    it('should create a task with custom fields', () => {
      const customData = {
        title: 'Custom Task',
        description: 'Detailed description',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2026-12-31T23:59:59.000Z',
      };

      const task = taskService.create(customData);

      expect(task.title).toBe(customData.title);
      expect(task.description).toBe(customData.description);
      expect(task.status).toBe('in_progress');
      expect(task.priority).toBe('high');
      expect(task.dueDate).toBe(customData.dueDate);
      expect(task.completedAt).toBeNull();
    });

    it('should generate unique IDs for each task', () => {
      const task1 = taskService.create({ title: 'Task 1' });
      const task2 = taskService.create({ title: 'Task 2' });

      expect(task1.id).not.toBe(task2.id);
    });
  });

  describe('getAll()', () => {
    it('should return an empty array when no tasks exist', () => {
      const tasks = taskService.getAll();
      expect(tasks).toEqual([]);
    });

    it('should return all created tasks', () => {
      const task1 = taskService.create({ title: 'Task 1' });
      const task2 = taskService.create({ title: 'Task 2' });

      const allTasks = taskService.getAll();
      expect(allTasks).toHaveLength(2);
      expect(allTasks).toEqual(expect.arrayContaining([task1, task2]));
    });

    it('should return a new array instance', () => {
      taskService.create({ title: 'Task 1' });
      const list1 = taskService.getAll();
      const list2 = taskService.getAll();

      expect(list1).not.toBe(list2);
      expect(list1).toEqual(list2);
    });
  });

  describe('findById()', () => {
    it('should return the task when ID exists', () => {
      const created = taskService.create({ title: 'Find Me' });
      const found = taskService.findById(created.id);

      expect(found).toBeDefined();
      expect(found.id).toBe(created.id);
      expect(found.title).toBe('Find Me');
    });

    it('should return undefined when ID does not exist', () => {
      const found = taskService.findById('non-existent-id');
      expect(found).toBeUndefined();
    });
  });

  describe('getByStatus()', () => {
    it('should filter tasks matching status exactly', () => {
      taskService.create({ title: 'Todo 1', status: 'todo' });
      taskService.create({ title: 'Todo 2', status: 'todo' });
      taskService.create({ title: 'In Progress 1', status: 'in_progress' });
      taskService.create({ title: 'Done 1', status: 'done' });

      const todos = taskService.getByStatus('todo');
      expect(todos).toHaveLength(2);
      todos.forEach((t) => expect(t.status).toBe('todo'));

      const inProgress = taskService.getByStatus('in_progress');
      expect(inProgress).toHaveLength(1);
      expect(inProgress[0].status).toBe('in_progress');
    });

    it('should return an empty array if no tasks match status', () => {
      taskService.create({ title: 'Todo 1', status: 'todo' });
      const doneTasks = taskService.getByStatus('done');
      expect(doneTasks).toEqual([]);
    });

    it('should not match partial/substring statuses', () => {
      taskService.create({ title: 'In Progress', status: 'in_progress' });
      // "progress" should not match "in_progress"
      const matched = taskService.getByStatus('progress');
      expect(matched).toHaveLength(0);
    });
  });

  describe('getPaginated()', () => {
    it('should return first page with correct offset for page 1', () => {
      for (let i = 1; i <= 5; i++) {
        taskService.create({ title: `Task ${i}` });
      }

      const page1 = taskService.getPaginated(1, 2);
      expect(page1).toHaveLength(2);
      expect(page1[0].title).toBe('Task 1');
      expect(page1[1].title).toBe('Task 2');
    });

    it('should return second page with correct items', () => {
      for (let i = 1; i <= 5; i++) {
        taskService.create({ title: `Task ${i}` });
      }

      const page2 = taskService.getPaginated(2, 2);
      expect(page2).toHaveLength(2);
      expect(page2[0].title).toBe('Task 3');
      expect(page2[1].title).toBe('Task 4');
    });

    it('should return remaining items on last partial page', () => {
      for (let i = 1; i <= 5; i++) {
        taskService.create({ title: `Task ${i}` });
      }

      const page3 = taskService.getPaginated(3, 2);
      expect(page3).toHaveLength(1);
      expect(page3[0].title).toBe('Task 5');
    });

    it('should return empty array for out-of-bounds page', () => {
      taskService.create({ title: 'Task 1' });
      const emptyPage = taskService.getPaginated(10, 5);
      expect(emptyPage).toEqual([]);
    });
  });

  describe('getStats()', () => {
    it('should return zeros for empty tasks store', () => {
      const stats = taskService.getStats();
      expect(stats).toEqual({
        todo: 0,
        in_progress: 0,
        done: 0,
        overdue: 0,
      });
    });

    it('should count task statuses and overdue items correctly', () => {
      const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString();
      const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();

      // Overdue todo
      taskService.create({ title: 'Overdue Todo', status: 'todo', dueDate: pastDate });
      // Overdue in_progress
      taskService.create({ title: 'Overdue WIP', status: 'in_progress', dueDate: pastDate });
      // Future todo (not overdue)
      taskService.create({ title: 'Future Todo', status: 'todo', dueDate: futureDate });
      // Past done (done tasks should NOT be overdue)
      taskService.create({ title: 'Done Task', status: 'done', dueDate: pastDate });
      // Todo with no due date
      taskService.create({ title: 'No Due Date', status: 'todo', dueDate: null });

      const stats = taskService.getStats();
      expect(stats.todo).toBe(3);
      expect(stats.in_progress).toBe(1);
      expect(stats.done).toBe(1);
      expect(stats.overdue).toBe(2);
    });
  });

  describe('update()', () => {
    it('should update task fields and return updated task', () => {
      const created = taskService.create({ title: 'Old Title', priority: 'low' });
      const updated = taskService.update(created.id, {
        title: 'New Title',
        priority: 'high',
        description: 'New Description',
      });

      expect(updated).toBeDefined();
      expect(updated.id).toBe(created.id);
      expect(updated.title).toBe('New Title');
      expect(updated.priority).toBe('high');
      expect(updated.description).toBe('New Description');
      expect(updated.createdAt).toBe(created.createdAt);
    });

    it('should return null when updating non-existent task', () => {
      const updated = taskService.update('non-existent-id', { title: 'New' });
      expect(updated).toBeNull();
    });

    it('should preserve untouched fields on update', () => {
      const created = taskService.create({
        title: 'Initial Title',
        description: 'Keep me',
        priority: 'high',
        dueDate: '2026-10-10T00:00:00.000Z',
      });

      const updated = taskService.update(created.id, { title: 'Modified Title' });

      expect(updated.title).toBe('Modified Title');
      expect(updated.description).toBe('Keep me');
      expect(updated.priority).toBe('high');
      expect(updated.dueDate).toBe('2026-10-10T00:00:00.000Z');
    });
  });

  describe('remove()', () => {
    it('should remove existing task and return true', () => {
      const task1 = taskService.create({ title: 'Task 1' });
      const task2 = taskService.create({ title: 'Task 2' });

      const result = taskService.remove(task1.id);
      expect(result).toBe(true);

      const all = taskService.getAll();
      expect(all).toHaveLength(1);
      expect(all[0].id).toBe(task2.id);
      expect(taskService.findById(task1.id)).toBeUndefined();
    });

    it('should return false when removing non-existent task', () => {
      const result = taskService.remove('non-existent-id');
      expect(result).toBe(false);
    });
  });

  describe('completeTask()', () => {
    it('should mark task as done and set completedAt without mutating priority', () => {
      const created = taskService.create({
        title: 'Complete Me',
        priority: 'high',
        status: 'todo',
      });

      const completed = taskService.completeTask(created.id);

      expect(completed).toBeDefined();
      expect(completed.id).toBe(created.id);
      expect(completed.status).toBe('done');
      expect(completed.priority).toBe('high'); // Priority should be preserved!
      expect(completed.completedAt).toBeDefined();
      expect(new Date(completed.completedAt).toString()).not.toBe('Invalid Date');
    });

    it('should return null for non-existent task', () => {
      const completed = taskService.completeTask('non-existent-id');
      expect(completed).toBeNull();
    });
  });

  describe('assignTask()', () => {
    it('should assign task to specified person', () => {
      const created = taskService.create({ title: 'Task to Assign' });
      const assigned = taskService.assignTask(created.id, '  Charlie  ');

      expect(assigned).toBeDefined();
      expect(assigned.id).toBe(created.id);
      expect(assigned.assignee).toBe('Charlie');
    });

    it('should return null when assigning non-existent task', () => {
      const assigned = taskService.assignTask('non-existent-id', 'Charlie');
      expect(assigned).toBeNull();
    });
  });

  describe('default parameters', () => {
    it('should handle getPaginated without arguments', () => {
      taskService.create({ title: 'T1' });
      const res = taskService.getPaginated();
      expect(res).toHaveLength(1);
    });
  });
});
