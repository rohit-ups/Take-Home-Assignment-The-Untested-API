const request = require('supertest');
const app = require('../../src/app');
const taskService = require('../../src/services/taskService');

describe('Task API Integration Tests', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('GET /tasks', () => {
    test('returns empty array when no tasks exist', async () => {
      const res = await request(app).get('/tasks');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    test('returns all tasks', async () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });

      const res = await request(app).get('/tasks');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].title).toBe('Task 1');
      expect(res.body[1].title).toBe('Task 2');
    });

    test('filters tasks by status', async () => {
      taskService.create({ title: 'Task 1', status: 'todo' });
      taskService.create({ title: 'Task 2', status: 'in_progress' });
      taskService.create({ title: 'Task 3', status: 'done' });

      const res = await request(app).get('/tasks?status=in_progress');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe('Task 2');
    });

    test('paginates tasks with page and limit query params', async () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });
      taskService.create({ title: 'Task 3' });

      const page1Res = await request(app).get('/tasks?page=1&limit=2');
      expect(page1Res.status).toBe(200);
      expect(page1Res.body).toHaveLength(2);
      expect(page1Res.body[0].title).toBe('Task 1');
      expect(page1Res.body[1].title).toBe('Task 2');

      const page2Res = await request(app).get('/tasks?page=2&limit=2');
      expect(page2Res.status).toBe(200);
      expect(page2Res.body).toHaveLength(1);
      expect(page2Res.body[0].title).toBe('Task 3');
    });
  });

  describe('POST /tasks', () => {
    test('creates a new task with minimal payload (happy path)', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'New Task' });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.title).toBe('New Task');
      expect(res.body.description).toBe('');
      expect(res.body.status).toBe('todo');
      expect(res.body.priority).toBe('medium');
      expect(res.body.dueDate).toBeNull();
      expect(res.body.assignee).toBeNull();
      expect(res.body.completedAt).toBeNull();
      expect(res.body.createdAt).toBeDefined();
    });

    test('creates a task with full custom payload', async () => {
      const payload = {
        title: 'Complete take-home',
        description: 'Implement tests and features',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2026-10-01T12:00:00.000Z',
      };

      const res = await request(app).post('/tasks').send(payload);

      expect(res.status).toBe(201);
      expect(res.body.title).toBe(payload.title);
      expect(res.body.description).toBe(payload.description);
      expect(res.body.status).toBe(payload.status);
      expect(res.body.priority).toBe(payload.priority);
      expect(res.body.dueDate).toBe(payload.dueDate);
    });

    test('fails with 400 if title is missing (edge case 1)', async () => {
      const res = await request(app).post('/tasks').send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('title is required and must be a non-empty string');
    });

    test('fails with 400 if title is empty or whitespace string (edge case 2)', async () => {
      const res = await request(app).post('/tasks').send({ title: '   ' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('title is required and must be a non-empty string');
    });

    test('fails with 400 if status is invalid (edge case 3)', async () => {
      const res = await request(app).post('/tasks').send({ title: 'Task', status: 'invalid_status' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('status must be one of: todo, in_progress, done');
    });

    test('fails with 400 if priority is invalid (edge case 4)', async () => {
      const res = await request(app).post('/tasks').send({ title: 'Task', priority: 'ultra' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('priority must be one of: low, medium, high');
    });

    test('fails with 400 if dueDate is not a valid date string (edge case 5)', async () => {
      const res = await request(app).post('/tasks').send({ title: 'Task', dueDate: 'invalid-date' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('dueDate must be a valid ISO date string');
    });
  });

  describe('PUT /tasks/:id', () => {
    test('updates an existing task (happy path)', async () => {
      const created = taskService.create({ title: 'Old Title', priority: 'low' });

      const res = await request(app)
        .put(`/tasks/${created.id}`)
        .send({ title: 'New Title', priority: 'high', status: 'in_progress' });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('New Title');
      expect(res.body.priority).toBe('high');
      expect(res.body.status).toBe('in_progress');
    });

    test('returns 404 for non-existent task (edge case 1)', async () => {
      const res = await request(app)
        .put('/tasks/non-existent-uuid')
        .send({ title: 'Updated' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });

    test('returns 400 for invalid update payload (edge case 2)', async () => {
      const created = taskService.create({ title: 'Task' });

      const res = await request(app)
        .put(`/tasks/${created.id}`)
        .send({ status: 'invalid_status' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('status must be one of: todo, in_progress, done');
    });
  });

  describe('DELETE /tasks/:id', () => {
    test('deletes an existing task returning 204 (happy path)', async () => {
      const created = taskService.create({ title: 'Delete me' });

      const res = await request(app).delete(`/tasks/${created.id}`);
      expect(res.status).toBe(204);
      expect(res.text).toBe('');
      expect(taskService.findById(created.id)).toBeUndefined();
    });

    test('returns 404 when deleting non-existent task (edge case 1)', async () => {
      const res = await request(app).delete('/tasks/missing-id');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });
  });

  describe('PATCH /tasks/:id/complete', () => {
    test('marks task as completed, preserves priority, and sets completedAt (happy path)', async () => {
      const created = taskService.create({ title: 'Finish work', priority: 'high' });

      const res = await request(app).patch(`/tasks/${created.id}/complete`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('done');
      expect(res.body.priority).toBe('high');
      expect(res.body.completedAt).toBeDefined();
    });

    test('returns 404 for non-existent task (edge case 1)', async () => {
      const res = await request(app).patch('/tasks/non-existent/complete');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });
  });

  describe('PATCH /tasks/:id/assign', () => {
    test('assigns a user to an unassigned task (happy path)', async () => {
      const task = taskService.create({ title: 'Assign Feature' });

      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 'Jane Smith' });

      expect(res.status).toBe(200);
      expect(res.body.assignee).toBe('Jane Smith');
      expect(taskService.findById(task.id).assignee).toBe('Jane Smith');
    });

    test('allows reassigning a task to a new user (happy path)', async () => {
      const task = taskService.create({ title: 'Reassign Task', assignee: 'Old Assignee' });

      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 'New Assignee' });

      expect(res.status).toBe(200);
      expect(res.body.assignee).toBe('New Assignee');
    });

    test('returns 404 if task does not exist (edge case 1)', async () => {
      const res = await request(app)
        .patch('/tasks/non-existent-uuid/assign')
        .send({ assignee: 'Jane Smith' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });

    test('returns 400 if assignee is missing in request body (edge case 2)', async () => {
      const task = taskService.create({ title: 'Task' });

      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('assignee is required and must be a non-empty string');
    });

    test('returns 400 if assignee is empty string or only whitespace (edge case 3)', async () => {
      const task = taskService.create({ title: 'Task' });

      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: '    ' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('assignee is required and must be a non-empty string');
    });

    test('returns 400 if assignee is not a string (edge case 4)', async () => {
      const task = taskService.create({ title: 'Task' });

      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 12345 });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('assignee is required and must be a non-empty string');
    });
  });

  describe('GET /tasks/stats', () => {
    test('returns correct counts and overdue stats', async () => {
      const yesterday = new Date(Date.now() - 86400000).toISOString();
      taskService.create({ title: 'Task 1', status: 'todo', dueDate: yesterday });
      taskService.create({ title: 'Task 2', status: 'in_progress' });
      taskService.create({ title: 'Task 3', status: 'done', dueDate: yesterday });

      const res = await request(app).get('/tasks/stats');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        todo: 1,
        in_progress: 1,
        done: 1,
        overdue: 1,
      });
    });
  });
});
