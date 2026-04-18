const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

describe('tasks API', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('GET /tasks', () => {
    test('returns all tasks', async () => {
      const first = taskService.create({ title: 'First task' });
      const second = taskService.create({ title: 'Second task', status: 'in_progress' });

      const response = await request(app).get('/tasks');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body.map((task) => task.id)).toEqual([first.id, second.id]);
    });

    test('filters by exact status', async () => {
      const todoTask = taskService.create({ title: 'Todo task', status: 'todo' });
      taskService.create({ title: 'In progress task', status: 'in_progress' });

      const response = await request(app).get('/tasks?status=todo');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].id).toBe(todoTask.id);
    });

    test('returns the first page when page=1 and limit is set', async () => {
      const first = taskService.create({ title: 'Page task 1' });
      const second = taskService.create({ title: 'Page task 2' });
      taskService.create({ title: 'Page task 3' });

      const response = await request(app).get('/tasks?page=1&limit=2');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body.map((task) => task.id)).toEqual([first.id, second.id]);
    });
  });

  describe('GET /tasks/stats', () => {
    test('returns counts by status and overdue tasks', async () => {
      const overdueDate = new Date(Date.now() - 60_000).toISOString();
      const futureDate = new Date(Date.now() + 60_000).toISOString();

      taskService.create({ title: 'Todo overdue', status: 'todo', dueDate: overdueDate });
      taskService.create({ title: 'In progress future', status: 'in_progress', dueDate: futureDate });
      taskService.create({ title: 'Done overdue', status: 'done', dueDate: overdueDate });

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
    test('creates a task', async () => {
      const response = await request(app).post('/tasks').send({
        title: 'Write integration tests',
        description: 'Cover the routes with Supertest',
        priority: 'high',
      });

      expect(response.status).toBe(201);
      expect(response.body).toEqual(
        expect.objectContaining({
          title: 'Write integration tests',
          description: 'Cover the routes with Supertest',
          status: 'todo',
          priority: 'high',
          assignee: null,
        })
      );
    });

    test('returns 400 when title is missing', async () => {
      const response = await request(app).post('/tasks').send({
        priority: 'high',
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'title is required and must be a non-empty string',
      });
    });

    test('returns 400 when dueDate is invalid', async () => {
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
    test('updates an existing task', async () => {
      const task = taskService.create({ title: 'Before update', priority: 'low' });

      const response = await request(app).put(`/tasks/${task.id}`).send({
        title: 'After update',
        priority: 'high',
      });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          id: task.id,
          title: 'After update',
          priority: 'high',
        })
      );
    });

    test('returns 404 when the task does not exist', async () => {
      const response = await request(app).put('/tasks/missing-id').send({
        title: 'Missing task',
      });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Task not found' });
    });

    test('returns 400 when the payload is invalid', async () => {
      const task = taskService.create({ title: 'Keep me' });

      const response = await request(app).put(`/tasks/${task.id}`).send({
        title: '',
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'title must be a non-empty string',
      });
    });
  });

  describe('DELETE /tasks/:id', () => {
    test('deletes an existing task', async () => {
      const task = taskService.create({ title: 'Delete me' });

      const response = await request(app).delete(`/tasks/${task.id}`);

      expect(response.status).toBe(204);
      expect(taskService.findById(task.id)).toBeUndefined();
    });

    test('returns 404 when the task does not exist', async () => {
      const response = await request(app).delete('/tasks/missing-id');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Task not found' });
    });
  });

  describe('PATCH /tasks/:id/complete', () => {
    test('marks a task as complete', async () => {
      const task = taskService.create({ title: 'Finish me', priority: 'high' });

      const response = await request(app).patch(`/tasks/${task.id}/complete`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          id: task.id,
          status: 'done',
          priority: 'high',
        })
      );
      expect(response.body.completedAt).toEqual(expect.any(String));
    });

    test('returns 404 when the task does not exist', async () => {
      const response = await request(app).patch('/tasks/missing-id/complete');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Task not found' });
    });
  });

  describe('PATCH /tasks/:id/assign', () => {
    test('assigns a task to a user', async () => {
      const task = taskService.create({ title: 'Assign me' });

      const response = await request(app).patch(`/tasks/${task.id}/assign`).send({
        assignee: 'Asha',
      });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          id: task.id,
          assignee: 'Asha',
        })
      );
    });

    test('reassigns a task when it is already assigned', async () => {
      const task = taskService.create({ title: 'Already assigned' });
      taskService.assignTask(task.id, 'Rahul');

      const response = await request(app).patch(`/tasks/${task.id}/assign`).send({
        assignee: 'Neha',
      });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          id: task.id,
          assignee: 'Neha',
        })
      );
    });

    test('returns 400 when assignee is empty', async () => {
      const task = taskService.create({ title: 'Needs a person' });

      const response = await request(app).patch(`/tasks/${task.id}/assign`).send({
        assignee: '   ',
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'assignee must be a non-empty string',
      });
    });

    test('returns 404 when the task does not exist', async () => {
      const response = await request(app).patch('/tasks/missing-id/assign').send({
        assignee: 'Asha',
      });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Task not found' });
    });
  });
});
