const taskService = require('../src/services/taskService');

describe('taskService', () => {
    beforeEach(() => {
        taskService._reset();
    });

    describe('create()', () => {
        test('should create a task with default values', () => {
            const task = taskService.create({
                title: 'Write tests',
            });

            expect(task).toMatchObject({
                title: 'Write tests',
                description: '',
                status: 'todo',
                priority: 'medium',
                dueDate: null,
                completedAt: null,
            });

            expect(task.id).toBeDefined();
            expect(task.createdAt).toBeDefined();
        });

        test('should create a task with custom values', () => {
            const task = taskService.create({
                title: 'Build API',
                description: 'Task manager API',
                status: 'in_progress',
                priority: 'high',
                dueDate: '2026-10-01T00:00:00.000Z',
            });

            expect(task.title).toBe('Build API');
            expect(task.description).toBe('Task manager API');
            expect(task.status).toBe('in_progress');
            expect(task.priority).toBe('high');
            expect(task.dueDate).toBe('2026-10-01T00:00:00.000Z');
        });
    });

    describe('getAll()', () => {
        test('should return all tasks', () => {
            taskService.create({ title: 'Task 1' });
            taskService.create({ title: 'Task 2' });

            const tasks = taskService.getAll();

            expect(tasks).toHaveLength(2);
            expect(tasks[0].title).toBe('Task 1');
            expect(tasks[1].title).toBe('Task 2');
        });

        test('should return an empty array when there are no tasks', () => {
            expect(taskService.getAll()).toEqual([]);
        });
    });

    describe('findById()', () => {
        test('should find a task by id', () => {
            const created = taskService.create({ title: 'Find me' });

            const task = taskService.findById(created.id);

            expect(task).toEqual(created);
        });

        test('should return undefined for an unknown id', () => {
            expect(taskService.findById('unknown-id')).toBeUndefined();
        });
    });

    describe('getByStatus()', () => {
        test('should return tasks with the requested status', () => {
            taskService.create({ title: 'Todo task', status: 'todo' });
            taskService.create({
                title: 'Progress task',
                status: 'in_progress',
            });
            taskService.create({
                title: 'Another todo',
                status: 'todo',
            });

            const tasks = taskService.getByStatus('todo');

            expect(tasks).toHaveLength(2);
            expect(tasks.every((task) => task.status === 'todo')).toBe(true);
        });
    });

    describe('getPaginated()', () => {
        test('should return the first page of tasks', () => {
            taskService.create({ title: 'Task 1' });
            taskService.create({ title: 'Task 2' });
            taskService.create({ title: 'Task 3' });

            const tasks = taskService.getPaginated(1, 2);

            expect(tasks).toHaveLength(2);
            expect(tasks[0].title).toBe('Task 1');
            expect(tasks[1].title).toBe('Task 2');
        });

        test('should return the second page of tasks', () => {
            taskService.create({ title: 'Task 1' });
            taskService.create({ title: 'Task 2' });
            taskService.create({ title: 'Task 3' });

            const tasks = taskService.getPaginated(2, 2);

            expect(tasks).toHaveLength(1);
            expect(tasks[0].title).toBe('Task 3');
        });
    });

    describe('update()', () => {
        test('should update an existing task', () => {
            const created = taskService.create({
                title: 'Old title',
                priority: 'low',
            });

            const updated = taskService.update(created.id, {
                title: 'New title',
                priority: 'high',
            });

            expect(updated.title).toBe('New title');
            expect(updated.priority).toBe('high');
            expect(updated.id).toBe(created.id);
        });

        test('should return null when task does not exist', () => {
            expect(
                taskService.update('unknown-id', { title: 'Test' })
            ).toBeNull();
        });
    });

    describe('remove()', () => {
        test('should delete an existing task', () => {
            const created = taskService.create({ title: 'Delete me' });

            expect(taskService.remove(created.id)).toBe(true);
            expect(taskService.findById(created.id)).toBeUndefined();
        });

        test('should return false when task does not exist', () => {
            expect(taskService.remove('unknown-id')).toBe(false);
        });
    });

    describe('completeTask()', () => {
        test('should mark a task as done', () => {
            const created = taskService.create({
                title: 'Complete me',
                priority: 'high',
            });

            const completed = taskService.completeTask(created.id);

            expect(completed.status).toBe('done');
            expect(completed.completedAt).toBeDefined();
        });

        test('should return null when task does not exist', () => {
            expect(taskService.completeTask('unknown-id')).toBeNull();
        });
    });

    describe('getStats()', () => {
        test('should count tasks by status', () => {
            taskService.create({
                title: 'Todo 1',
                status: 'todo',
            });
            taskService.create({
                title: 'Todo 2',
                status: 'todo',
            });
            taskService.create({
                title: 'Progress',
                status: 'in_progress',
            });
            taskService.create({
                title: 'Done',
                status: 'done',
            });

            const stats = taskService.getStats();

            expect(stats.todo).toBe(2);
            expect(stats.in_progress).toBe(1);
            expect(stats.done).toBe(1);
        });

        test('should return zero counts when there are no tasks', () => {
            expect(taskService.getStats()).toEqual({
                todo: 0,
                in_progress: 0,
                done: 0,
                overdue: 0,
            });
        });
    });

    describe('assignTask()', () => {
        test('should assign a task to a user', () => {
            const created = taskService.create({
                title: 'Assign me',
            });

            const assigned = taskService.assignTask(
                created.id,
                'Amar'
            );

            expect(assigned.assignee).toBe('Amar');
            expect(assigned.id).toBe(created.id);
        });

        test('should return null when task does not exist', () => {
            expect(
                taskService.assignTask('unknown-id', 'Amar')
            ).toBeNull();
        });

        test('should allow reassignment to another user', () => {
            const created = taskService.create({
                title: 'Reassign me',
            });

            taskService.assignTask(created.id, 'Amar');

            const reassigned = taskService.assignTask(
                created.id,
                'Rahul'
            );

            expect(reassigned.assignee).toBe('Rahul');
        });
    });
});