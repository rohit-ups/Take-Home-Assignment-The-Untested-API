const taskService = require('../src/services/taskService');

describe('taskService', () => {
    beforeEach(() => {
        taskService._reset();
    });

    describe('getAll', () => {
        test('should return an empty array when there are no tasks', () => {
            expect(taskService.getAll()).toEqual([]);
        });

        test('should return all created tasks', () => {
            taskService.create({ title: 'Task 1' });
            taskService.create({ title: 'Task 2' });

            const tasks = taskService.getAll();

            expect(tasks).toHaveLength(2);
            expect(tasks[0].title).toBe('Task 1');
            expect(tasks[1].title).toBe('Task 2');
        });
    });

    describe('findById', () => {
        test('should return a task when the ID exists', () => {
            const createdTask = taskService.create({ title: 'Find me' });

            const task = taskService.findById(createdTask.id);

            expect(task).toEqual(createdTask);
        });

        test('should return undefined when the ID does not exist', () => {
            expect(taskService.findById('non-existent-id')).toBeUndefined();
        });
    });

    describe('getByStatus', () => {
        test('should return tasks matching the requested status', () => {
            taskService.create({ title: 'Todo task', status: 'todo' });
            taskService.create({
                title: 'In progress task',
                status: 'in_progress',
            });
            taskService.create({ title: 'Done task', status: 'done' });

            const tasks = taskService.getByStatus('todo');

            expect(tasks).toHaveLength(1);
            expect(tasks[0].title).toBe('Todo task');
        });

        test('should return an empty array when no task matches the status', () => {
            taskService.create({ title: 'Todo task', status: 'todo' });

            expect(taskService.getByStatus('done')).toEqual([]);
        });

        test('should not match partial status values', () => {
            taskService.create({
                title: 'Todo task',
                status: 'todo',
            });

            const tasks = taskService.getByStatus('to');

            expect(tasks).toEqual([]);
        });
    });

    describe('getPaginated', () => {
        beforeEach(() => {
            taskService.create({ title: 'Task 1' });
            taskService.create({ title: 'Task 2' });
            taskService.create({ title: 'Task 3' });
            taskService.create({ title: 'Task 4' });
            taskService.create({ title: 'Task 5' });
        });

        test('should return the first page of tasks', () => {
            const tasks = taskService.getPaginated(1, 2);

            expect(tasks).toHaveLength(2);
            expect(tasks[0].title).toBe('Task 1');
            expect(tasks[1].title).toBe('Task 2');
        });

        test('should return the second page of tasks', () => {
            const tasks = taskService.getPaginated(2, 2);

            expect(tasks).toHaveLength(2);
            expect(tasks[0].title).toBe('Task 3');
            expect(tasks[1].title).toBe('Task 4');
        });
    });

    describe('getStats', () => {
        test('should return zero counts when there are no tasks', () => {
            expect(taskService.getStats()).toEqual({
                todo: 0,
                in_progress: 0,
                done: 0,
                overdue: 0,
            });
        });

        test('should count tasks by status', () => {
            taskService.create({ title: 'Todo', status: 'todo' });
            taskService.create({
                title: 'In progress',
                status: 'in_progress',
            });
            taskService.create({ title: 'Done', status: 'done' });

            expect(taskService.getStats()).toEqual({
                todo: 1,
                in_progress: 1,
                done: 1,
                overdue: 0,
            });
        });

        test('should count overdue unfinished tasks', () => {
            taskService.create({
                title: 'Overdue task',
                status: 'todo',
                dueDate: '2020-01-01T00:00:00.000Z',
            });

            expect(taskService.getStats().overdue).toBe(1);
        });

        test('should not count completed tasks as overdue', () => {
            taskService.create({
                title: 'Completed overdue task',
                status: 'done',
                dueDate: '2020-01-01T00:00:00.000Z',
            });

            expect(taskService.getStats().overdue).toBe(0);
        });
    });

    describe('create', () => {
        test('should create a task with the provided values', () => {
            const task = taskService.create({
                title: 'Learn Jest',
                description: 'Write unit tests',
                status: 'in_progress',
                priority: 'high',
                dueDate: '2030-01-01T00:00:00.000Z',
            });

            expect(task.title).toBe('Learn Jest');
            expect(task.description).toBe('Write unit tests');
            expect(task.status).toBe('in_progress');
            expect(task.priority).toBe('high');
            expect(task.dueDate).toBe('2030-01-01T00:00:00.000Z');
            expect(task.completedAt).toBeNull();
            expect(task.id).toBeDefined();
            expect(task.createdAt).toBeDefined();
        });

        test('should apply default values when optional fields are missing', () => {
            const task = taskService.create({ title: 'Default task' });

            expect(task.description).toBe('');
            expect(task.status).toBe('todo');
            expect(task.priority).toBe('medium');
            expect(task.dueDate).toBeNull();
            expect(task.completedAt).toBeNull();
        });
    });

    describe('update', () => {
        test('should update an existing task', () => {
            const task = taskService.create({
                title: 'Old title',
                priority: 'low',
            });

            const updatedTask = taskService.update(task.id, {
                title: 'New title',
                priority: 'high',
            });

            expect(updatedTask.title).toBe('New title');
            expect(updatedTask.priority).toBe('high');
            expect(updatedTask.id).toBe(task.id);
        });

        test('should return null when updating a non-existent task', () => {
            expect(
                taskService.update('non-existent-id', { title: 'Updated' })
            ).toBeNull();
        });
    });

    describe('remove', () => {
        test('should remove an existing task', () => {
            const task = taskService.create({ title: 'Delete me' });

            expect(taskService.remove(task.id)).toBe(true);
            expect(taskService.findById(task.id)).toBeUndefined();
        });

        test('should return false when removing a non-existent task', () => {
            expect(taskService.remove('non-existent-id')).toBe(false);
        });
    });

    describe('completeTask', () => {
        test('should mark an existing task as done', () => {
            const task = taskService.create({
                title: 'Complete me',
                priority: 'high',
            });

            const completedTask = taskService.completeTask(task.id);

            expect(completedTask.status).toBe('done');
            expect(completedTask.completedAt).toEqual(expect.any(String));
        });

        test('should return null when completing a non-existent task', () => {
            expect(taskService.completeTask('non-existent-id')).toBeNull();
        });

        test('should preserve the existing priority when completing a task', () => {
            const task = taskService.create({
                title: 'Keep priority',
                priority: 'high',
            });

            const completedTask = taskService.completeTask(task.id);

            expect(completedTask.priority).toBe('high');
        });
    });

    describe('assignTask', () => {
        test('should assign an existing task to a user', () => {
            const task = taskService.create({ title: 'Unassigned task' });

            const assignedTask = taskService.assignTask(task.id, 'Shivam');

            expect(assignedTask.assignee).toBe('Shivam');
            expect(assignedTask.id).toBe(task.id);
        });

        test('should return null when assigning a non-existent task', () => {
            expect(
                taskService.assignTask('non-existent-id', 'Shivam')
            ).toBeNull();
        });

        test('should refuse to overwrite an existing assignee', () => {
            const task = taskService.create({ title: 'Task to assign' });
            taskService.assignTask(task.id, 'Shivam');

            const result = taskService.assignTask(task.id, 'Alice');

            expect(result).toEqual({ error: 'Task is already assigned' });
        });
    });
});
