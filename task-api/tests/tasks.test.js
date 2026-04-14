const request = require('supertest');
const app = require('../src/app');

describe('GET /tasks', () => {
  test('should return empty array initially', async () => {
    const res = await request(app).get('/tasks');

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([]);
  });

  
  test('pagination should return first tasks for page=1 (expected behavior)', async () => {
  // create 3 tasks
  await request(app).post('/tasks').send({ title: 'Task 1' });
  await request(app).post('/tasks').send({ title: 'Task 2' });
  await request(app).post('/tasks').send({ title: 'Task 3' });

  const res = await request(app).get('/tasks?page=1&limit=2');

  expect(res.statusCode).toBe(200);
  expect(res.body.length).toBe(2);

  // expected first 2 tasks
  expect(res.body[0].title).toBe('Task 1');
  expect(res.body[1].title).toBe('Task 2');
});  


  test('should return 400 for invalid status', async () => {
  const res = await request(app).get('/tasks?status=invalid');

  expect(res.statusCode).toBe(400);
  expect(res.body).toHaveProperty('error');
});

  test('should assign a task to a user', async () => {
  // create a task first
  const createRes = await request(app)
    .post('/tasks')
    .send({ title: 'New Task' });

  const taskId = createRes.body.id;

  // assign the task
  const res = await request(app)
    .patch(`/tasks/${taskId}/assign`)
    .send({ assignee: 'Cipher' });

  expect(res.statusCode).toBe(200);
  expect(res.body.assignee).toBe('Cipher');
});

  test('should return 400 if assignee is empty', async () => {
  const createRes = await request(app)
    .post('/tasks')
    .send({ title: 'Another Task' });

  const taskId = createRes.body.id;

  const res = await request(app)
    .patch(`/tasks/${taskId}/assign`)
    .send({ assignee: '' });

  expect(res.statusCode).toBe(400);
});

test('should return 404 if task does not exist', async () => {
  const res = await request(app)
    .patch('/tasks/invalid-id/assign')
    .send({ assignee: 'Cipher' });

  expect(res.statusCode).toBe(404);
});




});