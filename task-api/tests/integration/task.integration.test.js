const request = require('supertest');
const app = require('../../src/app');
const Service = require('../../src/services/taskService');

beforeEach(() => {
    Service._reset();
});

describe('POST /tasks', () => {
    test('creates a task and returns 201 with the task body', async () => {
        const res = await request(app)
          .post('/tasks')
          .send({ title: 'Write tests' });
        
        expect(res.status).toBe(201);
        expect(res.body.title).toBe('Write tests');
        expect(res.body.status).toBe('todo');
        expect(res.body.id).toBeDefined();
    });

    // Edge case: missing required field
    test('returns 400 when title is missing', async () => {
        const res = await request(app).post('/tasks').send({});
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/title/i);
    });

    // Edge case: title is only whitespace
    test('returns 400 when title is an empty/whitespace string', async () => {
        const res = await request(app).post('/tasks').send({ title: '   ' });
        expect(res.status).toBe(400);
    });

    // Edge case: invalid enum value
    test('returns 400 when status is not a valid value', async () => {
        const res = await request(app)
          .post('/tasks')
          .send({ title: 'Bad status', status: 'archived' });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/status/i);
    });

    // Edge case: invalid date
    test('returns 400 when dueDate is not a valid date string', async () => {
        const res = await request(app)
          .post('/tasks')
          .send({ title: 'Bad date', dueDate: 'not-a-date' });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/dueDate/i);
    });
});


describe('GET /tasks', () => {
    test('returns an empty array when no tasks exist', async () => {
        const res = await request(app).get('/tasks');
        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
    });

    test('returns all created tasks', async () => {
        await request(app).post('/tasks').send({ title: 'A' });
        await request(app).post('/tasks').send({ title: 'B' });

        const res = await request(app).get('/tasks');
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(2);
    });

    test('filters by status via ?status=', async () => {
        await request(app).post('/tasks').send({ title: 'A', status: 'todo' });
        await request(app).post('/tasks').send({ title: 'B', status: 'done' });

        const res = await request(app).get('/tasks?status=done');
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(1);
        expect(res.body[0].title).toBe('B');
    });

    test('paginates results via ?page= and ?limit=', async () => {
        for (let i = 1; i <= 15; i++) {
          await request(app).post('/tasks').send({ title: `Task ${i}` });
        }
        const res = await request(app).get('/tasks?page=1&limit=10');
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(10);
    });

    // Edge case: status filter that matches nothing
    test('returns an empty array when the status filter matches nothing', async () => {
        await request(app).post('/tasks').send({ title: 'A', status: 'todo' });
        const res = await request(app).get('/tasks?status=done');
        expect(res.body).toEqual([]);
    });

    // Edge case: non-numeric page/limit should fall back to defaults rather than crash
    test('falls back to default pagination when page/limit are non-numeric', async () => {
        await request(app).post('/tasks').send({ title: 'A' });
        const res = await request(app).get('/tasks?page=abc&limit=xyz');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });
});

describe('GET /tasks/stats', () => {
    test('returns zeroed stats when there are no tasks', async () => {
        const res = await request(app).get('/tasks/stats');
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ todo: 0, in_progress: 0, done: 0, overdue: 0 });
    });

    test('reflects created and completed tasks', async () => {
        const create = await request(app).post('/tasks').send({ title: 'A' });
        await request(app).patch(`/tasks/${create.body.id}/complete`);

        const res = await request(app).get('/tasks/stats');
        expect(res.body.done).toBe(1);
        expect(res.body.todo).toBe(0);
    });

    // Edge case: ensures /stats isn't shadowed by any dynamic /:id-style route
    test('is reachable at /tasks/stats without colliding with an :id route', async () => {
        const res = await request(app).get('/tasks/stats');
        expect(res.status).toBe(200);
        expect(res.body).not.toHaveProperty('error');
    });
});

describe('PUT /tasks/:id', () => {
    test('updates an existing task and returns it', async () => {
        const create = await request(app).post('/tasks').send({ title: 'Original' });
        const res = await request(app)
          .put(`/tasks/${create.body.id}`)
          .send({ title: 'Updated' });
        
        expect(res.status).toBe(200);
        expect(res.body.title).toBe('Updated');
    });

    // Edge case: unknown id
    test('returns 404 when the task does not exist', async () => {
        const res = await request(app).put('/tasks/does-not-exist').send({ title: 'X' });
        expect(res.status).toBe(404);
    });

    // Edge case: invalid field value on update
    test('returns 400 when priority is invalid', async () => {
        const create = await request(app).post('/tasks').send({ title: 'A' });
        const res = await request(app)
          .put(`/tasks/${create.body.id}`)
          .send({ priority: 'urgent' });
        expect(res.status).toBe(400);
    });
});

describe('DELETE /tasks/:id', () => {
    test('deletes an existing task and returns 204', async () => {
        const create = await request(app).post('/tasks').send({ title: 'To delete' });
        const res = await request(app).delete(`/tasks/${create.body.id}`);
        expect(res.status).toBe(204);
        
        const getRes = await request(app).get('/tasks');
        expect(getRes.body).toHaveLength(0);
    });

    // Edge case: unknown id
    test('returns 404 when the task does not exist', async () => {
        const res = await request(app).delete('/tasks/does-not-exist');
        expect(res.status).toBe(404);
    });

    // Edge case: deleting twice
    test('returns 404 on a second delete of the same id', async () => {
        const create = await request(app).post('/tasks').send({ title: 'Once' });
        await request(app).delete(`/tasks/${create.body.id}`);
        const res = await request(app).delete(`/tasks/${create.body.id}`);
        expect(res.status).toBe(404);
    });
});

describe('PATCH /tasks/:id/complete', () => {
    test('marks a task complete and sets completedAt', async () => {
        const create = await request(app).post('/tasks').send({ title: 'Finish me' });
        const res = await request(app).patch(`/tasks/${create.body.id}/complete`);
        
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('done');
        expect(res.body.completedAt).not.toBeNull();
    });

    // Edge case: unknown id
    test('returns 404 when the task does not exist', async () => {
        const res = await request(app).patch('/tasks/does-not-exist/complete');
        expect(res.status).toBe(404);
    });

    // Edge case: completing an already-completed task should be idempotent, not error
    test('completing an already-completed task still returns 200', async () => {
        const create = await request(app).post('/tasks').send({ title: 'Twice' });
        await request(app).patch(`/tasks/${create.body.id}/complete`);
        const res = await request(app).patch(`/tasks/${create.body.id}/complete`);
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('done');
    });
});