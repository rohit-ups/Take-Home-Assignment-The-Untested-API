const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

describe('Task API routes', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('GET /tasks', () => {
    it('returns all tasks', async () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });

      const res = await request(app).get('/tasks');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });

    it('filters by exact status', async () => {
      taskService.create({ title: 'Todo Task', status: 'todo' });
      taskService.create({ title: 'Done Task', status: 'done' });

      const res = await request(app).get('/tasks?status=todo');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe('Todo Task');
    });

    it('returns paginated tasks when page and limit are provided', async () => {
      for (let i = 0; i < 12; i++) {
        taskService.create({ title: `Task ${i}` });
      }

      const res = await request(app).get('/tasks?page=1&limit=10');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(10);
      expect(res.body[0].title).toBe('Task 0');
    });
  });

  describe('POST /tasks', () => {
    it('creates a task when payload is valid', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'New Task', priority: 'high' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.title).toBe('New Task');
    });

    it('returns 400 when title is missing', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ priority: 'high' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });
  });

  describe('PUT /tasks/:id', () => {
    it('updates an existing task', async () => {
      const task = taskService.create({ title: 'Old Title' });
      const res = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ title: 'New Title' });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('New Title');
    });

    it('returns 404 for unknown id', async () => {
      const res = await request(app)
        .put('/tasks/invalid-id')
        .send({ title: 'Updated' });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /tasks/:id', () => {
    it('deletes a task and returns 204', async () => {
      const task = taskService.create({ title: 'To Delete' });
      const res = await request(app).delete(`/tasks/${task.id}`);

      expect(res.status).toBe(204);
      expect(taskService.findById(task.id)).toBeUndefined();
    });
  });

  describe('PATCH /tasks/:id/complete', () => {
    it('marks a task as done', async () => {
      const task = taskService.create({ title: 'To Complete' });
      const res = await request(app).patch(`/tasks/${task.id}/complete`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('done');
    });
  });

  describe('GET /tasks/stats', () => {
    it('returns stats summary', async () => {
      taskService.create({ title: 'A', status: 'todo' });
      const res = await request(app).get('/tasks/stats');

      expect(res.status).toBe(200);
      expect(res.body.todo).toBe(1);
    });
  });
});
