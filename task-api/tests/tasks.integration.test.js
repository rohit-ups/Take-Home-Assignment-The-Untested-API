const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

describe('Task API Integration Tests', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('GET /tasks', () => {
    test('should return all tasks', async () => {
      await request(app)
        .post('/tasks')
        .send({ title: 'Task 1' });

      await request(app)
        .post('/tasks')
        .send({ title: 'Task 2' });

      const response = await request(app)
        .get('/tasks')
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0].title).toBe('Task 1');
    });

    test('should return an empty array when there are no tasks', async () => {
      const response = await request(app)
        .get('/tasks')
        .expect(200);

      expect(response.body).toEqual([]);
    });
  });

  describe('GET /tasks?status=', () => {
    test('should filter tasks by status', async () => {
      await request(app)
        .post('/tasks')
        .send({ title: 'Todo', status: 'todo' });

      await request(app)
        .post('/tasks')
        .send({ title: 'Done', status: 'done' });

      const response = await request(app)
        .get('/tasks?status=done')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].title).toBe('Done');
    });
  });

  describe('GET /tasks pagination', () => {
    test('should return the requested page', async () => {
      await request(app).post('/tasks').send({ title: 'Task 1' });
      await request(app).post('/tasks').send({ title: 'Task 2' });
      await request(app).post('/tasks').send({ title: 'Task 3' });

      const response = await request(app)
        .get('/tasks?page=1&limit=2')
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0].title).toBe('Task 1');
      expect(response.body[1].title).toBe('Task 2');
    });
  });

  describe('GET /tasks/stats', () => {
    test('should return task statistics', async () => {
      await request(app)
        .post('/tasks')
        .send({ title: 'Todo', status: 'todo' });

      await request(app)
        .post('/tasks')
        .send({ title: 'Progress', status: 'in_progress' });

      await request(app)
        .post('/tasks')
        .send({ title: 'Done', status: 'done' });

      const response = await request(app)
        .get('/tasks/stats')
        .expect(200);

      expect(response.body).toMatchObject({
        todo: 1,
        in_progress: 1,
        done: 1,
        overdue: 0,
      });
    });
  });

  describe('POST /tasks', () => {
    test('should create a task', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({
          title: 'Build API',
          description: 'Create tests',
          status: 'todo',
          priority: 'high',
        })
        .expect(201);

      expect(response.body).toMatchObject({
        title: 'Build API',
        description: 'Create tests',
        status: 'todo',
        priority: 'high',
        completedAt: null,
      });

      expect(response.body.id).toBeDefined();
    });

    test('should reject a missing title', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({
          description: 'No title',
        })
        .expect(400);

      expect(response.body.error)
        .toBe('title is required and must be a non-empty string');
    });

    test('should reject an invalid status', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({
          title: 'Invalid task',
          status: 'invalid',
        })
        .expect(400);

      expect(response.body.error)
        .toContain('status must be one of');
    });

    test('should reject an invalid priority', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({
          title: 'Invalid priority',
          priority: 'urgent',
        })
        .expect(400);

      expect(response.body.error)
        .toContain('priority must be one of');
    });
  });

  describe('PUT /tasks/:id', () => {
    test('should update an existing task', async () => {
      const created = await request(app)
        .post('/tasks')
        .send({ title: 'Original' });

      const response = await request(app)
        .put(`/tasks/${created.body.id}`)
        .send({
          title: 'Updated',
          priority: 'high',
        })
        .expect(200);

      expect(response.body.title).toBe('Updated');
      expect(response.body.priority).toBe('high');
    });

    test('should return 404 for a non-existent task', async () => {
      await request(app)
        .put('/tasks/non-existent-id')
        .send({ title: 'Updated' })
        .expect(404);
    });

    test('should reject an empty title', async () => {
      const created = await request(app)
        .post('/tasks')
        .send({ title: 'Original' });

      await request(app)
        .put(`/tasks/${created.body.id}`)
        .send({ title: '' })
        .expect(400);
    });
  });

  describe('DELETE /tasks/:id', () => {
    test('should delete an existing task', async () => {
      const created = await request(app)
        .post('/tasks')
        .send({ title: 'Delete me' });

      await request(app)
        .delete(`/tasks/${created.body.id}`)
        .expect(204);

      const response = await request(app)
        .get('/tasks')
        .expect(200);

      expect(response.body).toHaveLength(0);
    });

    test('should return 404 for a non-existent task', async () => {
      await request(app)
        .delete('/tasks/non-existent-id')
        .expect(404);
    });
  });

  describe('PATCH /tasks/:id/assign', () => {
  test('should assign an existing task to an assignee', async () => {
    const createResponse = await request(app)
      .post('/tasks')
      .send({
        title: 'Task to assign',
      });

    const taskId = createResponse.body.id;

    const response = await request(app)
      .patch(`/tasks/${taskId}/assign`)
      .send({
        assignee: 'Ayush',
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.id).toBe(taskId);
    expect(response.body.assignee).toBe('Ayush');
    expect(response.body.title).toBe('Task to assign');
  });

  test('should return 404 when assigning a non-existent task', async () => {
    const response = await request(app)
      .patch('/tasks/non-existent-id/assign')
      .send({
        assignee: 'Ayush',
      });

    expect(response.statusCode).toBe(404);
    expect(response.body.error).toBe('Task not found');
  });

  test('should reject a missing assignee', async () => {
    const createResponse = await request(app)
      .post('/tasks')
      .send({
        title: 'Task without assignee',
      });

    const response = await request(app)
      .patch(`/tasks/${createResponse.body.id}/assign`)
      .send({});

    expect(response.statusCode).toBe(400);
    expect(response.body.error).toBe(
      'assignee is required and must be a non-empty string'
    );
  });

  test('should reject an empty assignee', async () => {
    const createResponse = await request(app)
      .post('/tasks')
      .send({
        title: 'Task with empty assignee',
      });

    const response = await request(app)
      .patch(`/tasks/${createResponse.body.id}/assign`)
      .send({
        assignee: '',
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.error).toBe(
      'assignee is required and must be a non-empty string'
    );
  });

  test('should replace the existing assignee when reassigning', async () => {
    const createResponse = await request(app)
      .post('/tasks')
      .send({
        title: 'Task to reassign',
      });

    const taskId = createResponse.body.id;

    await request(app)
      .patch(`/tasks/${taskId}/assign`)
      .send({
        assignee: 'Rahul',
      });

    const response = await request(app)
      .patch(`/tasks/${taskId}/assign`)
      .send({
        assignee: 'Ayush',
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.assignee).toBe('Ayush');
  });
});
});