const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

describe('Task API routes', () => {
  beforeEach(() => {
    taskService._reset();
  });

  it('creates a task via POST /tasks', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'Write report', priority: 'high' });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Write report');
  });
  it('rejects creating a task with no title', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ description: 'missing title' });

    expect(res.status).toBe(400);
  });
  it('lists all tasks via GET /tasks', async () => {
    await request(app).post('/tasks').send({ title: 'Task A' });
    await request(app).post('/tasks').send({ title: 'Task B' });

    const res = await request(app).get('/tasks');

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
  });
  it('filters tasks by status via GET /tasks?status=', async () => {
    await request(app).post('/tasks').send({ title: 'Task A', status: 'todo' });
    await request(app).post('/tasks').send({ title: 'Task B', status: 'done' });

    const res = await request(app).get('/tasks?status=done');

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].title).toBe('Task B');
  });
  it('paginates tasks via GET /tasks?page=&limit=', async () => {
    for (let i = 1; i <= 5; i++) {
      await request(app).post('/tasks').send({ title: `Task ${i}` });
    }

    const res = await request(app).get('/tasks?page=1&limit=2');

    expect(res.status).toBe(200);
    expect(res.body[0].title).toBe('Task 1');
    expect(res.body.length).toBe(2);
  });
  it('returns stats via GET /tasks/stats', async () => {
    await request(app).post('/tasks').send({ title: 'Task A', status: 'todo' });
    await request(app).post('/tasks').send({ title: 'Task B', status: 'done' });

    const res = await request(app).get('/tasks/stats');

    expect(res.status).toBe(200);
    expect(res.body.todo).toBe(1);
    expect(res.body.done).toBe(1);
  });
  it('updates a task via PUT /tasks/:id', async () => {
    const created = await request(app).post('/tasks').send({ title: 'Original' });

    const res = await request(app)
      .put(`/tasks/${created.body.id}`)
      .send({ title: 'Updated title' });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated title');
  });
  it('returns 404 when updating a task that does not exist', async () => {
    const res = await request(app)
      .put('/tasks/some-fake-id')
      .send({ title: 'Updated title' });

    expect(res.status).toBe(404);
  });
  it('deletes a task via DELETE /tasks/:id', async () => {
    const created = await request(app).post('/tasks').send({ title: 'To delete' });

    const res = await request(app).delete(`/tasks/${created.body.id}`);

    expect(res.status).toBe(204);
  });
  it('returns 404 when deleting a task that does not exist', async () => {
    const res = await request(app).delete('/tasks/some-fake-id');
    expect(res.status).toBe(404);
  });
  it('marks a task as complete via PATCH /tasks/:id/complete', async () => {
    const created = await request(app).post('/tasks').send({ title: 'Finish me' });

    const res = await request(app).patch(`/tasks/${created.body.id}/complete`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('done');
  });
  it('returns 404 when completing a task that does not exist', async () => {
    const res = await request(app).patch('/tasks/some-fake-id/complete');
    expect(res.status).toBe(404);
  });
  it('assigns a task via PATCH /tasks/:id/assign', async () => {
    const created = await request(app).post('/tasks').send({ title: 'Assign me' });

    const res = await request(app)
      .patch(`/tasks/${created.body.id}/assign`)
      .send({ assignee: 'Priya' });

    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Priya');
  });
  it('returns 404 when assigning a task that does not exist', async () => {
    const res = await request(app)
      .patch('/tasks/some-fake-id/assign')
      .send({ assignee: 'Priya' });

    expect(res.status).toBe(404);
  });
  it('rejects assigning with no assignee field', async () => {
    const created = await request(app).post('/tasks').send({ title: 'Assign me' });

    const res = await request(app)
      .patch(`/tasks/${created.body.id}/assign`)
      .send({});

    expect(res.status).toBe(400);
  });
  it('rejects assigning with an empty or whitespace-only assignee', async () => {
    const created = await request(app).post('/tasks').send({ title: 'Assign me' });

    const res = await request(app)
      .patch(`/tasks/${created.body.id}/assign`)
      .send({ assignee: '   ' });

    expect(res.status).toBe(400);
  });
  it('rejects creating a task with an invalid status', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'Bad status', status: 'not-a-real-status' });

    expect(res.status).toBe(400);
  });
  it('rejects creating a task with an invalid priority', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'Bad priority', priority: 'urgent' });

    expect(res.status).toBe(400);
  });
  it('rejects creating a task with an invalid dueDate', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'Bad date', dueDate: 'not-a-real-date' });

    expect(res.status).toBe(400);
  });
});