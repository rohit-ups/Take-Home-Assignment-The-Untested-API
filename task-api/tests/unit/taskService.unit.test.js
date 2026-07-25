const Service = require('../../src/services/taskService');

beforeEach(() => {
    Service._reset();
});

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

describe('find by Id', () => {
    test('return task on existed', () => {
        const task = Service.create({ title: 'find existed' });
        const found = Service.findById(task.id);
        expect(found).toBe(task);
    });
});

describe('getAll', () => {
    test('return all tasks', () => {
        Service.create({ title: 'A' });
        Service.create({ title: 'B' });
        Service.create({ title: 'C' });
        Service.create({ title: 'D' });
        Service.create({ title: 'E' });
        Service.create({ title: 'F' });
        expect(Service.getAll()).toHaveLength(6);
    });

    test('return empty array when there are no tasks', () => {
        expect(Service.getAll()).toEqual([]);
    });
});

describe('Edge Cases', () => {
    //create: duplicate id check
    test('generate unique id for each task', () => {
        const a = Service.create({ title: 'A' });
        const b = Service.create({ title: 'B' });
        expect(a.id).not.toBe(b.id);
    });

    //find by Id: invalid id or unknown id
    test('return undefined when the id does not exist', () => {
        expect(Service.findById('invalid-id')).toBeUndefined();
    });

    //getAll: return copy if the tasks not the reference so that it not change in the internal array
    test('return copy, not reference to the internal array', () => {
        Service._reset();
        Service.create({ title: 'A' });
        const list = Service.getAll();
        list.push({ id: 'fake' });
        expect(Service.getAll()).toHaveLength(1);
    });
});