const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

describe('Tasks API', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('GET /tasks', () => {
    test('should return all tasks', async () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });

      const response = await request(app).get('/tasks');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].title).toBe('Task 1');
    });

    test('should return an empty array when there are no tasks', async () => {
      const response = await request(app).get('/tasks');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });
  });

  describe('GET /tasks?status=', () => {
    test('should return tasks filtered by status', async () => {
      taskService.create({
        title: 'Todo task',
        status: 'todo',
      });

      taskService.create({
        title: 'Done task',
        status: 'done',
      });

      const response = await request(app)
        .get('/tasks')
        .query({ status: 'todo' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].status).toBe('todo');
    });

    test('should return an empty array for a status with no matching tasks', async () => {
      taskService.create({
        title: 'Todo task',
        status: 'todo',
      });

      const response = await request(app)
        .get('/tasks')
        .query({ status: 'done' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });
  });

  describe('GET /tasks pagination', () => {
    beforeEach(() => {
      for (let i = 1; i <= 5; i++) {
        taskService.create({ title: `Task ${i}` });
      }
    });

    test('should return the first page', async () => {
      const response = await request(app)
        .get('/tasks')
        .query({ page: 1, limit: 2 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].title).toBe('Task 1');
      expect(response.body[1].title).toBe('Task 2');
    });

    test('should return the second page', async () => {
      const response = await request(app)
        .get('/tasks')
        .query({ page: 2, limit: 2 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].title).toBe('Task 3');
      expect(response.body[1].title).toBe('Task 4');
    });
  });

  describe('POST /tasks', () => {
    test('should create a task', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({
          title: 'New task',
          description: 'Test description',
          priority: 'high',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe('New task');
      expect(response.body.description).toBe('Test description');
      expect(response.body.priority).toBe('high');
    });

    test('should reject a task without a title', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({
          description: 'Missing title',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('should reject an invalid status', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({
          title: 'Invalid status task',
          status: 'invalid',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('status');
    });

    test('should reject an invalid priority', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({
          title: 'Invalid priority task',
          priority: 'urgent',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('priority');
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

      expect(response.status).toBe(200);
      expect(response.body.title).toBe('Updated title');
      expect(response.body.priority).toBe('high');
    });

    test('should return 404 for a non-existent task', async () => {
      const response = await request(app)
        .put('/tasks/non-existent-id')
        .send({
          title: 'Updated title',
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Task not found');
    });

    test('should reject an invalid update', async () => {
      const task = taskService.create({
        title: 'Test task',
      });

      const response = await request(app)
        .put(`/tasks/${task.id}`)
        .send({
          status: 'invalid',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('status');
    });
  });

  describe('DELETE /tasks/:id', () => {
    test('should delete an existing task', async () => {
      const task = taskService.create({
        title: 'Delete me',
      });

      const response = await request(app)
        .delete(`/tasks/${task.id}`);

      expect(response.status).toBe(204);

      const tasks = taskService.getAll();
      expect(tasks).toHaveLength(0);
    });

    test('should return 404 for a non-existent task', async () => {
      const response = await request(app)
        .delete('/tasks/non-existent-id');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Task not found');
    });
  });

  describe('PATCH /tasks/:id/complete', () => {
    test('should complete an existing task', async () => {
      const task = taskService.create({
        title: 'Complete me',
        status: 'todo',
      });

      const response = await request(app)
        .patch(`/tasks/${task.id}/complete`);

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
  test('should assign a task to a user', async () => {
    const task = taskService.create({
      title: 'Assign me',
    });

    const response = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({
        assignee: 'John',
      });

    expect(response.status).toBe(200);
    expect(response.body.assignee).toBe('John');
    expect(response.body.title).toBe('Assign me');
  });

  test('should return 404 for a non-existent task', async () => {
    const response = await request(app)
      .patch('/tasks/non-existent-id/assign')
      .send({
        assignee: 'John',
      });

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Task not found');
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

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('assignee');
  });

  test('should reject an already assigned task', async () => {
    const task = taskService.create({
      title: 'Already assigned',
    });

    await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({
        assignee: 'John',
      });

    const response = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({
        assignee: 'Mike',
      });

    expect(response.status).toBe(409);
    expect(response.body.error).toBe('Task is already assigned');
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

      expect(response.status).toBe(200);
      expect(response.body.todo).toBe(1);
      expect(response.body.in_progress).toBe(1);
      expect(response.body.done).toBe(1);
      expect(response.body.overdue).toBe(0);
    });

    test('should count overdue unfinished tasks', async () => {
      taskService.create({
        title: 'Overdue task',
        dueDate: '2020-01-01T00:00:00.000Z',
      });

      const response = await request(app).get('/tasks/stats');

      expect(response.status).toBe(200);
      expect(response.body.overdue).toBe(1);
    });
  });
});

