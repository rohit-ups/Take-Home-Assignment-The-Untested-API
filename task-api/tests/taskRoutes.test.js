const request = require('supertest');
const app = require('../src/app.js');
const service = require('../src/services/taskService.js');

beforeEach(() => {
  service._reset(); 
});

test('GET /tasks should return all tasks', async () => {
  await request(app).post('/tasks').send({ title: 'Task 1' });
  await request(app).post('/tasks').send({ title: 'Task 2' });

  const res = await request(app).get('/tasks');

  expect(res.statusCode).toBe(200);
  expect(res.body.length).toBe(2);
});

test('POST /tasks should create a task', async () => {
  const res = await request(app)
    .post('/tasks')
    .send({ title: 'New Task' });

  expect(res.statusCode).toBe(201);
  expect(res.body.title).toBe('New Task');
  expect(res.body).toHaveProperty('id');
});

test('POST /tasks should fail with empty title', async () => {
  const res = await request(app)
    .post('/tasks')
    .send({ title: '' });

  expect(res.statusCode).toBe(400);
});

test('GET /tasks/:id should return 404 for invalid id', async () => {
  const res = await request(app).get('/tasks/invalid-id');

  expect(res.statusCode).toBe(404);
});

test('PUT /tasks/:id should update a task', async () => {
  const createRes = await request(app)
    .post('/tasks')
    .send({ title: 'Old Task' });

  const id = createRes.body.id;

  const res = await request(app)
    .put(`/tasks/${id}`)
    .send({ title: 'Updated Task' });

  expect(res.statusCode).toBe(200);
  expect(res.body.title).toBe('Updated Task');
});

test('PUT /tasks/:id should return 404 if task not found', async () => {
  const res = await request(app)
    .put('/tasks/invalid-id')
    .send({ title: 'X' });

  expect(res.statusCode).toBe(404);
});

test('DELETE /tasks/:id should delete task', async () => {
  const createRes = await request(app)
    .post('/tasks')
    .send({ title: 'Task' });

  const id = createRes.body.id;

  const res = await request(app).delete(`/tasks/${id}`);

  expect(res.statusCode).toBe(200);
});

test('DELETE /tasks/:id should return 404 if not found', async () => {
  const res = await request(app).delete('/tasks/invalid');

  expect(res.statusCode).toBe(404);
});

