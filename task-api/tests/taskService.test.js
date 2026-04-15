const taskService = require('../src/services/taskService');

describe('taskService', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('create and query', () => {
    test('creates task with defaults', () => {
      const task = taskService.create({ title: 'Write tests' });

      expect(task.id).toBeDefined();
      expect(task.title).toBe('Write tests');
      expect(task.description).toBe('');
      expect(task.status).toBe('todo');
      expect(task.priority).toBe('medium');
      expect(task.completedAt).toBeNull();
      expect(task.createdAt).toBeDefined();
    });

    test('findById returns task for existing id', () => {
      const task = taskService.create({ title: 'Find me' });
      const found = taskService.findById(task.id);

      expect(found).toEqual(task);
    });

    test('getByStatus returns only matching tasks', () => {
      taskService.create({ title: 'A', status: 'todo' });
      taskService.create({ title: 'B', status: 'in_progress' });
      taskService.create({ title: 'C', status: 'done' });

      const result = taskService.getByStatus('todo');

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('A');
    });

    test('getPaginated starts page 1 from first record', () => {
      for (let i = 1; i <= 5; i += 1) {
        taskService.create({ title: `Task ${i}` });
      }

      const pageOne = taskService.getPaginated(1, 2);
      const pageTwo = taskService.getPaginated(2, 2);

      expect(pageOne.map((t) => t.title)).toEqual(['Task 1', 'Task 2']);
      expect(pageTwo.map((t) => t.title)).toEqual(['Task 3', 'Task 4']);
    });
  });

  describe('update and remove', () => {
    test('updates existing task and returns updated object', () => {
      const task = taskService.create({ title: 'Old title', priority: 'low' });
      const updated = taskService.update(task.id, { title: 'New title', priority: 'high' });

      expect(updated.title).toBe('New title');
      expect(updated.priority).toBe('high');
    });

    test('update returns null for missing task', () => {
      const updated = taskService.update('missing-id', { title: 'Nope' });
      expect(updated).toBeNull();
    });

    test('remove deletes existing task', () => {
      const task = taskService.create({ title: 'Delete me' });
      const removed = taskService.remove(task.id);

      expect(removed).toBe(true);
      expect(taskService.findById(task.id)).toBeUndefined();
    });

    test('remove returns false for missing task', () => {
      expect(taskService.remove('missing-id')).toBe(false);
    });
  });

  describe('complete and assign', () => {
    test('completeTask marks done and keeps current priority', () => {
      const task = taskService.create({ title: 'Complete me', priority: 'high' });
      const completed = taskService.completeTask(task.id);

      expect(completed.status).toBe('done');
      expect(completed.priority).toBe('high');
      expect(completed.completedAt).toBeDefined();
    });

    test('completeTask returns null for missing task', () => {
      expect(taskService.completeTask('missing-id')).toBeNull();
    });

    test('assignTask sets assignee on existing task', () => {
      const task = taskService.create({ title: 'Assign me' });
      const updated = taskService.assignTask(task.id, 'Tanya');

      expect(updated.assignee).toBe('Tanya');
      expect(taskService.findById(task.id).assignee).toBe('Tanya');
    });

    test('assignTask returns null when task does not exist', () => {
      expect(taskService.assignTask('missing-id', 'Tanya')).toBeNull();
    });
  });

  describe('stats', () => {
    test('getStats counts statuses and overdue tasks correctly', () => {
      const past = '2020-01-01T00:00:00.000Z';
      const future = '2999-01-01T00:00:00.000Z';

      taskService.create({ title: 'T1', status: 'todo', dueDate: past });
      taskService.create({ title: 'T2', status: 'in_progress', dueDate: future });
      taskService.create({ title: 'T3', status: 'done', dueDate: past });

      const stats = taskService.getStats();

      expect(stats).toEqual({
        todo: 1,
        in_progress: 1,
        done: 1,
        overdue: 1,
      });
    });
  });
});
