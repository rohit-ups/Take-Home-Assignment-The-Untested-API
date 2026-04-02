const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

let taskId;

beforeEach(() => {
    taskService._reset(); // ensure clean state before every test
});

describe('Task API - Full Coverage', () => {

    // Create task
    test('POST /tasks - valid task creation', async () => {
        const res = await request(app)
            .post('/tasks')
            .send({
                title: 'Test Task',
                description: 'Test description',
                priority: 'high',
                dueDate: '2026-12-31T00:00:00.000Z'
            });

        expect(res.statusCode).toBe(201);

        expect(res.body).toHaveProperty('id');
        expect(res.body.title).toBe('Test Task');
        expect(res.body.status).toBe('todo');
        expect(res.body.priority).toBe('high');
        expect(res.body.completedAt).toBeNull();
        expect(res.body.createdAt).toBeDefined();

        taskId = res.body.id;
    });

    // Missing title
    test('POST /tasks - missing title', async () => {
        const res = await request(app)
            .post('/tasks')
            .send({
                description: 'No title'
            });

        expect(res.statusCode).toBe(400);
    });

    // Invalid priority
    test('POST /tasks - invalid priority', async () => {
        const res = await request(app)
            .post('/tasks')
            .send({
                title: 'Invalid priority',
                priority: 'urgent'
            });

        expect(res.statusCode).toBe(400);
    });

    // Invalid date
    test('POST /tasks - invalid dueDate', async () => {
        const res = await request(app)
            .post('/tasks')
            .send({
                title: 'Bad date',
                dueDate: 'not-a-date'
            });

        expect(res.statusCode).toBe(400);
    });

    // Get all tasks
    test('GET /tasks', async () => {
        const res = await request(app).get('/tasks');

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    // Empty list case

    test('GET /tasks - empty list', async () => {
        const res = await request(app).get('/tasks');

        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual([]);
    });

    // invalid input types
    test('POST /tasks - title is not string', async () => {
        const res = await request(app)
            .post('/tasks')
            .send({ title: 123 });

        expect(res.statusCode).toBe(400);
    });

    // Complete task (PATCH, not PUT)
    test('PATCH /tasks/:id/complete', async () => {
        // create task first
        const createRes = await request(app)
            .post('/tasks')
            .send({ title: 'Task to complete' });

        const id = createRes.body.id;

        const res = await request(app)
            .patch(`/tasks/${id}/complete`);

        expect(res.statusCode).toBe(200);
        expect(res.body.status).toBe('done'); // fixed
        expect(res.body.completedAt).not.toBeNull();
    });

    // Invalid ID
    test('PATCH /tasks/:id/complete - invalid id', async () => {
        const res = await request(app)
            .patch('/tasks/123/complete');

        expect(res.statusCode).toBe(404);
    });

    // Non-existing task
    test('PATCH /tasks/:id/complete - non-existing', async () => {
        const res = await request(app)
            .patch('/tasks/550e8400-e29b-41d4-a716-446655440000/complete');

        expect(res.statusCode).toBe(404);
    });

    // Delete task
    test('DELETE /tasks/:id', async () => {
        const createRes = await request(app)
            .post('/tasks')
            .send({ title: 'Task to delete' });

        const id = createRes.body.id;

        const res = await request(app)
            .delete(`/tasks/${id}`);

        expect(res.statusCode).toBe(204); // fixed
    });

    // Delete again
    test('DELETE /tasks/:id - already deleted', async () => {
        const createRes = await request(app)
            .post('/tasks')
            .send({ title: 'Task to delete twice' });

        const id = createRes.body.id;

        await request(app).delete(`/tasks/${id}`);

        const res = await request(app)
            .delete(`/tasks/${id}`);

        expect(res.statusCode).toBe(404);
    });

    // With Filters
    test('GET /tasks?status=todo - filter tasks', async () => {
        await request(app).post('/tasks').send({ title: 'Task 1' }); // todo
        const t2 = await request(app).post('/tasks').send({ title: 'Task 2' });

        await request(app).patch(`/tasks/${t2.body.id}/complete`);

        const res = await request(app).get('/tasks?status=todo');

        expect(res.statusCode).toBe(200);
        expect(res.body.every(t => t.status === 'todo')).toBe(true);
    });


    // pagiation:
    test('GET /tasks?page=1&limit=2 - pagination', async () => {
        for (let i = 0; i < 5; i++) {
            await request(app).post('/tasks').send({ title: `Task ${i}` });
        }

        const res = await request(app).get('/tasks?page=1&limit=2');

        expect(res.statusCode).toBe(200);
        expect(res.body.length).toBe(2);
    });

    test('GET /tasks with negative page and limit should normalize values', async () => {
        for (let i = 0; i < 5; i++) {
            await request(app).post('/tasks').send({ title: `Task ${i}` });
        }

        const res = await request(app).get('/tasks?page=-2&limit=-5');

        expect(res.statusCode).toBe(200);
        expect(res.body.length).toBe(1); // normalized to limit=1
    });


    // overdue
    test('GET /tasks/stats - overdue count', async () => {
        await request(app).post('/tasks').send({
            title: 'Old task',
            dueDate: '2020-01-01T00:00:00.000Z'
        });

        const res = await request(app).get('/tasks/stats');

        expect(res.body.overdue).toBeGreaterThanOrEqual(1);
    });


    // Stats endpoint
    test('GET /tasks/stats', async () => {
        const t1 = await request(app).post('/tasks').send({ title: 'Task 1' });
        const t2 = await request(app).post('/tasks').send({ title: 'Task 2' });

        await request(app).patch(`/tasks/${t2.body.id}/complete`);

        const res = await request(app).get('/tasks/stats');

        expect(res.statusCode).toBe(200);
        expect(res.body.todo).toBeGreaterThanOrEqual(1);
        expect(res.body.done).toBeGreaterThanOrEqual(1);
    });

    // update a task
    test('PUT /tasks/:id - update task', async () => {
        const createRes = await request(app)
            .post('/tasks')
            .send({ title: 'Old title' });

        const res = await request(app)
            .put(`/tasks/${createRes.body.id}`)
            .send({ title: 'Updated title' });

        expect(res.statusCode).toBe(200);
        expect(res.body.title).toBe('Updated title');
    });

    // unknown route
    test('GET /unknown - should return 404', async () => {
        const res = await request(app).get('/unknown-route');

        expect(res.statusCode).toBe(404);
        expect(res.body).toHaveProperty('error');
    });

    test('PATCH /tasks/:id/assign - success', async () => {
        const createRes = await request(app)
            .post('/tasks')
            .send({ title: 'Task' });

        const res = await request(app)
            .patch(`/tasks/${createRes.body.id}/assign`)
            .send({ assignee: 'Shubham' });

        expect(res.statusCode).toBe(200);
        expect(res.body.assignee).toBe('Shubham');
    });

    test('PATCH /tasks/:id/assign - invalid body', async () => {
        const res = await request(app)
            .patch('/tasks/123/assign')
            .send({});

        expect(res.statusCode).toBe(400);
    });

    test('PATCH /tasks/:id/assign - task not found', async () => {
        const res = await request(app)
            .patch('/tasks/550e8400-e29b-41d4-a716-446655440000/assign')
            .send({ assignee: 'User' });

        expect(res.statusCode).toBe(404);
    });
});