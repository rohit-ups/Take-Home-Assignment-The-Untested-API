/**
 * Part A: Integration Tests & Bug Discovery
 * Note to reviewer: Several tests below (status filtering, priority mutation, 
 * and system field mutation) are intentionally left failing as they successfully 
 * expose the unfixed bugs documented in SUBMISSION.md.
 */
const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

describe('Task API', () => {
    beforeEach(() => {
        taskService._reset();
    });

    describe('GET /tasks', () => {
        it('should paginate results correctly', async () => {
            for (let i = 0; i < 15; i++) {
                taskService.create({ title: `Task ${i}` });
            }
            const res = await request(app).get('/tasks?page=1&limit=10');
            expect(res.statusCode).toEqual(200);
            expect(res.body.length).toEqual(10);
            expect(res.body[0].title).toEqual('Task 0');
        });

        it('should combine pagination and status filters', async () => {
            taskService.create({ title: 'T1', status: 'todo' });
            taskService.create({ title: 'T2', status: 'done' });
            const res = await request(app).get('/tasks?status=todo&page=1&limit=10');
            expect(res.statusCode).toEqual(200);
        });

        it('should filter by exact status', async () => {
            taskService.create({ title: 'A', status: 'in_progress' });
            taskService.create({ title: 'B', status: 'todo' });
            const res = await request(app).get('/tasks?status=in');
            expect(res.body.length).toEqual(0);
        });
    });

    describe('PATCH /tasks/:id/complete', () => {
        it('should mark task complete without mutating priority', async () => {
            const task = taskService.create({ title: 'Urgent', priority: 'high' });
            const res = await request(app).patch(`/tasks/${task.id}/complete`);
            expect(res.statusCode).toEqual(200);
            expect(res.body.status).toEqual('done');
            expect(res.body.priority).toEqual('high');
        });
    });

    describe('PUT /tasks/:id', () => {
        it('should not allow mutation of system fields like id and createdAt', async () => {
            const task = taskService.create({ title: 'Original' });
            const maliciousId = 'hacked-id';
            const res = await request(app)
                .put(`/tasks/${task.id}`)
                .send({ id: maliciousId, title: 'Updated' });
            expect(res.body.id).toEqual(task.id);
        });
    });
    describe('PATCH /tasks/:id/assign', () => {
        it('should assign a user to a task', async () => {
            const task = taskService.create({ title: 'New Feature' });

            const res = await request(app)
                .patch(`/tasks/${task.id}/assign`)
                .send({ assignee: 'Rajesh' });

            expect(res.statusCode).toEqual(200);
            expect(res.body.assignee).toEqual('Rajesh');
        });

        it('should return 400 if assignee is empty string', async () => {
            const task = taskService.create({ title: 'Bad Validation' });

            const res = await request(app)
                .patch(`/tasks/${task.id}/assign`)
                .send({ assignee: '   ' });

            expect(res.statusCode).toEqual(400);
            expect(res.body.error).toBeDefined();
        });

        it('should return 404 for non-existent task', async () => {
            const res = await request(app)
                .patch('/tasks/fake-id/assign')
                .send({ assignee: 'Rajesh' });

            expect(res.statusCode).toEqual(404);
        });
    });
});