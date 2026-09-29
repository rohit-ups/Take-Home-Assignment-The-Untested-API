const request = require('supertest');
const app = require('../../src/app');
const taskService = require('../../src/services/taskService');

describe('Task API Integration Tests (/tasks)', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('GET /tasks/stats', () => {
    test('returns correct task statistics', async () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString();
      taskService.create({ title: 'Task 1', status: 'todo', dueDate: pastDate });
      taskService.create({ title: 'Task 2', status: 'in_progress' });

      const response = await request(app).get('/tasks/stats');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        todo: 1,
        in_progress: 1,
        done: 0,
        overdue: 1,
      });
    });
  });

  describe('GET /tasks', () => {
    test('returns empty list when no tasks exist', async () => {
      const response = await request(app).get('/tasks');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    test('returns all tasks when no filters are supplied', async () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });

      const response = await request(app).get('/tasks');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
    });

    test('filters tasks by status query param', async () => {
      taskService.create({ title: 'Task 1', status: 'todo' });
      taskService.create({ title: 'Task 2', status: 'done' });

      const response = await request(app).get('/tasks?status=todo');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].title).toBe('Task 1');
    });

    test('exposes BUG-02 pagination flaw where page=1 skips items', async () => {
      taskService.create({ title: 'Task 1' });

      const response = await request(app).get('/tasks?page=1&limit=10');

      expect(response.status).toBe(200);
      // Demonstrates BUG-02: returns empty array because page=1 calculates offset=10
      expect(response.body).toEqual([]);
    });
  });

  describe('POST /tasks', () => {
    test('creates a task with valid payload (201 Created)', async () => {
      const payload = {
        title: 'New Integration Task',
        description: 'Testing POST endpoint',
        priority: 'high',
      };

      const response = await request(app).post('/tasks').send(payload);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe('New Integration Task');
      expect(response.body.priority).toBe('high');
      expect(response.body.status).toBe('todo');
    });

    test('returns 400 Bad Request when title is missing', async () => {
      const response = await request(app).post('/tasks').send({ priority: 'high' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('title is required');
    });

    test('returns 400 Bad Request when status is invalid', async () => {
      const response = await request(app).post('/tasks').send({
        title: 'Task',
        status: 'invalid_status',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('status must be one of');
    });

    test('returns 400 Bad Request when priority is invalid', async () => {
      const response = await request(app).post('/tasks').send({
        title: 'Task',
        priority: 'ultra',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('priority must be one of');
    });

    test('returns 400 Bad Request when dueDate is invalid', async () => {
      const response = await request(app).post('/tasks').send({
        title: 'Task',
        dueDate: 'bad-date',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('dueDate must be a valid ISO date string');
    });
  });

  describe('PUT /tasks/:id', () => {
    test('updates existing task (200 OK)', async () => {
      const created = taskService.create({ title: 'Task to Update', status: 'todo' });

      const response = await request(app)
        .put(`/tasks/${created.id}`)
        .send({ title: 'Updated Title', status: 'in_progress' });

      expect(response.status).toBe(200);
      expect(response.body.title).toBe('Updated Title');
      expect(response.body.status).toBe('in_progress');
    });

    test('returns 404 Not Found for non-existent task id', async () => {
      const response = await request(app)
        .put('/tasks/00000000-0000-0000-0000-000000000000')
        .send({ title: 'New Title' });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Task not found' });
    });

    test('returns 400 Bad Request for invalid field values in update', async () => {
      const created = taskService.create({ title: 'Task' });

      const response = await request(app)
        .put(`/tasks/${created.id}`)
        .send({ priority: 'invalid_priority' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('priority must be one of');
    });
  });

  describe('DELETE /tasks/:id', () => {
    test('deletes existing task (204 No Content)', async () => {
      const created = taskService.create({ title: 'Task to delete' });

      const response = await request(app).delete(`/tasks/${created.id}`);

      expect(response.status).toBe(204);
      expect(response.text).toBe('');

      // Verify task is removed
      expect(taskService.findById(created.id)).toBeUndefined();
    });

    test('returns 404 Not Found when deleting non-existent task id', async () => {
      const response = await request(app).delete('/tasks/non-existent-id');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Task not found' });
    });
  });

  describe('PATCH /tasks/:id/complete', () => {
    test('marks task as completed (200 OK)', async () => {
      const created = taskService.create({ title: 'Task to mark complete' });

      const response = await request(app).patch(`/tasks/${created.id}/complete`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('done');
      expect(response.body.completedAt).not.toBeNull();
    });

    test('returns 404 Not Found for non-existent task id', async () => {
      const response = await request(app).patch('/tasks/non-existent-id/complete');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Task not found' });
    });
  });

  describe('PATCH /tasks/:id/assign', () => {
    test('assigns task to a user and trims whitespace (200 OK)', async () => {
      const created = taskService.create({ title: 'Task to assign' });

      const response = await request(app)
        .patch(`/tasks/${created.id}/assign`)
        .send({ assignee: '  Alice Smith  ' });

      expect(response.status).toBe(200);
      expect(response.body.assignee).toBe('Alice Smith');
      expect(response.body.title).toBe('Task to assign');
    });

    test('returns 400 Bad Request when assignee is missing or empty string', async () => {
      const created = taskService.create({ title: 'Task' });

      const res1 = await request(app).patch(`/tasks/${created.id}/assign`).send({});
      expect(res1.status).toBe(400);
      expect(res1.body.error).toContain('assignee is required');

      const res2 = await request(app).patch(`/tasks/${created.id}/assign`).send({ assignee: '   ' });
      expect(res2.status).toBe(400);
      expect(res2.body.error).toContain('assignee is required');
    });

    test('returns 404 Not Found when assigning a non-existent task id', async () => {
      const response = await request(app)
        .patch('/tasks/non-existent-id/assign')
        .send({ assignee: 'Alice' });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Task not found' });
    });
  });
});
