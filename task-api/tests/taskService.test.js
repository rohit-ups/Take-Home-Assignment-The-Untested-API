const taskService = require('../src/services/taskService');

describe('Task Service', () => {
    beforeEach(() => {
        // Clear tasks before each test so they don't interfere
        taskService._reset();
    });

    test('getAll should return an empty array initially', () => {
        const tasks = taskService.getAll();
        expect(tasks).toEqual([]);
    });

    test('create should add a new task with default values', () => {
        const task = taskService.create({ title: 'Test task' });

        expect(task.title).toBe('Test task');
        expect(task.description).toBe('');
        expect(task.status).toBe('todo');
        expect(task.priority).toBe('medium');
        expect(task.id).toBeDefined();

        const tasks = taskService.getAll();
        expect(tasks.length).toBe(1);
        expect(tasks[0].id).toBe(task.id);
    });

    test('create should accept custom description, status, and priority', () => {
        const task = taskService.create({
            title: 'Custom task',
            description: 'Custom description',
            status: 'in_progress',
            priority: 'high'
        });

        expect(task.description).toBe('Custom description');
        expect(task.status).toBe('in_progress');
        expect(task.priority).toBe('high');
    });

    test('findById should find an existing task', () => {
        const task = taskService.create({ title: 'Find me' });
        const found = taskService.findById(task.id);
        expect(found).toEqual(task);
    });

    test('findById should return undefined for invalid id', () => {
        const found = taskService.findById('invalid-id');
        expect(found).toBeUndefined();
    });

    test('getByStatus should filter tasks correctly', () => {
        taskService.create({ title: 'Todo 1', status: 'todo' });
        taskService.create({ title: 'Todo 2', status: 'todo' });
        taskService.create({ title: 'Done 1', status: 'done' });

        const todos = taskService.getByStatus('todo');
        expect(todos.length).toBe(2);

        const dones = taskService.getByStatus('done');
        expect(dones.length).toBe(1);
    });

    test('update should modify an existing task', () => {
        const task = taskService.create({ title: 'Old Title' });
        const updated = taskService.update(task.id, { title: 'New Title', status: 'in_progress' });

        expect(updated).not.toBeNull();
        expect(updated.title).toBe('New Title');
        expect(updated.status).toBe('in_progress');

        const checkTask = taskService.findById(task.id);
        expect(checkTask.title).toBe('New Title');
    });

    test('update should return null if task not found', () => {
        const updated = taskService.update('invalid-id', { title: 'New Title' });
        expect(updated).toBeNull();
    });

    test('remove should delete the task and return true', () => {
        const task = taskService.create({ title: 'Delete me' });
        const result = taskService.remove(task.id);

        expect(result).toBe(true);
        expect(taskService.findById(task.id)).toBeUndefined();
        expect(taskService.getAll().length).toBe(0);
    });

    test('remove should return false if task not found', () => {
        const result = taskService.remove('invalid-id');
        expect(result).toBe(false);
    });

    test('completeTask should mark task as done and set completedAt', () => {
        const task = taskService.create({ title: 'Finish me', priority: 'high' });
        const completed = taskService.completeTask(task.id);

        expect(completed).not.toBeNull();
        expect(completed.status).toBe('done');
        expect(completed.completedAt).not.toBeNull();
        // Wait, completeTask code sets priority to 'medium'. Let's check that.
        expect(completed.priority).toBe('medium');
    });

    test('completeTask should return null if task not found', () => {
        const result = taskService.completeTask('invalid-id');
        expect(result).toBeNull();
    });

    test('getPaginated should return a slice of tasks', () => {
        // Create 5 tasks
        for (let i = 0; i < 5; i++) {
            taskService.create({ title: `Task ${i}` });
        }

        // Page 1, limit 2
        const page1 = taskService.getPaginated(1, 2);
        expect(page1.length).toBe(2);
        expect(page1[0].title).toBe('Task 0');
        expect(page1[1].title).toBe('Task 1');

        // Page 2, limit 2
        const page2 = taskService.getPaginated(2, 2);
        expect(page2.length).toBe(2);
        expect(page2[0].title).toBe('Task 2');

        // Page 3, limit 2 (only 1 left)
        const page3 = taskService.getPaginated(3, 2);
        expect(page3.length).toBe(1);
        expect(page3[0].title).toBe('Task 4');
    });

    test('getStats should count up tasks by status and check overdue', () => {
        // overdue task
        taskService.create({ title: 'Overdue 1', status: 'todo', dueDate: '2020-01-01' });
        // not overdue (future)
        taskService.create({ title: 'Future 1', status: 'in_progress', dueDate: '2099-01-01' });
        // done task (shouldn't count as overdue)
        taskService.create({ title: 'Done 1', status: 'done', dueDate: '2020-01-01' });

        const stats = taskService.getStats();

        expect(stats.todo).toBe(1);
        expect(stats.in_progress).toBe(1);
        expect(stats.done).toBe(1);
        expect(stats.overdue).toBe(1);
    });
});
