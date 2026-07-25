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

describe('getByStatus', () => {
  test('return only tasks matching the given status', () => {
        Service.create({ title: 'A', status: 'todo' });
        Service.create({ title: 'B', status: 'in_progress' });
        Service.create({ title: 'C', status: 'done' });
        const result = Service.getByStatus('done');
        expect(result).toHaveLength(1);
        expect(result[0].title).toBe('C');
  });
});

describe('getPaginated', () => {
    test('returns the correct page size', () => {
        Service._reset();
        for (let i = 1; i <= 25; i++) {
            Service.create({ title: `Task ${i}` });
        }
        const page = Service.getPaginated(1, 10);
        expect(page).toHaveLength(10);
    });

    test('return empty array for a page past the end of the data', () => {
        Service._reset();
        for (let i = 1; i <= 25; i++) {
            Service.create({ title: `Task ${i}` });
        }
        const page = Service.getPaginated(10, 10);
        expect(page).toEqual([]);
    });
});

describe('getStats', () => {
    test('count tasks by status', () => {
        Service.create({ title: 'A', status: 'todo' });
        Service.create({ title: 'B', status: 'todo' });
        Service.create({ title: 'C', status: 'in_progress' });
        Service.create({ title: 'D', status: 'done' });
        
        const stats = Service.getStats();
        expect(stats.todo).toBe(2);
        expect(stats.in_progress).toBe(1);
        expect(stats.done).toBe(1);
    });

    test('count overdue tasks (past due date, not done)', () => {
        Service.create({
          title: 'Overdue Task',
          status: 'todo',
          dueDate: '2020-01-01T00:00:00.000Z',
        });
        const stats = Service.getStats();
        expect(stats.overdue).toBe(1);
    });
});

describe('update', () => {
    test('updates only the provided fields, leaving others intact', () => {
        const created = Service.create({ title: 'Original', priority: 'low' });
        const updated = Service.update(created.id, { title: 'Updated' });
        expect(updated.title).toBe('Updated');
        expect(updated.priority).toBe('low');
    });
});

describe('remove', () => {
    test('delete existing task and return true', () => {
        const created = Service.create({ title: 'To delete' });
        const result = Service.remove(created.id);
        expect(result).toBe(true);
        expect(Service.findById(created.id)).toBeUndefined();
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

    //getByStatus: status doesn't exist in tasks
    test('returns an empty array when no tasks match', () => {
        Service._reset();
        Service.create({ title: 'A', status: 'todo' });
        expect(Service.getByStatus('done')).toEqual([]);
    });

    //getPaginated: limit larger than total tasks
    test('returns all items when limit exceeds total data length', () => {
        Service._reset();
        for (let i = 1; i <= 25; i++) {
            Service.create({ title: `Task ${i}` });
        }
        const page = Service.getPaginated(1, 100);
        expect(page.length).toBeLessThanOrEqual(25);
    });

    //getStats: overdue but already done should NOT count as overdue
    test('don\'t count a done task with a past due date as overdue', () => {
        Service.create({
          title: 'Done but late',
          status: 'done',
          dueDate: '2020-01-01T00:00:00.000Z',
        });
        const stats = Service.getStats();
        expect(stats.overdue).toBe(0);
    });

    //update: invalid id or unknown id
    test('return null when the id does not exist', () => {
        expect(Service.update('nope', { title: 'X' })).toBeNull();
    });

    //remove: invalid id or unknown id
    test('return false when the id does not exist', () => {
        expect(Service.remove('nope')).toBe(false);
    });
});

describe('Bugs', () => {
    //BUG 1: page 1 should return the FIRST `limit` items
    //required (offset = (page - 1) * limit), but the implementation does offset = page * limit, which skips the first `limit` items entirely.
    //Actual (bug): offset = 1 * 10 = 10, so page[0].title is 'Task 11'
    //After (bug fix): offset = (1 - 1) * 10 = 0, so page[0].title is 'Task 1'
    test('page 1 returns the first 10 items', () => {
        Service._reset();
        for (let i = 1; i <= 25; i++) {
            Service.create({ title: `Task ${i}` });
        }
        const page = Service.getPaginated(1, 10);
        expect(page[0].title).toBe('Task 1');
    });
});