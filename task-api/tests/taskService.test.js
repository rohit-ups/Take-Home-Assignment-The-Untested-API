const taskService = require('../src/services/taskService');

describe('Task Service Unit Tests', () => {

    beforeEach(() => {
        taskService._reset();
    });

    //  Create 
    describe('create()', () => {

        test('should create a task with default values', () => {
            const task = taskService.create({ title: 'Test Task' });

            expect(task).toHaveProperty('id');
            expect(task.title).toBe('Test Task');
            expect(task.status).toBe('todo');
            expect(task.priority).toBe('medium');
            expect(task.completedAt).toBeNull();
            expect(task.createdAt).toBeDefined();
        });

        test('should create task with custom fields', () => {
            const task = taskService.create({
                title: 'Custom',
                description: 'Desc',
                priority: 'high',
                dueDate: '2026-01-01'
            });

            expect(task.description).toBe('Desc');
            expect(task.priority).toBe('high');
            expect(task.dueDate).toBe('2026-01-01');
        });

    });

    //  Get all 
    describe('getAll()', () => {

        test('should return empty array initially', () => {
            expect(taskService.getAll()).toEqual([]);
        });

        test('should return all tasks', () => {
            taskService.create({ title: 'Task 1' });
            taskService.create({ title: 'Task 2' });

            const tasks = taskService.getAll();

            expect(tasks.length).toBe(2);
        });

    });

    //  Find by ID
    describe('findById()', () => {

        test('should return task if found', () => {
            const task = taskService.create({ title: 'Find me' });

            const found = taskService.findById(task.id);

            expect(found).not.toBeUndefined();
            expect(found.id).toBe(task.id);
        });

        test('should return undefined if not found', () => {
            const result = taskService.findById('invalid-id');

            expect(result).toBeUndefined();
        });

    });

    //  Get By Status
    describe('getByStatus()', () => {

        test('should filter tasks by exact status', () => {
            taskService.create({ title: 'Task 1', status: 'todo' });
            taskService.create({ title: 'Task 2', status: 'done' });

            const result = taskService.getByStatus('todo');

            expect(result.length).toBe(1);
            expect(result[0].status).toBe('todo');
        });

        test('should return empty array if no match', () => {
            const result = taskService.getByStatus('done');

            expect(result).toEqual([]);
        });

        // getByStatus edge cases
        test('should return multiple tasks with same status', () => {
            taskService.create({ title: 'T1', status: 'todo' });
            taskService.create({ title: 'T2', status: 'todo' });

            const result = taskService.getByStatus('todo');

            expect(result.length).toBe(2);
        });

        test('should return empty for invalid status', () => {
            const result = taskService.getByStatus('invalid');
            expect(result).toEqual([]);
        });

    });

    //  Pagination 
    describe('getPaginated()', () => {

        test('should return paginated results', () => {
            for (let i = 0; i < 5; i++) {
                taskService.create({ title: `Task ${i}` });
            }

            const result = taskService.getPaginated(1, 2);

            expect(result.length).toBe(2);
        });

        test('should handle negative page/limit', () => {
            for (let i = 0; i < 3; i++) {
                taskService.create({ title: `Task ${i}` });
            }

            const result = taskService.getPaginated(-1, -5);

            expect(result.length).toBeGreaterThan(0);
        });

    });

    //  Update 
    describe('update()', () => {

        test('should update allowed fields only', () => {
            const task = taskService.create({ title: 'Old' });

            const updated = taskService.update(task.id, {
                title: 'New',
                id: 'hack' // should be ignored
            });

            expect(updated.title).toBe('New');
            expect(updated.id).toBe(task.id);
        });

        test('should return null if task not found', () => {
            const result = taskService.update('invalid-id', { title: 'X' });

            expect(result).toBeNull();
        });

    });

    //  Delete 
    describe('remove()', () => {

        test('should delete a task', () => {
            const task = taskService.create({ title: 'Delete me' });

            const result = taskService.remove(task.id);

            expect(result).toBe(true);
            expect(taskService.getAll().length).toBe(0);
        });

        test('should return false if task not found', () => {
            const result = taskService.remove('invalid-id');

            expect(result).toBe(false);
        });

    });

    //  Complete 
    describe('completeTask()', () => {

        test('should mark task as done', () => {
            const task = taskService.create({ title: 'Complete me' });

            const updated = taskService.completeTask(task.id);

            expect(updated.status).toBe('done');
            expect(updated.completedAt).not.toBeNull();
        });

        test('should return null if task not found', () => {
            const result = taskService.completeTask('invalid-id');

            expect(result).toBeNull();
        });

        // completeTask edge case
        test('should not change priority when completing task', () => {
            const task = taskService.create({
                title: 'Test',
                priority: 'high'
            });

            const updated = taskService.completeTask(task.id);

            expect(updated.priority).toBe('high');
        });

    });

    //  Stats 
    describe('getStats()', () => {

        test('should return correct counts', () => {
            taskService.create({ title: 'T1', status: 'todo' });
            taskService.create({ title: 'T2', status: 'done' });

            const stats = taskService.getStats();

            expect(stats.todo).toBeGreaterThanOrEqual(1);
            expect(stats.done).toBeGreaterThanOrEqual(1);
        });

        test('should count overdue tasks', () => {
            taskService.create({
                title: 'Old',
                dueDate: '2020-01-01'
            });

            const stats = taskService.getStats();

            expect(stats.overdue).toBeGreaterThanOrEqual(1);
        });

    });

    describe('assignTask()', () => {

        test('should assign a task', () => {
            const task = taskService.create({ title: 'Test' });

            const updated = taskService.assignTask(task.id, 'Shubham');

            expect(updated.assignee).toBe('Shubham');
        });

        test('should return null if task not found', () => {
            const result = taskService.assignTask('invalid-id', 'User');

            expect(result).toBeNull();
        });

    });

});