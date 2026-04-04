const request = require('supertest');
const path = require('path');
const { spawn } = require('child_process');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

describe('Tasks API', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('GET /', () => {
    it('returns a basic welcome response', async () => {
      const res = await request(app).get('/');

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ message: 'Task API is running' });
    });
  });

  describe('GET /health', () => {
    it('returns service health status', async () => {
      const res = await request(app).get('/health');

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ status: 'ok' });
    });
  });

  describe('GET /tasks', () => {
    it('returns all tasks', async () => {
      taskService.create({ title: 'Task A' });
      taskService.create({ title: 'Task B' });

      const res = await request(app).get('/tasks');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body.map((t) => t.title)).toEqual(expect.arrayContaining(['Task A', 'Task B']));
    });

    it('filters by status query', async () => {
      taskService.create({ title: 'Todo task', status: 'todo' });
      taskService.create({ title: 'Done task', status: 'done' });

      const res = await request(app).get('/tasks?status=done');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe('Done task');
    });

    it('returns 400 for invalid status query', async () => {
      taskService.create({ title: 'Todo task', status: 'todo' });

      const res = await request(app).get('/tasks?status=in_');

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('status must be one of: todo, in_progress, done');
    });

    it('returns paginated tasks when page and limit are provided', async () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });
      taskService.create({ title: 'Task 3' });

      const res = await request(app).get('/tasks?page=1&limit=2');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body.map((t) => t.title)).toEqual(['Task 1', 'Task 2']);
    });

    it('uses default pagination values when page/limit are invalid', async () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });
      taskService.create({ title: 'Task 3' });

      const res = await request(app).get('/tasks?page=abc&limit=xyz');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveLength(3);
      expect(res.body.map((t) => t.title)).toEqual(['Task 1', 'Task 2', 'Task 3']);
    });
  });

  describe('GET /tasks/stats', () => {
    it('returns status and overdue stats', async () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      taskService.create({ title: 'Todo overdue', status: 'todo', dueDate: pastDate });
      taskService.create({ title: 'In progress task', status: 'in_progress' });
      taskService.create({ title: 'Done task', status: 'done' });

      const res = await request(app).get('/tasks/stats');

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({
        todo: 1,
        in_progress: 1,
        done: 1,
        overdue: 1,
      });
    });
  });

  describe('POST /tasks', () => {
    it('creates a task with valid input', async () => {
      const payload = {
        title: 'New task',
        description: 'Some description',
        status: 'todo',
        priority: 'high',
      };

      const res = await request(app).post('/tasks').send(payload);

      expect(res.statusCode).toBe(201);
      expect(res.body).toMatchObject({
        title: 'New task',
        description: 'Some description',
        status: 'todo',
        priority: 'high',
        assignee: null,
      });
      expect(res.body.id).toBeDefined();
      expect(res.body.createdAt).toBeDefined();
      expect(res.body.completedAt).toBeNull();
    });

    it('returns 400 when title is missing', async () => {
      const res = await request(app).post('/tasks').send({ description: 'Missing title' });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('title is required and must be a non-empty string');
    });

    it('returns 400 for invalid status', async () => {
      const res = await request(app).post('/tasks').send({ title: 'Bad status', status: 'blocked' });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('status must be one of: todo, in_progress, done');
    });

    it('returns 400 for invalid priority', async () => {
      const res = await request(app).post('/tasks').send({ title: 'Bad priority', priority: 'urgent' });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('priority must be one of: low, medium, high');
    });

    it('returns 400 for invalid dueDate', async () => {
      const res = await request(app).post('/tasks').send({ title: 'Bad date', dueDate: 'not-a-date' });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('dueDate must be a valid ISO date string');
    });
  });

  describe('PUT /tasks/:id', () => {
    it('updates an existing task', async () => {
      const existing = taskService.create({ title: 'Initial title', status: 'todo', priority: 'low' });

      const res = await request(app).put(`/tasks/${existing.id}`).send({
        title: 'Updated title',
        status: 'in_progress',
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({
        id: existing.id,
        title: 'Updated title',
        status: 'in_progress',
        priority: 'low',
      });
    });

    it('returns 400 for invalid update payload', async () => {
      const existing = taskService.create({ title: 'Initial title' });

      const res = await request(app).put(`/tasks/${existing.id}`).send({ title: '' });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('title must be a non-empty string');
    });

    it('returns 400 for invalid update status', async () => {
      const existing = taskService.create({ title: 'Initial title' });

      const res = await request(app).put(`/tasks/${existing.id}`).send({ status: 'blocked' });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('status must be one of: todo, in_progress, done');
    });

    it('returns 400 for invalid update priority', async () => {
      const existing = taskService.create({ title: 'Initial title' });

      const res = await request(app).put(`/tasks/${existing.id}`).send({ priority: 'urgent' });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('priority must be one of: low, medium, high');
    });

    it('returns 400 for invalid update dueDate', async () => {
      const existing = taskService.create({ title: 'Initial title' });

      const res = await request(app).put(`/tasks/${existing.id}`).send({ dueDate: 'not-a-date' });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('dueDate must be a valid ISO date string');
    });

    it('returns 404 when task does not exist', async () => {
      const res = await request(app).put('/tasks/non-existent-id').send({ title: 'Will fail' });

      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });
  });

  describe('DELETE /tasks/:id', () => {
    it('deletes an existing task', async () => {
      const existing = taskService.create({ title: 'Delete me' });

      const res = await request(app).delete(`/tasks/${existing.id}`);

      expect(res.statusCode).toBe(204);
      expect(res.body).toEqual({});
      expect(taskService.findById(existing.id)).toBeUndefined();
    });

    it('returns 404 when task does not exist', async () => {
      const res = await request(app).delete('/tasks/non-existent-id');

      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });
  });

  describe('PATCH /tasks/:id/complete', () => {
    it('marks a task as complete', async () => {
      const existing = taskService.create({
        title: 'Complete me',
        status: 'in_progress',
        priority: 'high',
      });

      const res = await request(app).patch(`/tasks/${existing.id}/complete`);

      expect(res.statusCode).toBe(200);
      expect(res.body.id).toBe(existing.id);
      expect(res.body.status).toBe('done');
      expect(res.body.priority).toBe('high');
      expect(res.body.completedAt).toBeDefined();
    });

    it('returns 404 when task does not exist', async () => {
      const res = await request(app).patch('/tasks/non-existent-id/complete');

      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });
  });

  describe('PATCH /tasks/:id/assign', () => {
    it('assigns a task when valid assignee is provided', async () => {
      const existing = taskService.create({ title: 'Assign me' });

      const res = await request(app)
        .patch(`/tasks/${existing.id}/assign`)
        .send({ assignee: 'Amit' });

      expect(res.statusCode).toBe(200);
      expect(res.body.id).toBe(existing.id);
      expect(res.body.assignee).toBe('Amit');
    });

    it('returns 400 when assignee is missing', async () => {
      const existing = taskService.create({ title: 'Assign me' });

      const res = await request(app)
        .patch(`/tasks/${existing.id}/assign`)
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('assignee is required and must be a non-empty string');
    });

    it('returns 400 when assignee is empty', async () => {
      const existing = taskService.create({ title: 'Assign me' });

      const res = await request(app)
        .patch(`/tasks/${existing.id}/assign`)
        .send({ assignee: '   ' });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('assignee is required and must be a non-empty string');
    });

    it('returns 404 when task does not exist', async () => {
      const res = await request(app)
        .patch('/tasks/non-existent-id/assign')
        .send({ assignee: 'Amit' });

      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });

    it('returns 409 when task is already assigned', async () => {
      const existing = taskService.create({ title: 'Assign me', assignee: 'John' });

      const res = await request(app)
        .patch(`/tasks/${existing.id}/assign`)
        .send({ assignee: 'Amit' });

      expect(res.statusCode).toBe(409);
      expect(res.body.error).toBe('Task is already assigned');
    });
  });

  describe('App middleware and startup', () => {
    it('returns 500 for malformed json body (error middleware)', async () => {
      const logSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const res = await request(app)
        .post('/tasks')
        .set('Content-Type', 'application/json')
        .send('{"title":"broken-json"');

      expect(res.statusCode).toBe(500);
      expect(res.body).toEqual({ error: 'Internal server error' });
      expect(logSpy).toHaveBeenCalled();

      logSpy.mockRestore();
    });

    it('starts server when app.js is run directly', async () => {
      const appPath = path.join(__dirname, '../src/app.js');

      await new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [appPath], {
          env: { ...process.env, PORT: '0' },
          cwd: path.join(__dirname, '..'),
        });

        let output = '';

        const finish = () => {
          child.kill();
          resolve();
        };

        const timeout = setTimeout(() => {
          child.kill();
          reject(new Error('Timed out waiting for app startup log'));
        }, 2000);

        child.stdout.on('data', (chunk) => {
          output += chunk.toString();
          if (output.includes('Task API running on port')) {
            clearTimeout(timeout);
            finish();
          }
        });

        child.stderr.on('data', () => {
          clearTimeout(timeout);
          child.kill();
          reject(new Error('app.js wrote to stderr during startup test'));
        });

        child.on('error', (err) => {
          clearTimeout(timeout);
          reject(err);
        });

        child.on('exit', () => {
          if (!output.includes('Task API running on port')) {
            clearTimeout(timeout);
            reject(new Error('app.js exited before startup log was emitted'));
          }
        });
      });
    });
  });
});