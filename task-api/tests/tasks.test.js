const request = require('supertest');

const app = require('../src/app');
const taskService = require('../src/services/taskService');

describe('Task API', () => {
    beforeEach(() => {
        taskService._reset();
    });

    describe('POST /tasks', () => {
        test('should create a new task', async () => {
            const response = await request(app)
                .post('/tasks')
                .send({
                    title: 'Learn Jest',
                    description: 'Write tests for the API',
                    priority: 'high',
                });

            expect(response.status).toBe(201);
            expect(response.body.title).toBe('Learn Jest');
            expect(response.body.description).toBe('Write tests for the API');
            expect(response.body.priority).toBe('high');
            expect(response.body.status).toBe('todo');
            expect(response.body.id).toBeDefined();
        });

        test('should reject a task without a title', async () => {
            const response = await request(app)
                .post('/tasks')
                .send({
                    description: 'Missing title',
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toBe(
                'title is required and must be a non-empty string'
            );
        });

        test('should reject an invalid status', async () => {
            const response = await request(app)
                .post('/tasks')
                .send({
                    title: 'Invalid task',
                    status: 'invalid',
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toMatch(/status must be one of/);
        });
    });

    describe('GET /tasks', () => {
        test('should return all tasks', async () => {
            await request(app)
                .post('/tasks')
                .send({ title: 'Task 1' });

            await request(app)
                .post('/tasks')
                .send({ title: 'Task 2' });

            const response = await request(app).get('/tasks');

            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(2);
        });

        test('should filter tasks by status', async () => {
            await request(app)
                .post('/tasks')
                .send({
                    title: 'Todo task',
                    status: 'todo',
                });

            await request(app)
                .post('/tasks')
                .send({
                    title: 'Progress task',
                    status: 'in_progress',
                });

            const response = await request(app).get('/tasks?status=todo');

            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(1);
            expect(response.body[0].status).toBe('todo');
        });

        test('should return paginated tasks', async () => {
            await request(app).post('/tasks').send({ title: 'Task 1' });
            await request(app).post('/tasks').send({ title: 'Task 2' });
            await request(app).post('/tasks').send({ title: 'Task 3' });

            const response = await request(app).get('/tasks?page=1&limit=2');

            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(2);
            expect(response.body[0].title).toBe('Task 1');
            expect(response.body[1].title).toBe('Task 2');
        });

        test('should handle an unknown status by returning an empty array', async () => {
            await request(app)
                .post('/tasks')
                .send({ title: 'Task 1' });

            const response = await request(app).get('/tasks?status=unknown');

            expect(response.status).toBe(200);
            expect(response.body).toEqual([]);
        });
    });

    describe('PUT /tasks/:id', () => {
        test('should update an existing task', async () => {
            const createResponse = await request(app)
                .post('/tasks')
                .send({
                    title: 'Original title',
                    priority: 'low',
                });

            const id = createResponse.body.id;

            const response = await request(app)
                .put(`/tasks/${id}`)
                .send({
                    title: 'Updated title',
                    priority: 'high',
                });

            expect(response.status).toBe(200);
            expect(response.body.title).toBe('Updated title');
            expect(response.body.priority).toBe('high');
        });

        test('should return 404 for an unknown task', async () => {
            const response = await request(app)
                .put('/tasks/unknown-id')
                .send({
                    title: 'Updated',
                });

            expect(response.status).toBe(404);
            expect(response.body.error).toBe('Task not found');
        });

        test('should reject an invalid priority', async () => {
            const createResponse = await request(app)
                .post('/tasks')
                .send({
                    title: 'Test task',
                });

            const response = await request(app)
                .put(`/tasks/${createResponse.body.id}`)
                .send({
                    priority: 'urgent',
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toMatch(/priority must be one of/);
        });
    });

    describe('DELETE /tasks/:id', () => {
        test('should delete an existing task', async () => {
            const createResponse = await request(app)
                .post('/tasks')
                .send({
                    title: 'Delete me',
                });

            const id = createResponse.body.id;

            const response = await request(app).delete(`/tasks/${id}`);

            expect(response.status).toBe(204);

            const getResponse = await request(app).get('/tasks');

            expect(getResponse.body).toHaveLength(0);
        });

        test('should return 404 for an unknown task', async () => {
            const response = await request(app).delete('/tasks/unknown-id');

            expect(response.status).toBe(404);
            expect(response.body.error).toBe('Task not found');
        });
    });

    describe('PATCH /tasks/:id/complete', () => {
        test('should complete an existing task', async () => {
            const createResponse = await request(app)
                .post('/tasks')
                .send({
                    title: 'Complete me',
                    priority: 'high',
                });

            const id = createResponse.body.id;

            const response = await request(app)
                .patch(`/tasks/${id}/complete`);

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('done');
            expect(response.body.completedAt).toBeDefined();
        });

        test('should return 404 for an unknown task', async () => {
            const response = await request(app)
                .patch('/tasks/unknown-id/complete');

            expect(response.status).toBe(404);
            expect(response.body.error).toBe('Task not found');
        });
    });

    describe('GET /tasks/stats', () => {
        test('should return task statistics', async () => {
            await request(app)
                .post('/tasks')
                .send({
                    title: 'Todo task',
                    status: 'todo',
                });

            await request(app)
                .post('/tasks')
                .send({
                    title: 'Progress task',
                    status: 'in_progress',
                });

            await request(app)
                .post('/tasks')
                .send({
                    title: 'Done task',
                    status: 'done',
                });

            const response = await request(app).get('/tasks/stats');

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                todo: 1,
                in_progress: 1,
                done: 1,
                overdue: 0,
            });
        });
    });

    describe('PATCH /tasks/:id/assign', () => {
        test('should assign a task to a user', async () => {
            const createResponse = await request(app)
                .post('/tasks')
                .send({
                    title: 'Assign me',
                });

            const id = createResponse.body.id;

            const response = await request(app)
                .patch(`/tasks/${id}/assign`)
                .send({
                    assignee: 'Amar',
                });

            expect(response.status).toBe(200);
            expect(response.body.assignee).toBe('Amar');
            expect(response.body.id).toBe(id);
        });

        test('should reject a missing assignee', async () => {
            const createResponse = await request(app)
                .post('/tasks')
                .send({
                    title: 'Missing assignee',
                });

            const id = createResponse.body.id;

            const response = await request(app)
                .patch(`/tasks/${id}/assign`)
                .send({});

            expect(response.status).toBe(400);
            expect(response.body.error).toBe(
                'assignee must be a non-empty string'
            );
        });

        test('should reject an empty assignee', async () => {
            const createResponse = await request(app)
                .post('/tasks')
                .send({
                    title: 'Empty assignee',
                });

            const id = createResponse.body.id;

            const response = await request(app)
                .patch(`/tasks/${id}/assign`)
                .send({
                    assignee: '   ',
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toBe(
                'assignee must be a non-empty string'
            );
        });

        test('should return 404 for an unknown task', async () => {
            const response = await request(app)
                .patch('/tasks/unknown-id/assign')
                .send({
                    assignee: 'Amar',
                });

            expect(response.status).toBe(404);
            expect(response.body.error).toBe('Task not found');
        });

        test('should allow reassignment', async () => {
            const createResponse = await request(app)
                .post('/tasks')
                .send({
                    title: 'Reassign me',
                });

            const id = createResponse.body.id;

            await request(app)
                .patch(`/tasks/${id}/assign`)
                .send({
                    assignee: 'Amar',
                });

            const response = await request(app)
                .patch(`/tasks/${id}/assign`)
                .send({
                    assignee: 'Rahul',
                });

            expect(response.status).toBe(200);
            expect(response.body.assignee).toBe('Rahul');
        });
    });
});
