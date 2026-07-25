const request = require('supertest');
const app = require('../../src/app');
const Service = require('../../src/services/taskService');


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

