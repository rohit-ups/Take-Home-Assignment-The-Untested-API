const request = require('supertest');
const app = require('./testApp');
const taskService = require('../src/services/taskService');

describe('Task API integration tests', () => {
  beforeEach(() => {
    // Reset the shared in-memory store so test order cannot affect results.
    taskService._reset();
  });

  test('GET /tasks returns all tasks', async () => {
    taskService.create({ title: 'One' });
    taskService.create({ title: 'Two' });

    const response = await request(app).get('/tasks');

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
  });

  test('GET /tasks?status=todo filters by status', async () => {
    taskService.create({ title: 'Todo', status: 'todo' });
    taskService.create({ title: 'Done', status: 'done' });

    const response = await request(app).get('/tasks?status=todo');

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].status).toBe('todo');
  });

  test('GET /tasks?page=1 returns the first page after the bug fix', async () => {
    for (let i = 1; i <= 3; i += 1) {
      taskService.create({ title: `Task ${i}` });
    }

    const response = await request(app).get('/tasks?page=1&limit=2');

    expect(response.status).toBe(200);
    expect(response.body.map(t => t.title)).toEqual(['Task 1', 'Task 2']);
  });

  test('POST /tasks creates a task', async () => {
    const response = await request(app)
      .post('/tasks')
      .send({ title: 'New task' });

    expect(response.status).toBe(201);
    expect(response.body.title).toBe('New task');
    expect(response.body.status).toBe('todo');
  });

  test('POST /tasks rejects a missing title', async () => {
    const response = await request(app)
      .post('/tasks')
      .send({ description: 'Missing title' });

    expect(response.status).toBe(400);
  });

  test('PUT /tasks/:id updates a task', async () => {
    const task = taskService.create({ title: 'Old title' });

    const response = await request(app)
      .put(`/tasks/${task.id}`)
      .send({ title: 'New title' });

    expect(response.status).toBe(200);
    expect(response.body.title).toBe('New title');
  });

  test('PUT /tasks/:id returns 404 for an unknown task', async () => {
    const response = await request(app)
      .put('/tasks/missing-id')
      .send({ title: 'New title' });

    expect(response.status).toBe(404);
  });

  test('DELETE /tasks/:id deletes a task', async () => {
    const task = taskService.create({ title: 'Delete me' });

    const response = await request(app).delete(`/tasks/${task.id}`);

    expect(response.status).toBe(204);
    expect(taskService.findById(task.id)).toBeUndefined();
  });

  test('PATCH /tasks/:id/complete completes a task', async () => {
    const task = taskService.create({ title: 'Complete me' });

    const response = await request(app).patch(`/tasks/${task.id}/complete`);

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('done');
    expect(response.body.completedAt).toEqual(expect.any(String));
  });

  test('PATCH /tasks/:id/complete returns 404 for an unknown task', async () => {
    const response = await request(app).patch('/tasks/missing-id/complete');

    expect(response.status).toBe(404);
  });

  test('GET /tasks/stats returns status statistics', async () => {
    taskService.create({ title: 'Todo', status: 'todo' });
    taskService.create({ title: 'Done', status: 'done' });

    const response = await request(app).get('/tasks/stats');

    expect(response.status).toBe(200);
    expect(response.body.todo).toBe(1);
    expect(response.body.done).toBe(1);
  });

  describe('PATCH /tasks/:id/assign', () => {
    test('assigns a valid assignee', async () => {
      const task = taskService.create({ title: 'Assign me' });

      const response = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 'Abbas Sadriwala' });

      expect(response.status).toBe(200);
      expect(response.body.assignee).toBe('Abbas Sadriwala');
    });

    test('trims whitespace around an assignee name', async () => {
      const task = taskService.create({ title: 'Trim me' });

      const response = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: '  Abbas  ' });

      expect(response.status).toBe(200);
      expect(response.body.assignee).toBe('Abbas');
    });

    test.each([
      ['missing', {}],
      ['empty', { assignee: '' }],
      ['whitespace', { assignee: '   ' }],
      ['null', { assignee: null }],
      ['number', { assignee: 123 }],
      ['object', { assignee: {} }],
    ])('rejects %s assignee input', async (_caseName, body) => {
      const task = taskService.create({ title: 'Invalid assignment' });

      const response = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send(body);

      expect(response.status).toBe(400);
    });

    test('returns 404 for an unknown task', async () => {
      const response = await request(app)
        .patch('/tasks/missing-id/assign')
        .send({ assignee: 'Abbas' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Task not found');
    });

    test('allows reassignment of an already assigned task', async () => {
      const task = taskService.create({ title: 'Reassign me' });

      await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 'First User' });

      const response = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 'Second User' });

      expect(response.status).toBe(200);
      expect(response.body.assignee).toBe('Second User');
    });
  });
});
