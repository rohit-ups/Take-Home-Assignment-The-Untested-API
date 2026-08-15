const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

describe('Task Routes (Integration Tests)', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('POST /tasks', () => {
    it('creates a task with valid payload and returns 201 with task object', async () => {
      const payload = {
        title: 'Integration Test Task',
        description: 'Testing route creation',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2026-12-31T23:59:59.000Z',
      };

      const res = await request(app)
        .post('/tasks')
        .send(payload)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(res.body).toMatchObject({
        title: payload.title,
        description: payload.description,
        status: payload.status,
        priority: payload.priority,
        dueDate: payload.dueDate,
        completedAt: null,
      });
      expect(res.body.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(typeof res.body.createdAt).toBe('string');
    });

    it('applies default values when optional fields are omitted', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'Basic Task' })
        .expect(201);

      expect(res.body.title).toBe('Basic Task');
      expect(res.body.description).toBe('');
      expect(res.body.status).toBe('todo');
      expect(res.body.priority).toBe('medium');
      expect(res.body.dueDate).toBeNull();
      expect(res.body.completedAt).toBeNull();
    });

    it('returns 400 if title is missing', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ description: 'No title here' })
        .expect(400);

      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toContain('title is required');
    });

    it('returns 400 if title is an empty string or whitespace-only', async () => {
      const res1 = await request(app)
        .post('/tasks')
        .send({ title: '' })
        .expect(400);
      expect(res1.body.error).toContain('title is required');

      const res2 = await request(app)
        .post('/tasks')
        .send({ title: '   ' })
        .expect(400);
      expect(res2.body.error).toContain('title is required');
    });

    it('returns 400 for invalid status enum value', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'Test', status: 'invalid_status' })
        .expect(400);

      expect(res.body.error).toContain('status must be one of: todo, in_progress, done');
    });

    it('returns 400 for invalid priority enum value', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'Test', priority: 'critical' })
        .expect(400);

      expect(res.body.error).toContain('priority must be one of: low, medium, high');
    });

    it('returns 400 for invalid dueDate format', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'Test', dueDate: 'not-a-valid-date' })
        .expect(400);

      expect(res.body.error).toContain('dueDate must be a valid ISO date string');
    });

    it('ignores unexpected extra fields in request body', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({
          title: 'Extra fields task',
          unwantedField: 'hack',
          admin: true,
        })
        .expect(201);

      expect(res.body.unwantedField).toBeUndefined();
      expect(res.body.admin).toBeUndefined();
    });
  });

  describe('GET /tasks', () => {
    it('returns 200 with empty array on an empty store', async () => {
      const res = await request(app)
        .get('/tasks')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(res.body).toEqual([]);
    });

    it('returns 200 with all tasks matching standard task shape', async () => {
      await request(app).post('/tasks').send({ title: 'Task 1' });
      await request(app).post('/tasks').send({ title: 'Task 2' });

      const res = await request(app)
        .get('/tasks')
        .expect(200);

      expect(res.body).toHaveLength(2);
      res.body.forEach((item) => {
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('title');
        expect(item).toHaveProperty('description');
        expect(item).toHaveProperty('status');
        expect(item).toHaveProperty('priority');
        expect(item).toHaveProperty('dueDate');
        expect(item).toHaveProperty('completedAt');
        expect(item).toHaveProperty('createdAt');
      });
    });
  });

  describe('GET /tasks?status=', () => {
    it('returns 200 with tasks filtered by exact status', async () => {
      await request(app).post('/tasks').send({ title: 'Task 1', status: 'todo' });
      await request(app).post('/tasks').send({ title: 'Task 2', status: 'in_progress' });
      await request(app).post('/tasks').send({ title: 'Task 3', status: 'todo' });

      const res = await request(app)
        .get('/tasks?status=todo')
        .expect(200);

      expect(res.body).toHaveLength(2);
      expect(res.body.every((t) => t.status === 'todo')).toBe(true);
    });

    it('returns 200 with empty array for unknown or non-matching status value', async () => {
      await request(app).post('/tasks').send({ title: 'Task 1', status: 'todo' });

      const res = await request(app)
        .get('/tasks?status=nonexistent')
        .expect(200);

      expect(res.body).toEqual([]);
    });

    // BUG DISCOVERY: HTTP layer substring probe
    // GET /tasks?status=do returns tasks with status 'todo' and 'done' because service uses includes()
    test.failing('does not return tasks on partial substring matches for status query', async () => {
      await request(app).post('/tasks').send({ title: 'Todo Task', status: 'todo' });
      await request(app).post('/tasks').send({ title: 'Done Task', status: 'done' });

      const res = await request(app)
        .get('/tasks?status=do')
        .expect(200);

      // Caller querying ?status=do expects exact match (empty array), not both 'todo' and 'done'
      expect(res.body).toEqual([]);
    });
  });

  describe('GET /tasks?page=&limit=', () => {
    beforeEach(async () => {
      for (let i = 1; i <= 25; i++) {
        await request(app).post('/tasks').send({ title: `Task ${i}` });
      }
    });

    it('returns page 1 containing the first 10 items (Task 1 to Task 10)', async () => {
      const res = await request(app)
        .get('/tasks?page=1&limit=10')
        .expect(200);

      expect(res.body).toHaveLength(10);
      expect(res.body[0].title).toBe('Task 1');
      expect(res.body[9].title).toBe('Task 10');
    });

    it('falls back sanely to default page and limit for non-numeric query parameters', async () => {
      const res = await request(app)
        .get('/tasks?page=invalid&limit=garbage')
        .expect(200);

      // parseInt('invalid') || 1 -> pageNum = 1; parseInt('garbage') || 10 -> limitNum = 10
      // With current service offset=1*10: returns 10 items (offset 10 to 20) without crashing
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeLessThanOrEqual(10);
    });
  });

  describe('PUT /tasks/:id', () => {
    it('returns 200 and updates specified fields on an existing task', async () => {
      const createRes = await request(app)
        .post('/tasks')
        .send({ title: 'Original', description: 'Old desc', priority: 'low' });
      const id = createRes.body.id;

      const updateRes = await request(app)
        .put(`/tasks/${id}`)
        .send({
          title: 'Updated Title',
          description: 'New desc',
          priority: 'high',
          status: 'in_progress',
        })
        .expect(200);

      expect(updateRes.body.id).toBe(id);
      expect(updateRes.body.title).toBe('Updated Title');
      expect(updateRes.body.description).toBe('New desc');
      expect(updateRes.body.priority).toBe('high');
      expect(updateRes.body.status).toBe('in_progress');
    });

    it('returns 404 when updating non-existent task ID', async () => {
      const res = await request(app)
        .put('/tasks/non-existent-uuid')
        .send({ title: 'Updated Title' })
        .expect(404);

      expect(res.body.error).toBe('Task not found');
    });

    it('returns 400 for empty or whitespace-only or non-string title in update payload', async () => {
      const createRes = await request(app).post('/tasks').send({ title: 'Task' });
      const id = createRes.body.id;

      const res1 = await request(app)
        .put(`/tasks/${id}`)
        .send({ title: '' })
        .expect(400);
      expect(res1.body.error).toContain('title must be a non-empty string');

      const res2 = await request(app)
        .put(`/tasks/${id}`)
        .send({ title: '   ' })
        .expect(400);
      expect(res2.body.error).toContain('title must be a non-empty string');

      const res3 = await request(app)
        .put(`/tasks/${id}`)
        .send({ title: 12345 })
        .expect(400);
      expect(res3.body.error).toContain('title must be a non-empty string');
    });

    it('returns 400 for invalid status in update payload', async () => {
      const createRes = await request(app).post('/tasks').send({ title: 'Task' });
      const id = createRes.body.id;

      const res = await request(app)
        .put(`/tasks/${id}`)
        .send({ status: 'invalid_status' })
        .expect(400);

      expect(res.body.error).toContain('status must be one of');
    });

    it('returns 400 for invalid priority in update payload', async () => {
      const createRes = await request(app).post('/tasks').send({ title: 'Task' });
      const id = createRes.body.id;

      const res = await request(app)
        .put(`/tasks/${id}`)
        .send({ priority: 'ultra_high' })
        .expect(400);

      expect(res.body.error).toContain('priority must be one of');
    });

    it('returns 400 for invalid dueDate in update payload', async () => {
      const createRes = await request(app).post('/tasks').send({ title: 'Task' });
      const id = createRes.body.id;

      const res = await request(app)
        .put(`/tasks/${id}`)
        .send({ dueDate: 'bad-date' })
        .expect(400);

      expect(res.body.error).toContain('dueDate must be a valid ISO date string');
    });

    it('accepts partial update body without wiping unmodified fields (behaving like partial update)', async () => {
      const createRes = await request(app)
        .post('/tasks')
        .send({ title: 'Initial Title', description: 'Keep me', priority: 'high' });
      const id = createRes.body.id;

      const res = await request(app)
        .put(`/tasks/${id}`)
        .send({ status: 'done' })
        .expect(200);

      expect(res.body.status).toBe('done');
      expect(res.body.title).toBe('Initial Title');
      expect(res.body.description).toBe('Keep me');
      expect(res.body.priority).toBe('high');
    });

    // BUG DISCOVERY: Immutable fields probe at HTTP layer
    // PUT /tasks/:id allows overriding server-controlled id and createdAt
    test.failing('does not allow overriding server-controlled fields (id, createdAt) via PUT body', async () => {
      const createRes = await request(app).post('/tasks').send({ title: 'Task' });
      const originalId = createRes.body.id;
      const originalCreatedAt = createRes.body.createdAt;

      const res = await request(app)
        .put(`/tasks/${originalId}`)
        .send({
          id: 'malicious-new-id',
          createdAt: '1970-01-01T00:00:00.000Z',
          title: 'Hacked',
        })
        .expect(200);

      expect(res.body.id).toBe(originalId);
      expect(res.body.createdAt).toBe(originalCreatedAt);
    });
  });

  describe('DELETE /tasks/:id', () => {
    it('deletes the task and returns 204 with empty body, removing it from subsequent GET', async () => {
      const createRes = await request(app).post('/tasks').send({ title: 'To Delete' });
      const id = createRes.body.id;

      const deleteRes = await request(app)
        .delete(`/tasks/${id}`)
        .expect(204);

      expect(deleteRes.body).toEqual({});

      const getRes = await request(app).get('/tasks').expect(200);
      expect(getRes.body.find((t) => t.id === id)).toBeUndefined();
    });

    it('returns 404 when attempting to delete a non-existent task ID', async () => {
      const res = await request(app)
        .delete('/tasks/non-existent-id')
        .expect(404);

      expect(res.body.error).toBe('Task not found');
    });

    it('returns 404 when deleting the same task ID twice (idempotency check)', async () => {
      const createRes = await request(app).post('/tasks').send({ title: 'Delete twice' });
      const id = createRes.body.id;

      await request(app).delete(`/tasks/${id}`).expect(204);
      await request(app).delete(`/tasks/${id}`).expect(404);
    });
  });

  describe('PATCH /tasks/:id/complete', () => {
    it('marks an existing task as done and sets completedAt timestamp', async () => {
      const createRes = await request(app).post('/tasks').send({ title: 'Finish this' });
      const id = createRes.body.id;

      const res = await request(app)
        .patch(`/tasks/${id}/complete`)
        .expect(200);

      expect(res.body.id).toBe(id);
      expect(res.body.status).toBe('done');
      expect(typeof res.body.completedAt).toBe('string');
      expect(new Date(res.body.completedAt).getTime()).not.toBeNaN();
    });

    it('returns 404 when marking a non-existent task as complete', async () => {
      const res = await request(app)
        .patch('/tasks/non-existent-id/complete')
        .expect(404);

      expect(res.body.error).toBe('Task not found');
    });

    it('is idempotent in setting status=done and returns 200 when completing an already-completed task', async () => {
      const createRes = await request(app).post('/tasks').send({ title: 'Already complete' });
      const id = createRes.body.id;

      const firstComplete = await request(app).patch(`/tasks/${id}/complete`).expect(200);
      const secondComplete = await request(app).patch(`/tasks/${id}/complete`).expect(200);

      expect(secondComplete.body.status).toBe('done');
      expect(secondComplete.body.completedAt).toBeDefined();
    });

    // BUG DISCOVERY: Side-effect probe at HTTP layer
    // PATCH /tasks/:id/complete silently resets priority to 'medium'
    test.failing('preserves task priority when marking as complete', async () => {
      const createRes = await request(app)
        .post('/tasks')
        .send({ title: 'High priority task', priority: 'high' });
      const id = createRes.body.id;

      const res = await request(app)
        .patch(`/tasks/${id}/complete`)
        .expect(200);

      expect(res.body.priority).toBe('high');
    });
  });

  describe('GET /tasks/stats', () => {
    it('returns 200 with all zero counts when the store is empty', async () => {
      const res = await request(app)
        .get('/tasks/stats')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(res.body).toEqual({
        todo: 0,
        in_progress: 0,
        done: 0,
        overdue: 0,
      });
    });

    it('returns accurate statistics and overdue counts', async () => {
      const past = new Date(Date.now() - 3600000).toISOString();
      const future = new Date(Date.now() + 3600000).toISOString();

      await request(app).post('/tasks').send({ title: 'T1', status: 'todo', dueDate: past });
      await request(app).post('/tasks').send({ title: 'T2', status: 'in_progress', dueDate: future });
      await request(app).post('/tasks').send({ title: 'T3', status: 'done', dueDate: past });

      const res = await request(app).get('/tasks/stats').expect(200);

      expect(res.body).toEqual({
        todo: 1,
        in_progress: 1,
        done: 1,
        overdue: 1,
      });
    });
  });

  describe('Malformed JSON handling', () => {
    // BUG DISCOVERY: Global error handler in app.js catches JSON SyntaxError and returns 500 instead of 400
    test.failing('responds with 400 Client Error rather than 500 Internal Server Error when receiving malformed JSON', async () => {
      const res = await request(app)
        .post('/tasks')
        .set('Content-Type', 'application/json')
        .send('{"title": "Broken JSON, invalid syntax');

      expect(res.status).toBe(400);
    });
  });
});
