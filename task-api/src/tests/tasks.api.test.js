const request = require('supertest');
const app = require('../app')
const taskservice = require('../services/taskService')

describe('task api endpoints', () => {
    beforeEach(() => {
        taskservice._reset();
    })

    describe('Post/tasks', () => {
        test('should return 201 and create a task on happy path', async () => {
            const res = await request(app).post('/tasks').send({ title: "buy milk", priority: 'high' })

            expect(res.statusCode).toBe(201)

            expect(res.body.title).toBe('buy milk');

        });
        test('should return 400 if tittle is missing', async () => {
            const res = await request(app).post('/tasks').send({ priority: 'high' })

            expect(res.statusCode).toBe(400);

            expect(res.body.error).toBeDefined();

        })
    })
    describe('PATCH /tasks/:id/assign', () => {
        test('should return 200 and updated task on happy path', async () => {

            const task = taskservice.create({ title: 'Task to assign' });


            const res = await request(app)
                .patch(`/tasks/${task.id}/assign`)
                .send({ assignee: 'Alice' });


            expect(res.statusCode).toBe(200);
            expect(res.body.assignee).toBe('Alice');
        });

        test('should return 400 if assignee is missing or empty', async () => {
            const task = taskservice.create({ title: 'Task to assign' });

            const res = await request(app)
                .patch(`/tasks/${task.id}/assign`)
                .send({ assignee: '' }); // empty string!

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBeDefined();
        });

        test('should return 404 if task does not exist', async () => {
            const res = await request(app)
                .patch('/tasks/fake-id-123/assign')
                .send({ assignee: 'Bob' });

            expect(res.statusCode).toBe(404);
        });
    });
})
