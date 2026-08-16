const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

beforeEach(() => {
  taskService._reset();
});

describe('Task API', () => {
  describe('GET /tasks', () => {
    test('should return an empty array when there are no tasks', async () => {
      const response = await request(app).get('/tasks');

      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual([]);
    });

    test('should return all tasks', async () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });

      const response = await request(app).get('/tasks');

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveLength(2);
    });

    test('should not partially match task status', async () => {
      taskService.create({
        title: 'Todo task',
        status: 'todo',
      });

      const response = await request(app)
        .get('/tasks?status=to');

      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual([]);
    });
  });

  describe('POST /tasks', () => {
    test('should create a task', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({
          title: 'Learn Supertest',
          priority: 'high',
        });

      expect(response.statusCode).toBe(201);
      expect(response.body).toEqual(
        expect.objectContaining({
          title: 'Learn Supertest',
          priority: 'high',
          status: 'todo',
        })
      );

      expect(response.body.id).toBeDefined();
    });

    test('should reject a task without a title', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({
          priority: 'high',
        });

      expect(response.statusCode).toBe(400);
      expect(response.body).toEqual({
        error: 'title is required and must be a non-empty string',
      });
    });

    test('should reject an invalid priority', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({
          title: 'Test',
          priority: 'urgent',
        });

      expect(response.statusCode).toBe(400);
      expect(response.body.error).toContain(
        'priority must be one of'
      );
    });
  });

  describe('PUT /tasks/:id', () => {
    test('should update an existing task', async () => {
      const task = taskService.create({
        title: 'Old title',
      });

      const response = await request(app)
        .put(`/tasks/${task.id}`)
        .send({
          title: 'Updated title',
          priority: 'high',
        });

      expect(response.statusCode).toBe(200);
      expect(response.body.title).toBe('Updated title');
      expect(response.body.priority).toBe('high');
    });

    test('should return 404 for a nonexistent task', async () => {
      const response = await request(app)
        .put('/tasks/not-found')
        .send({
          title: 'Updated',
        });

      expect(response.statusCode).toBe(404);
      expect(response.body).toEqual({
        error: 'Task not found',
      });
    });
  });

  describe('DELETE /tasks/:id', () => {
    test('should delete an existing task', async () => {
      const task = taskService.create({
        title: 'Delete me',
      });

      const response = await request(app)
        .delete(`/tasks/${task.id}`);

      expect(response.statusCode).toBe(204);

      const getResponse = await request(app).get('/tasks');

      expect(getResponse.body).toEqual([]);
    });

    test('should return 404 for a nonexistent task', async () => {
      const response = await request(app)
        .delete('/tasks/not-found');

      expect(response.statusCode).toBe(404);
      expect(response.body).toEqual({
        error: 'Task not found',
      });
    });
  });

  describe('PATCH /tasks/:id/complete', () => {
    test('should complete an existing task', async () => {
      const task = taskService.create({
        title: 'Complete me',
        priority: 'high',
      });

      const response = await request(app)
        .patch(`/tasks/${task.id}/complete`);

      expect(response.statusCode).toBe(200);
      expect(response.body.status).toBe('done');
      expect(response.body.completedAt).toBeDefined();
    });

    test('should return 404 for a nonexistent task', async () => {
      const response = await request(app)
        .patch('/tasks/not-found/complete');

      expect(response.statusCode).toBe(404);
      expect(response.body).toEqual({
        error: 'Task not found',
      });
    });
  });

  describe('GET /tasks/stats', () => {
    test('should return task statistics', async () => {
      taskService.create({
        title: 'Todo',
        status: 'todo',
      });

      taskService.create({
        title: 'Progress',
        status: 'in_progress',
      });

      taskService.create({
        title: 'Done',
        status: 'done',
      });

      const response = await request(app).get('/tasks/stats');

      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({
        todo: 1,
        in_progress: 1,
        done: 1,
        overdue: 0,
      });
    });
  });
  describe('PATCH /tasks/:id/assign', () => {
  test('should assign a task to a user', async () => {
    const task = taskService.create({
      title: 'Assign me',
    });

    const response = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({
        assignee: 'Rohit',
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.assignee).toBe('Rohit');
    expect(response.body.id).toBe(task.id);
  });

  test('should return 404 when the task does not exist', async () => {
    const response = await request(app)
      .patch('/tasks/not-found/assign')
      .send({
        assignee: 'Rohit',
      });

    expect(response.statusCode).toBe(404);
    expect(response.body).toEqual({
      error: 'Task not found',
    });
  });

  test('should reject an empty assignee', async () => {
    const task = taskService.create({
      title: 'Assign me',
    });

    const response = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({
        assignee: '',
      });

    expect(response.statusCode).toBe(400);
    expect(response.body).toEqual({
      error: 'assignee is required and must be a non-empty string',
    });
  });

  test('should reject a non-string assignee', async () => {
    const task = taskService.create({
      title: 'Assign me',
    });

    const response = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({
        assignee: 123,
      });

    expect(response.statusCode).toBe(400);
    expect(response.body).toEqual({
      error: 'assignee is required and must be a non-empty string',
    });
  });

  test('should reject assigning an already assigned task', async () => {
    const task = taskService.create({
      title: 'Already assigned',
    });

    await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({
        assignee: 'Rohit',
      });

    const response = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({
        assignee: 'Amit',
      });

    expect(response.statusCode).toBe(400);
    expect(response.body).toEqual({
      error: 'Task is already assigned',
    });
  });
});
});