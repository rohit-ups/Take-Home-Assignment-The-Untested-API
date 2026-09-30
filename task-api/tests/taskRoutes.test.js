const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

beforeEach(() => {
    taskService._reset();
});

describe('Task API', () => {
    test('POST /tasks should create a new task', async () => {
        const response = await request(app)
            .post('/tasks')
            .send({
                title: 'Learn Supertest',
                priority: 'high',
            });

        expect(response.statusCode).toBe(201);
        expect(response.body.title).toBe('Learn Supertest');
        expect(response.body.priority).toBe('high');
        expect(response.body.status).toBe('todo');
    });

    test('POST /tasks should return 400 when title is missing', async () => {
        const response = await request(app)
            .post('/tasks')
            .send({
                priority: 'high',
            });

        expect(response.statusCode).toBe(400);
        expect(response.body.error).toBe(
            'title is required and must be a non-empty string'
        );
    });

    test('GET /tasks should return all tasks', async () => {
        taskService.create({ title: 'Task 1' });
        taskService.create({ title: 'Task 2' });

        const response = await request(app)
            .get('/tasks');

        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveLength(2);
        expect(response.body[0].title).toBe('Task 1');
        expect(response.body[1].title).toBe('Task 2');
    });

    test('GET /tasks?status=todo should return tasks by status', async () => {
        taskService.create({
            title: 'Todo Task',
            status: 'todo',
        });

        taskService.create({
            title: 'Done Task',
            status: 'done',
        });

        const response = await request(app)
            .get('/tasks?status=todo');

        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveLength(1);
        expect(response.body[0].title).toBe('Todo Task');
    });

    test('PUT /tasks/:id should update a task', async () => {
        const task = taskService.create({
            title: 'Old title',
        });

        const response = await request(app)
            .put(`/tasks/${task.id}`)
            .send({
                title: 'New title',
            });

        expect(response.statusCode).toBe(200);
        expect(response.body.id).toBe(task.id);
        expect(response.body.title).toBe('New title');
    });

    test('PUT /tasks/:id should return 404 for non-existent task', async () => {
        const response = await request(app)
            .put('/tasks/non-existent-id')
            .send({
                title: 'New title',
            });

        expect(response.statusCode).toBe(404);
        expect(response.body.error).toBe('Task not found');
    });

    test('DELETE /tasks/:id should delete a task', async () => {
        const task = taskService.create({
            title: 'Delete me',
        });

        const response = await request(app)
            .delete(`/tasks/${task.id}`);

        expect(response.statusCode).toBe(204);
        expect(taskService.findById(task.id)).toBeUndefined();
    });

    test('DELETE /tasks/:id should return 404 for non-existent task', async () => {
        const response = await request(app)
            .delete('/tasks/non-existent-id');

        expect(response.statusCode).toBe(404);
        expect(response.body.error).toBe('Task not found');
    });

    test('PATCH /tasks/:id/complete should complete a task', async () => {
        const task = taskService.create({
            title: 'Complete me',
            status: 'todo',
        });

        const response = await request(app)
            .patch(`/tasks/${task.id}/complete`);

        expect(response.statusCode).toBe(200);
        expect(response.body.id).toBe(task.id);
        expect(response.body.status).toBe('done');
        expect(response.body.completedAt).toBeDefined();
    });

    test('PATCH /tasks/:id/complete should return 404 for non-existent task', async () => {
        const response = await request(app)
            .patch('/tasks/non-existent-id/complete');

        expect(response.statusCode).toBe(404);
        expect(response.body.error).toBe('Task not found');
    });

    test('GET /tasks/stats should return task statistics', async () => {
        taskService.create({
            title: 'Todo',
            status: 'todo',
        });

        taskService.create({
            title: 'Done',
            status: 'done',
        });

        const response = await request(app)
            .get('/tasks/stats');

        expect(response.statusCode).toBe(200);
        expect(response.body.todo).toBe(1);
        expect(response.body.done).toBe(1);
        expect(response.body.in_progress).toBe(0);
    });
});

test('PATCH /tasks/:id/assign should assign a task', async () => {
    const task = taskService.create({
        title: 'Assign me',
    });

    const response = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({
            assignee: 'Jayendra',
        });

    expect(response.statusCode).toBe(200);
    expect(response.body.id).toBe(task.id);
    expect(response.body.assignee).toBe('Jayendra');
});

test('PATCH /tasks/:id/assign should return 404 for non-existent task', async () => {
    const response = await request(app)
        .patch('/tasks/non-existent-id/assign')
        .send({
            assignee: 'Jayendra',
        });

    expect(response.statusCode).toBe(404);
    expect(response.body.error).toBe('Task not found');
});

test('PATCH /tasks/:id/assign should return 400 for empty assignee', async () => {
    const task = taskService.create({
        title: 'Assign me',
    });

    const response = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({
            assignee: '',
        });

    expect(response.statusCode).toBe(400);
    expect(response.body.error).toBe(
        'assignee is required and must be a non-empty string'
    );
});