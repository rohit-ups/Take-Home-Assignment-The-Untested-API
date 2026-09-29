const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

describe('Take-Home - Bug Reproduction', () => {

  beforeEach(() => {
    // Proper reset using existing _reset method
    taskService._reset();
  });

  test('BUG 1: Pagination offset - page 1 should return Task 1, Task 2', async () => {
    for (let i = 1; i <= 5; i++) {
      await request(app).post('/tasks').send({
        title: `Task ${i}`,
        description: 'Testing pagination',
        status: 'todo',
        priority: 'high'
      });
    }

    const res = await request(app).get('/tasks?page=1&limit=2');

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
    expect(res.body[0].title).toBe('Task 1');
    expect(res.body[1].title).toBe('Task 2');
  });

  test('BUG 1b: Pagination page 2 should return Task 3, Task 4', async () => {
    for (let i = 1; i <= 5; i++) {
      await request(app).post('/tasks').send({ title: `Task ${i}`, status: 'todo' });
    }
    const res = await request(app).get('/tasks?page=2&limit=2');
    expect(res.body[0].title).toBe('Task 3');
    expect(res.body[1].title).toBe('Task 4');
  });

  test('BUG 2: status + pagination together', async () => {
    for (let i = 1; i <= 5; i++) {
      await request(app).post('/tasks').send({ title: `Task ${i}`, status: 'todo' });
    }
    const res = await request(app).get('/tasks?status=todo&page=1&limit=2');
    expect(res.body.length).toBe(2);
  });

  test('BUG 3: PATCH /complete should not change priority', async () => {
    const createRes = await request(app).post('/tasks').send({
      title: 'Task 4',
      priority: 'high',
      status: 'todo'
    });
    const id = createRes.body.id;

    const completeRes = await request(app).patch(`/tasks/${id}/complete`);

    expect(completeRes.status).toBe(200);
    expect(completeRes.body.priority).toBe('high');
    expect(completeRes.body.status).toBe('done');
    expect(completeRes.body.completedAt).toBeTruthy();
  });

  test('BUG 4: GET /stats should not return 500', async () => {
    await request(app).post('/tasks').send({ title: 'Sample', status: 'todo' });
    const res = await request(app).get('/tasks/stats');
    expect(res.status).not.toBe(500);
    expect(res.body).toHaveProperty('todo');
  });

  test('FEATURE: PATCH /assign should assign user', async () => {
    const createRes = await request(app).post('/tasks').send({ title: 'Assign test', status: 'todo' });
    const id = createRes.body.id;

    const assignRes = await request(app).patch(`/tasks/${id}/assign`).send({ assignee: 'vraj' });
    
    expect(assignRes.status).toBe(200);
    expect(assignRes.body.assignee).toBe('vraj');
  });
});
