const Service = require('../../src/services/taskService');

describe('create', () => {
    test('create task with defaults', () => {
        const task = Service.create({ title: 'New Task Create' });

        expect(task.id).toBeDefined();
        expect(task.title).toBe('New Task Create');
        expect(task.description).toBe('');
        expect(task.status).toBe('todo');
        expect(task.priority).toBe('medium');
        expect(task.dueDate).toBeNull();
        expect(task.completedAt).toBeNull();
        expect(task.createdAt).toBeDefined();
    });

    test('create task with all fields provided', () => {
      const task = Service.create({
        title: 'Task Fields Provided',
        description: 'Do the thing',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2026-08-01T00:00:00.000Z',
      });

      expect(task.status).toBe('in_progress');
      expect(task.priority).toBe('high');
      expect(task.dueDate).toBe('2026-08-01T00:00:00.000Z');
    }); 
});

describe('Edge Cases', () => {
    //create: duplicate id check
    test('generate unique id for each task', () => {
      const a = Service.create({ title: 'A' });
      const b = Service.create({ title: 'B' });
      expect(a.id).not.toBe(b.id);
    });
});