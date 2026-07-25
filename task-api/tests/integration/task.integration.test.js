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