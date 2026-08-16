const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

describe('Task API Integration Tests', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('POST /tasks', () => {
    test('should create a new task', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({
          title: 'Learn Jest',
          description: 'Write API tests',
          priority: 'high',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe('Learn Jest');
      expect(response.body.description).toBe('Write API tests');
      expect(response.body.priority).toBe('high');
      expect(response.body.status).toBe('todo');
    });

    test('should reject a task without a title', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({
          description: 'Task without title',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('should reject an invalid priority', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({
          title: 'Invalid task',
          priority: 'urgent',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('priority');
    });
  });

  describe('GET /tasks', () => {
    test('should return all tasks', async () => {
      await request(app)
        .post('/tasks')
        .send({ title: 'Task 1' });

      await request(app)
        .post('/tasks')
        .send({ title: 'Task 2' });

      const response = await request(app).get('/tasks');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].title).toBe('Task 1');
      expect(response.body[1].title).toBe('Task 2');
    });

    test('should return an empty array when there are no tasks', async () => {
      const response = await request(app).get('/tasks');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });
  });

  describe('GET /tasks?status=', () => {
    test('should return tasks filtered by status', async () => {
      await request(app)
        .post('/tasks')
        .send({
          title: 'Todo task',
          status: 'todo',
        });

      await request(app)
        .post('/tasks')
        .send({
          title: 'Done task',
          status: 'done',
        });

      const response = await request(app)
        .get('/tasks')
        .query({ status: 'todo' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].title).toBe('Todo task');
      expect(response.body[0].status).toBe('todo');
    });
  });

  describe('GET /tasks?page=&limit=', () => {
    test('should return paginated tasks', async () => {
      await request(app).post('/tasks').send({ title: 'Task 1' });
      await request(app).post('/tasks').send({ title: 'Task 2' });
      await request(app).post('/tasks').send({ title: 'Task 3' });

      const response = await request(app)
        .get('/tasks')
        .query({ page: 1, limit: 2 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].title).toBe('Task 1');
      expect(response.body[1].title).toBe('Task 2');
    });
  });

  describe('PUT /tasks/:id', () => {
    test('should update an existing task', async () => {
      const created = await request(app)
        .post('/tasks')
        .send({
          title: 'Original title',
        });

      const response = await request(app)
        .put(`/tasks/${created.body.id}`)
        .send({
          title: 'Updated title',
        });

      expect(response.status).toBe(200);
      expect(response.body.title).toBe('Updated title');
      expect(response.body.id).toBe(created.body.id);
    });

    test('should return 404 when updating a non-existent task', async () => {
      const response = await request(app)
        .put('/tasks/non-existent-id')
        .send({
          title: 'Updated title',
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Task not found');
    });
  });

  describe('DELETE /tasks/:id', () => {
    test('should delete an existing task', async () => {
      const created = await request(app)
        .post('/tasks')
        .send({
          title: 'Delete me',
        });

      const response = await request(app)
        .delete(`/tasks/${created.body.id}`);

      expect(response.status).toBe(204);

      const getResponse = await request(app).get('/tasks');

      expect(getResponse.body).toHaveLength(0);
    });

    test('should return 404 when deleting a non-existent task', async () => {
      const response = await request(app)
        .delete('/tasks/non-existent-id');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Task not found');
    });
  });
  

  describe('PATCH /tasks/:id/complete', () => {
    test('should mark a task as complete', async () => {
      const created = await request(app)
        .post('/tasks')
        .send({
          title: 'Complete me',
          priority: 'high',
        });

      const response = await request(app)
        .patch(`/tasks/${created.body.id}/complete`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('done');
      expect(response.body.completedAt).not.toBeNull();
    });

    test('should return 404 for a non-existent task', async () => {
      const response = await request(app)
        .patch('/tasks/non-existent-id/complete');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Task not found');
    });
  });
describe('PATCH /tasks/:id/assign', () => {
  test('should assign a task to a valid assignee', async () => {
    const created = await request(app)
      .post('/tasks')
      .send({
        title: 'Task to assign',
      });

    const response = await request(app)
      .patch(`/tasks/${created.body.id}/assign`)
      .send({
        assignee: 'Akriti',
      });

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(created.body.id);
    expect(response.body.assignee).toBe('Akriti');
  });

  test('should return 400 when assignee is missing', async () => {
    const created = await request(app)
      .post('/tasks')
      .send({
        title: 'Task to assign',
      });

    const response = await request(app)
      .patch(`/tasks/${created.body.id}/assign`)
      .send({});

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  test('should return 400 when assignee is an empty string', async () => {
    const created = await request(app)
      .post('/tasks')
      .send({
        title: 'Task to assign',
      });

    const response = await request(app)
      .patch(`/tasks/${created.body.id}/assign`)
      .send({
        assignee: '',
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  test('should return 400 when assignee is only whitespace', async () => {
    const created = await request(app)
      .post('/tasks')
      .send({
        title: 'Task to assign',
      });

    const response = await request(app)
      .patch(`/tasks/${created.body.id}/assign`)
      .send({
        assignee: '   ',
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  test('should return 400 when assignee is not a string', async () => {
    const created = await request(app)
      .post('/tasks')
      .send({
        title: 'Task to assign',
      });

    const response = await request(app)
      .patch(`/tasks/${created.body.id}/assign`)
      .send({
        assignee: 123,
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  test('should return 404 when the task does not exist', async () => {
    const response = await request(app)
      .patch('/tasks/non-existent-id/assign')
      .send({
        assignee: 'Akriti',
      });

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Task not found');
  });

  test('should return 400 when the task is already assigned', async () => {
    const created = await request(app)
      .post('/tasks')
      .send({
        title: 'Already assigned task',
      });

    await request(app)
      .patch(`/tasks/${created.body.id}/assign`)
      .send({
        assignee: 'Akriti',
      });

    const response = await request(app)
      .patch(`/tasks/${created.body.id}/assign`)
      .send({
        assignee: 'Rahul',
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });
});
  describe('GET /tasks/stats', () => {
    test('should return task counts by status', async () => {
      await request(app)
        .post('/tasks')
        .send({
          title: 'Todo task',
          status: 'todo',
        });

      await request(app)
        .post('/tasks')
        .send({
          title: 'Progress task',
          status: 'in_progress',
        });

      await request(app)
        .post('/tasks')
        .send({
          title: 'Done task',
          status: 'done',
        });

      const response = await request(app).get('/tasks/stats');

      expect(response.status).toBe(200);
      expect(response.body.todo).toBe(1);
      expect(response.body.in_progress).toBe(1);
      expect(response.body.done).toBe(1);
      expect(response.body.overdue).toBe(0);
    });
  });
});