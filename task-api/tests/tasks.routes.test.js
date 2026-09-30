const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

describe('Task API Route Integration Tests', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('GET /tasks/stats', () => {
    it('returns stats object with counts and overdue total', async () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString();
      taskService.create({ title: 'Task 1', status: 'todo', dueDate: pastDate });
      taskService.create({ title: 'Task 2', status: 'in_progress' });
      taskService.create({ title: 'Task 3', status: 'done' });

      const res = await request(app).get('/tasks/stats');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        todo: 1,
        in_progress: 1,
        done: 1,
        overdue: 1,
      });
    });

    it('returns zero counts when no tasks exist', async () => {
      const res = await request(app).get('/tasks/stats');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        todo: 0,
        in_progress: 0,
        done: 0,
        overdue: 0,
      });
    });
  });

  describe('GET /tasks', () => {
    it('returns all tasks when no query params are provided', async () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });

      const res = await request(app).get('/tasks');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
    });

    it('filters tasks by valid status parameter', async () => {
      taskService.create({ title: 'Todo', status: 'todo' });
      taskService.create({ title: 'Done', status: 'done' });

      const res = await request(app).get('/tasks?status=todo');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].title).toBe('Todo');
    });

    it('returns empty array when status filter matches no tasks', async () => {
      taskService.create({ title: 'Todo', status: 'todo' });

      const res = await request(app).get('/tasks?status=in_progress');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it.failing('BUG-2: GET /tasks?status=do should not return todo/done tasks via substring match', async () => {
      taskService.create({ title: 'Todo', status: 'todo' });
      taskService.create({ title: 'Done', status: 'done' });

      const res = await request(app).get('/tasks?status=do');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('BUG-1 [FIXED]: GET /tasks?page=1&limit=2 should return first 2 items of page 1', async () => {
      taskService.create({ title: 'T1' });
      taskService.create({ title: 'T2' });
      taskService.create({ title: 'T3' });

      const res = await request(app).get('/tasks?page=1&limit=2');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
      expect(res.body[0].title).toBe('T1');
      expect(res.body[1].title).toBe('T2');
    });

    it('handles pagination beyond available items', async () => {
      taskService.create({ title: 'T1' });

      const res = await request(app).get('/tasks?page=10&limit=5');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it.failing('BUG-6: GET /tasks?limit=0 should return empty array instead of defaulting to limit 10', async () => {
      taskService.create({ title: 'T1' });
      const res = await request(app).get('/tasks?page=1&limit=0');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('handles negative or huge page/limit parameters without crashing', async () => {
      taskService.create({ title: 'T1' });

      const resNegative = await request(app).get('/tasks?page=-1&limit=-5');
      expect(resNegative.status).toBe(200);

      const resHuge = await request(app).get('/tasks?page=1&limit=1000000');
      expect(resHuge.status).toBe(200);
      expect(resHuge.body.length).toBe(1);
    });

    it('falls back gracefully to default pagination values when page/limit are non-numeric', async () => {
      taskService.create({ title: 'T1' });

      const res = await request(app).get('/tasks?page=invalid&limit=abc');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('POST /tasks', () => {
    it.failing('BUG-7: POST /tasks should reject non-string description with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'Valid Title', description: 12345 });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/description/i);
    });
    it('creates a task with valid minimal payload (201 Created)', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'New Task' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.title).toBe('New Task');
      expect(res.body.status).toBe('todo');
      expect(res.body.priority).toBe('medium');
    });

    it('creates a task with valid complete payload', async () => {
      const dueDate = new Date().toISOString();
      const res = await request(app)
        .post('/tasks')
        .send({
          title: 'Full Task',
          description: 'Detailed description',
          status: 'in_progress',
          priority: 'high',
          dueDate,
        });

      expect(res.status).toBe(201);
      expect(res.body.description).toBe('Detailed description');
      expect(res.body.status).toBe('in_progress');
      expect(res.body.priority).toBe('high');
      expect(res.body.dueDate).toBe(dueDate);
    });

    it('rejects creation when title is missing (400)', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ priority: 'high' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('rejects creation when title is empty string or whitespace (400)', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/title/i);
    });

    it('rejects creation when title is not a string (400)', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 12345 });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/title/i);
    });

    it('rejects creation when status is invalid enum (400)', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'Valid Title', status: 'pending' }); // 'pending' is invalid; valid: todo|in_progress|done

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/status/i);
    });

    it('rejects creation when priority is invalid enum (400)', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'Valid Title', priority: 'urgent' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/priority/i);
    });

    it('rejects creation when dueDate is an invalid date string (400)', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'Valid Title', dueDate: 'not-a-date' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/dueDate/i);
    });
  });

  describe('PUT /tasks/:id', () => {
    it('updates task with valid payload (200 OK)', async () => {
      const created = taskService.create({ title: 'Original' });

      const res = await request(app)
        .put(`/tasks/${created.id}`)
        .send({ title: 'Updated', priority: 'high' });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Updated');
      expect(res.body.priority).toBe('high');
    });

    it('returns 404 when updating non-existent task ID', async () => {
      const res = await request(app)
        .put('/tasks/00000000-0000-0000-0000-000000000000')
        .send({ title: 'Updated' });

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Task not found' });
    });

    it('returns 400 when title is empty string', async () => {
      const created = taskService.create({ title: 'Original' });

      const res = await request(app)
        .put(`/tasks/${created.id}`)
        .send({ title: '' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/title/i);
    });

    it('returns 400 when status is invalid enum value', async () => {
      const created = taskService.create({ title: 'Original' });

      const res = await request(app)
        .put(`/tasks/${created.id}`)
        .send({ status: 'invalid_status' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/status/i);
    });

    it('returns 400 when priority is invalid enum value', async () => {
      const created = taskService.create({ title: 'Original' });

      const res = await request(app)
        .put(`/tasks/${created.id}`)
        .send({ priority: 'invalid_priority' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/priority/i);
    });

    it('returns 400 when dueDate is invalid ISO date string', async () => {
      const created = taskService.create({ title: 'Original' });

      const res = await request(app)
        .put(`/tasks/${created.id}`)
        .send({ dueDate: 'invalid_date' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/dueDate/i);
    });

    it.failing('BUG-7: PUT /tasks/:id should reject non-string description with 400 Bad Request', async () => {
      const created = taskService.create({ title: 'Original' });

      const res = await request(app)
        .put(`/tasks/${created.id}`)
        .send({ description: 12345 });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/description/i);
    });
  });

  describe('PATCH /tasks/:id/complete', () => {
    it('marks task as completed (200 OK)', async () => {
      const created = taskService.create({ title: 'Incomplete' });

      const res = await request(app)
        .patch(`/tasks/${created.id}/complete`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('done');
      expect(res.body.completedAt).not.toBeNull();
    });

    it('returns 404 when completing non-existent task ID', async () => {
      const res = await request(app)
        .patch('/tasks/non-existent-id/complete');

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Task not found' });
    });

    it.failing('BUG-3: PATCH /tasks/:id/complete should preserve task priority', async () => {
      const created = taskService.create({ title: 'High priority task', priority: 'high' });

      const res = await request(app)
        .patch(`/tasks/${created.id}/complete`);

      expect(res.status).toBe(200);
      expect(res.body.priority).toBe('high');
    });
  });

  describe('DELETE /tasks/:id', () => {
    it('deletes existing task (204 No Content)', async () => {
      const created = taskService.create({ title: 'To delete' });

      const res = await request(app).delete(`/tasks/${created.id}`);
      expect(res.status).toBe(204);
      expect(res.text).toBe('');

      // Verify task is gone
      const checkRes = await request(app).get('/tasks');
      expect(checkRes.body).toEqual([]);
    });

    it('returns 404 when deleting non-existent task ID or deleting twice', async () => {
      const created = taskService.create({ title: 'Delete once' });

      const res1 = await request(app).delete(`/tasks/${created.id}`);
      expect(res1.status).toBe(204);

      const res2 = await request(app).delete(`/tasks/${created.id}`);
      expect(res2.status).toBe(404);
      expect(res2.body).toEqual({ error: 'Task not found' });
    });
  });

  describe('PATCH /tasks/:id/assign', () => {
    it('assigns task to a user and returns updated task (200 OK)', async () => {
      const created = taskService.create({ title: 'Assignee test' });

      const res = await request(app)
        .patch(`/tasks/${created.id}/assign`)
        .send({ assignee: 'Jane Doe' });

      expect(res.status).toBe(200);
      expect(res.body.assignee).toBe('Jane Doe');
      expect(res.body.title).toBe('Assignee test');

      // Verify visible in GET /tasks
      const getRes = await request(app).get('/tasks');
      expect(getRes.body[0].assignee).toBe('Jane Doe');
    });

    it('trims leading and trailing whitespace from assignee string', async () => {
      const created = taskService.create({ title: 'Trim test' });

      const res = await request(app)
        .patch(`/tasks/${created.id}/assign`)
        .send({ assignee: '   John Smith   ' });

      expect(res.status).toBe(200);
      expect(res.body.assignee).toBe('John Smith');
    });

    it('allows reassignment to a different user', async () => {
      const created = taskService.create({ title: 'Reassign test' });

      await request(app)
        .patch(`/tasks/${created.id}/assign`)
        .send({ assignee: 'First User' });

      const res = await request(app)
        .patch(`/tasks/${created.id}/assign`)
        .send({ assignee: 'Second User' });

      expect(res.status).toBe(200);
      expect(res.body.assignee).toBe('Second User');
    });

    it('handles assigning to the same user idempotently', async () => {
      const created = taskService.create({ title: 'Same user test' });

      await request(app)
        .patch(`/tasks/${created.id}/assign`)
        .send({ assignee: 'Alice' });

      const res = await request(app)
        .patch(`/tasks/${created.id}/assign`)
        .send({ assignee: 'Alice' });

      expect(res.status).toBe(200);
      expect(res.body.assignee).toBe('Alice');
    });

    it('preserves other task fields untouched when assigning', async () => {
      const created = taskService.create({ title: 'Preserve fields', priority: 'high', status: 'in_progress' });

      const res = await request(app)
        .patch(`/tasks/${created.id}/assign`)
        .send({ assignee: 'Bob' });

      expect(res.status).toBe(200);
      expect(res.body.assignee).toBe('Bob');
      expect(res.body.title).toBe('Preserve fields');
      expect(res.body.priority).toBe('high');
      expect(res.body.status).toBe('in_progress');
    });

    it('ensures PUT /tasks/:id does not wipe assignee field', async () => {
      const created = taskService.create({ title: 'Initial' });
      taskService.assignTask(created.id, 'Alice');

      const res = await request(app)
        .put(`/tasks/${created.id}`)
        .send({ title: 'Updated Title' });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Updated Title');
      expect(res.body.assignee).toBe('Alice');
    });

    it('returns 404 for unknown task ID', async () => {
      const res = await request(app)
        .patch('/tasks/non-existent-id/assign')
        .send({ assignee: 'Alice' });

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Task not found' });
    });

    it('returns 400 when body or assignee field is missing', async () => {
      const created = taskService.create({ title: 'Missing assignee' });

      const res = await request(app)
        .patch(`/tasks/${created.id}/assign`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/assignee/i);
    });

    it('returns 400 when assignee is empty string', async () => {
      const created = taskService.create({ title: 'Empty assignee' });

      const res = await request(app)
        .patch(`/tasks/${created.id}/assign`)
        .send({ assignee: '' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/assignee/i);
    });

    it('returns 400 when assignee is whitespace-only string', async () => {
      const created = taskService.create({ title: 'Whitespace assignee' });

      const res = await request(app)
        .patch(`/tasks/${created.id}/assign`)
        .send({ assignee: '    ' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/assignee/i);
    });

    it('returns 400 when assignee is non-string (number, null, array, object)', async () => {
      const created = taskService.create({ title: 'Non-string assignee' });

      const cases = [123, null, ['Alice'], { name: 'Alice' }];
      for (const invalidValue of cases) {
        const res = await request(app)
          .patch(`/tasks/${created.id}/assign`)
          .send({ assignee: invalidValue });

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/assignee/i);
      }
    });

    it('returns 400 when assignee exceeds maximum length of 100 characters', async () => {
      const created = taskService.create({ title: 'Too long assignee' });

      const res = await request(app)
        .patch(`/tasks/${created.id}/assign`)
        .send({ assignee: 'a'.repeat(101) });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/assignee/i);
    });
  });
});
