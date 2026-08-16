const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

describe('Task API routes', () => {
    beforeEach(() => {
        taskService._reset();
    });

    describe('GET /tasks', () => {
        test('should return an empty array when there are no tasks', async () => {
            const response = await request(app)
                .get('/tasks');

            expect(response.status).toBe(200);
            expect(response.body).toEqual([]);
        });

        test('should return all tasks', async () => {
            taskService.create({ title: 'Task 1' });
            taskService.create({ title: 'Task 2' });

            const response = await request(app)
                .get('/tasks');

            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(2);
            expect(response.body[0].title).toBe('Task 1');
            expect(response.body[1].title).toBe('Task 2');
        });
    });

    describe('GET /tasks?status=', () => {
        test('should return tasks matching the requested status', async () => {
            taskService.create({
                title: 'Todo task',
                status: 'todo',
            });

            taskService.create({
                title: 'In progress task',
                status: 'in_progress',
            });

            taskService.create({
                title: 'Done task',
                status: 'done',
            });

            const response = await request(app)
                .get('/tasks')
                .query({ status: 'todo' });

            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(1);
            expect(response.body[0].title).toBe('Todo task');
            expect(response.body[0].status).toBe('todo');
        });

        test('should return an empty array when no task matches the status', async () => {
            taskService.create({
                title: 'Todo task',
                status: 'todo',
            });

            const response = await request(app)
                .get('/tasks')
                .query({ status: 'done' });

            expect(response.status).toBe(200);
            expect(response.body).toEqual([]);
        });

        test('should not match partial status values', async () => {
            taskService.create({
                title: 'Todo task',
                status: 'todo',
            });

            const response = await request(app)
                .get('/tasks')
                .query({ status: 'to' });

            expect(response.status).toBe(200);
            expect(response.body).toEqual([]);
        });
    });

    describe('GET /tasks pagination', () => {
        beforeEach(() => {
            taskService.create({ title: 'Task 1' });
            taskService.create({ title: 'Task 2' });
            taskService.create({ title: 'Task 3' });
            taskService.create({ title: 'Task 4' });
            taskService.create({ title: 'Task 5' });
        });

        test('should return the first page of tasks', async () => {
            const response = await request(app)
                .get('/tasks')
                .query({ page: 1, limit: 2 });

            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(2);
            expect(response.body[0].title).toBe('Task 1');
            expect(response.body[1].title).toBe('Task 2');
        });

        test('should return the second page of tasks', async () => {
            const response = await request(app)
                .get('/tasks')
                .query({ page: 2, limit: 2 });

            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(2);
            expect(response.body[0].title).toBe('Task 3');
            expect(response.body[1].title).toBe('Task 4');
        });

        test('should return an empty array when the page is beyond available tasks', async () => {
            const response = await request(app)
                .get('/tasks')
                .query({ page: 10, limit: 2 });

            expect(response.status).toBe(200);
            expect(response.body).toEqual([]);
        });
    });

    describe('POST /tasks', () => {
        test('should create a new task', async () => {
            const response = await request(app)
                .post('/tasks')
                .send({
                    title: 'Learn Jest',
                    description: 'Write API tests',
                    status: 'in_progress',
                    priority: 'high',
                    dueDate: '2030-01-01T00:00:00.000Z',
                });

            expect(response.status).toBe(201);

            expect(response.body.title).toBe('Learn Jest');
            expect(response.body.description).toBe('Write API tests');
            expect(response.body.status).toBe('in_progress');
            expect(response.body.priority).toBe('high');
            expect(response.body.dueDate).toBe('2030-01-01T00:00:00.000Z');

            expect(response.body.id).toBeDefined();
            expect(response.body.createdAt).toBeDefined();
            expect(response.body.completedAt).toBeNull();
        });

        test('should create a task using default values for optional fields', async () => {
            const response = await request(app)
                .post('/tasks')
                .send({
                    title: 'Simple task',
                });

            expect(response.status).toBe(201);

            expect(response.body.title).toBe('Simple task');
            expect(response.body.description).toBe('');
            expect(response.body.status).toBe('todo');
            expect(response.body.priority).toBe('medium');
            expect(response.body.dueDate).toBeNull();
            expect(response.body.completedAt).toBeNull();
        });

        test('should return 400 when title is missing', async () => {
            const response = await request(app)
                .post('/tasks')
                .send({
                    priority: 'high',
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toBe(
                'title is required and must be a non-empty string'
            );
        });

        test('should return 400 when title is an empty string', async () => {
            const response = await request(app)
                .post('/tasks')
                .send({
                    title: '   ',
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toBe(
                'title is required and must be a non-empty string'
            );
        });

        test('should return 400 when status is invalid', async () => {
            const response = await request(app)
                .post('/tasks')
                .send({
                    title: 'Invalid status task',
                    status: 'pending',
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toBe(
                'status must be one of: todo, in_progress, done'
            );
        });

        test('should return 400 when priority is invalid', async () => {
            const response = await request(app)
                .post('/tasks')
                .send({
                    title: 'Invalid priority task',
                    priority: 'urgent',
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toBe(
                'priority must be one of: low, medium, high'
            );
        });
    });

    describe('PUT /tasks/:id', () => {
        test('should update an existing task', async () => {
            const task = taskService.create({
                title: 'Original title',
                description: 'Original description',
                status: 'todo',
                priority: 'low',
            });

            const response = await request(app)
                .put(`/tasks/${task.id}`)
                .send({
                    title: 'Updated title',
                    description: 'Updated description',
                    status: 'in_progress',
                    priority: 'high',
                });

            expect(response.status).toBe(200);

            expect(response.body.id).toBe(task.id);
            expect(response.body.title).toBe('Updated title');
            expect(response.body.description).toBe('Updated description');
            expect(response.body.status).toBe('in_progress');
            expect(response.body.priority).toBe('high');
        });

        test('should return 404 when the task does not exist', async () => {
            const response = await request(app)
                .put('/tasks/non-existent-id')
                .send({
                    title: 'Updated title',
                });

            expect(response.status).toBe(404);
            expect(response.body.error).toBe('Task not found');
        });

        test('should return 400 when title is empty', async () => {
            const task = taskService.create({
                title: 'Original title',
            });

            const response = await request(app)
                .put(`/tasks/${task.id}`)
                .send({
                    title: '   ',
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toBe(
                'title must be a non-empty string'
            );
        });

        test('should return 400 when status is invalid', async () => {
            const task = taskService.create({
                title: 'Original title',
            });

            const response = await request(app)
                .put(`/tasks/${task.id}`)
                .send({
                    status: 'pending',
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toBe(
                'status must be one of: todo, in_progress, done'
            );
        });

        test('should return 400 when priority is invalid', async () => {
            const task = taskService.create({
                title: 'Original title',
            });

            const response = await request(app)
                .put(`/tasks/${task.id}`)
                .send({
                    priority: 'urgent',
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toBe(
                'priority must be one of: low, medium, high'
            );
        });

        test('should return 400 when dueDate is invalid', async () => {
            const task = taskService.create({
                title: 'Original title',
            });

            const response = await request(app)
                .put(`/tasks/${task.id}`)
                .send({
                    dueDate: 'not-a-valid-date',
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toBe(
                'dueDate must be a valid ISO date string'
            );
        });
    });

    describe('DELETE /tasks/:id', () => {
        test('should delete an existing task', async () => {
            const task = taskService.create({ title: 'Task to delete' });

            const response = await request(app).delete(`/tasks/${task.id}`);

            expect(response.status).toBe(204);
            expect(taskService.findById(task.id)).toBeUndefined();
        });

        test('should return 404 when deleting a non-existent task', async () => {
            const response = await request(app).delete('/tasks/non-existent-id');

            expect(response.status).toBe(404);
            expect(response.body.error).toBe('Task not found');
        });
    });

    describe('PATCH /tasks/:id/complete', () => {
        test('should mark a task as completed', async () => {
            const task = taskService.create({ title: 'Task to complete' });

            const response = await request(app).patch(`/tasks/${task.id}/complete`);

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('done');
            expect(response.body.completedAt).toEqual(expect.any(String));
        });

        test('should return 404 when completing a non-existent task', async () => {
            const response = await request(app).patch('/tasks/non-existent-id/complete');

            expect(response.status).toBe(404);
            expect(response.body.error).toBe('Task not found');
        });
    });

    describe('GET /tasks/stats', () => {
        test('should return zero counts when store is empty', async () => {
            const response = await request(app).get('/tasks/stats');

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                todo: 0,
                in_progress: 0,
                done: 0,
                overdue: 0,
            });
        });

        test('should return correct status counts', async () => {
            taskService.create({ title: 'Todo task', status: 'todo' });
            taskService.create({ title: 'In progress task', status: 'in_progress' });
            taskService.create({ title: 'Done task', status: 'done' });

            const response = await request(app).get('/tasks/stats');

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                todo: 1,
                in_progress: 1,
                done: 1,
                overdue: 0,
            });
        });

        test('should return correct overdue count for overdue tasks', async () => {
            taskService.create({
                title: 'Overdue task',
                status: 'todo',
                dueDate: '2020-01-01T00:00:00.000Z',
            });

            const response = await request(app).get('/tasks/stats');

            expect(response.status).toBe(200);
            expect(response.body.overdue).toBe(1);
        });
    });

    describe('PATCH /tasks/:id/assign', () => {
        test('should assign a task to a user when given a valid assignee', async () => {
            const task = taskService.create({ title: 'Unassigned task' });

            const response = await request(app)
                .patch(`/tasks/${task.id}/assign`)
                .send({ assignee: 'Shivam' });

            expect(response.status).toBe(200);
            expect(response.body.assignee).toBe('Shivam');
            expect(response.body.id).toBe(task.id);
        });

        test('should return 404 when assigning a non-existent task', async () => {
            const response = await request(app)
                .patch('/tasks/non-existent-id/assign')
                .send({ assignee: 'Shivam' });

            expect(response.status).toBe(404);
            expect(response.body.error).toBe('Task not found');
        });

        test('should return 400 when assignee field is missing', async () => {
            const task = taskService.create({ title: 'Unassigned task' });

            const response = await request(app)
                .patch(`/tasks/${task.id}/assign`)
                .send({});

            expect(response.status).toBe(400);
        });

        test('should return 400 when assignee is an empty string', async () => {
            const task = taskService.create({ title: 'Unassigned task' });

            const response = await request(app)
                .patch(`/tasks/${task.id}/assign`)
                .send({ assignee: '' });

            expect(response.status).toBe(400);
        });

        test('should return 400 when assignee is whitespace-only', async () => {
            const task = taskService.create({ title: 'Unassigned task' });

            const response = await request(app)
                .patch(`/tasks/${task.id}/assign`)
                .send({ assignee: '   ' });

            expect(response.status).toBe(400);
        });

        test('should return 400 when assignee is not a string', async () => {
            const task = taskService.create({ title: 'Unassigned task' });

            const response = await request(app)
                .patch(`/tasks/${task.id}/assign`)
                .send({ assignee: 12345 });

            expect(response.status).toBe(400);
        });

        test('should return 400 when task is already assigned', async () => {
            const task = taskService.create({ title: 'Already assigned task' });

            await request(app)
                .patch(`/tasks/${task.id}/assign`)
                .send({ assignee: 'Shivam' });

            const response = await request(app)
                .patch(`/tasks/${task.id}/assign`)
                .send({ assignee: 'Alice' });

            expect(response.status).toBe(400);
        });
    });
});
