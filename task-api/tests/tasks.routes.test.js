const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

describe('tasks routes', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('GET /tasks', () => {
    it('returns all tasks when no query params are provided', async () => {
      const first = taskService.create({ title: 'First task' });
      const second = taskService.create({ title: 'Second task' });

      const response = await request(app).get('/tasks');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([first, second]);
    });

    it('filters tasks by exact status', async () => {
      const todoTask = taskService.create({ title: 'Todo task', status: 'todo' });
      taskService.create({ title: 'Done task', status: 'done' });

      const response = await request(app).get('/tasks').query({ status: 'todo' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual([todoTask]);
    });

    it('does not return tasks for a partial status query', async () => {
      taskService.create({ title: 'In progress task', status: 'in_progress' });

      const response = await request(app).get('/tasks').query({ status: 'progress' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('returns the first page of results for page=1', async () => {
      const first = taskService.create({ title: 'First task' });
      const second = taskService.create({ title: 'Second task' });
      taskService.create({ title: 'Third task' });

      const response = await request(app).get('/tasks').query({ page: 1, limit: 2 });

      expect(response.status).toBe(200);
      expect(response.body).toEqual([first, second]);
    });

    it('falls back to default pagination values for invalid query params', async () => {
      const first = taskService.create({ title: 'First task' });
      const second = taskService.create({ title: 'Second task' });

      const response = await request(app).get('/tasks').query({ page: 'abc', limit: 'xyz' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual([first, second]);
    });
  });

  describe('GET /tasks/stats', () => {
    it('returns counts by status and overdue tasks', async () => {
      taskService.create({
        title: 'Todo overdue',
        status: 'todo',
        dueDate: '2000-01-01T00:00:00.000Z',
      });
      taskService.create({
        title: 'In progress future',
        status: 'in_progress',
        dueDate: '2100-01-01T00:00:00.000Z',
      });
      taskService.create({
        title: 'Done past',
        status: 'done',
        dueDate: '2000-01-01T00:00:00.000Z',
      });

      const response = await request(app).get('/tasks/stats');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        todo: 1,
        in_progress: 1,
        done: 1,
        overdue: 1,
      });
    });
  });

  describe('POST /tasks', () => {
    it('creates a task with defaults', async () => {
      const response = await request(app).post('/tasks').send({ title: 'Write tests' });

      expect(response.status).toBe(201);
      expect(response.body).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          title: 'Write tests',
          description: '',
          status: 'todo',
          priority: 'medium',
          dueDate: null,
          assignee: null,
          completedAt: null,
          createdAt: expect.any(String),
        })
      );
      expect(taskService.getAll()).toHaveLength(1);
    });

    it('creates a task with custom values', async () => {
      const response = await request(app).post('/tasks').send({
        title: 'Custom task',
        description: 'Has custom fields',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2030-01-01T00:00:00.000Z',
      });

      expect(response.status).toBe(201);
      expect(response.body).toEqual(
        expect.objectContaining({
          title: 'Custom task',
          description: 'Has custom fields',
          status: 'in_progress',
          priority: 'high',
          dueDate: '2030-01-01T00:00:00.000Z',
        })
      );
    });

    it('rejects a missing title', async () => {
      const response = await request(app).post('/tasks').send({ priority: 'high' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'title is required and must be a non-empty string',
      });
    });

    it('rejects an invalid status', async () => {
      const response = await request(app).post('/tasks').send({
        title: 'Bad status',
        status: 'pending',
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'status must be one of: todo, in_progress, done',
      });
    });

    it('rejects an invalid priority', async () => {
      const response = await request(app).post('/tasks').send({
        title: 'Bad priority',
        priority: 'urgent',
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'priority must be one of: low, medium, high',
      });
    });

    it('rejects an invalid dueDate', async () => {
      const response = await request(app).post('/tasks').send({
        title: 'Bad due date',
        dueDate: 'not-a-date',
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'dueDate must be a valid ISO date string',
      });
    });
  });

  describe('PUT /tasks/:id', () => {
    it('updates an existing task', async () => {
      const task = taskService.create({ title: 'Before', priority: 'low' });

      const response = await request(app).put(`/tasks/${task.id}`).send({
        title: 'After',
        priority: 'high',
      });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          id: task.id,
          title: 'After',
          priority: 'high',
        })
      );
    });

    it('returns 404 for a missing task', async () => {
      const response = await request(app).put('/tasks/missing-id').send({
        title: 'Does not exist',
      });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Task not found' });
    });

    it('rejects an empty title', async () => {
      const task = taskService.create({ title: 'Before' });

      const response = await request(app).put(`/tasks/${task.id}`).send({
        title: '   ',
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'title must be a non-empty string',
      });
    });

    it('rejects an invalid dueDate', async () => {
      const task = taskService.create({ title: 'Before' });

      const response = await request(app).put(`/tasks/${task.id}`).send({
        dueDate: 'bad-date',
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'dueDate must be a valid ISO date string',
      });
    });
  });

  describe('DELETE /tasks/:id', () => {
    it('deletes an existing task', async () => {
      const task = taskService.create({ title: 'Delete me' });

      const response = await request(app).delete(`/tasks/${task.id}`);

      expect(response.status).toBe(204);
      expect(response.body).toEqual({});
      expect(taskService.getAll()).toEqual([]);
    });

    it('returns 404 for a missing task', async () => {
      const response = await request(app).delete('/tasks/missing-id');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Task not found' });
    });
  });

  describe('PATCH /tasks/:id/complete', () => {
    it('marks an existing task as done', async () => {
      const task = taskService.create({ title: 'Complete me', priority: 'high' });

      const response = await request(app).patch(`/tasks/${task.id}/complete`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          id: task.id,
          title: 'Complete me',
          status: 'done',
          completedAt: expect.any(String),
        })
      );
    });

    it('returns 404 for a missing task', async () => {
      const response = await request(app).patch('/tasks/missing-id/complete');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Task not found' });
    });
  });

  describe('PATCH /tasks/:id/assign', () => {
    it('assigns an existing task and returns the updated task', async () => {
      const task = taskService.create({ title: 'Assign me' });

      const response = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 'Alice' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          id: task.id,
          title: 'Assign me',
          assignee: 'Alice',
        })
      );
    });

    it('rejects an empty assignee', async () => {
      const task = taskService.create({ title: 'Assign me' });

      const response = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: '   ' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'assignee is required and must be a non-empty string',
      });
    });

    it('rejects a missing assignee field', async () => {
      const task = taskService.create({ title: 'Assign me' });

      const response = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'assignee is required and must be a non-empty string',
      });
    });

    it('returns 404 for a missing task', async () => {
      const response = await request(app)
        .patch('/tasks/missing-id/assign')
        .send({ assignee: 'Alice' });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Task not found' });
    });

    it('reassigns an already assigned task', async () => {
      const task = taskService.create({ title: 'Assign me' });
      taskService.assignTask(task.id, 'Alice');

      const response = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 'Bob' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          id: task.id,
          assignee: 'Bob',
        })
      );
      expect(taskService.findById(task.id).assignee).toBe('Bob');
    });
  });
});
