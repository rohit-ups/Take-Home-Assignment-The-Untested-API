const request = require('supertest');
const app = require('../src/app');

describe('Task API Integration Tests', () => {
  let createdTaskId;

  // Test POST /tasks
  it('should create a new task', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({
        title: 'Finish Assignment',
        priority: 'high',
        status: 'todo'
      });
    
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.title).toBe('Finish Assignment');
    createdTaskId = res.body.id;
  });

  // Test GET /tasks
  it('should list all tasks', async () => {
    const res = await request(app).get('/tasks');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  // Test GET /tasks/stats
  it('should return task statistics', async () => {
    const res = await request(app).get('/tasks/stats');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('overdue');
  });
  it('should return 400 if title is missing', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ priority: 'low' });
    
    // If this test FAILS (meaning it returns 201), 
    // you have found Bug #1 for your report!
    expect(res.statusCode).toBe(400);
  });
  it('PATCH /tasks/:id/assign - should assign a user to a task', async () => {
  // 1. Create a task to assign
  const taskRes = await request(app)
    .post('/tasks')
    .send({ title: 'Assign Test', priority: 'medium' });
  
  const taskId = taskRes.body.id;

  // 2. Assign a user
  const assignRes = await request(app)
    .patch(`/tasks/${taskId}/assign`)
    .send({ assignee: 'Sakshya' });

  expect(assignRes.statusCode).toBe(200);
  expect(assignRes.body.assignee).toBe('Sakshya');
});

it('PATCH /tasks/:id/assign - should return 400 for empty assignee', async () => {
  const res = await request(app)
    .patch('/tasks/some-id/assign')
    .send({ assignee: '' });
  
  expect(res.statusCode).toBe(400);
});
// Test PUT /tasks/:id
  it('should update a task fully', async () => {
    const task = await request(app).post('/tasks').send({ title: 'Update Me' });
    const res = await request(app)
      .put(`/tasks/${task.body.id}`)
      .send({ title: 'Updated Title', priority: 'low', status: 'in_progress' });
    
    expect(res.statusCode).toBe(200);
    expect(res.body.title).toBe('Updated Title');
  });

  // Test PATCH /tasks/:id/complete
  it('should mark a task as complete', async () => {
    const task = await request(app).post('/tasks').send({ title: 'Finish Me' });
    const res = await request(app).patch(`/tasks/${task.body.id}/complete`);
    
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('done'); // check if your API uses 'done' or 'completed'
    expect(res.body.completedAt).not.toBeNull();
  });

  // Test DELETE /tasks/:id
  it('should delete a task', async () => {
    const task = await request(app).post('/tasks').send({ title: 'Delete Me' });
    const res = await request(app).delete(`/tasks/${task.body.id}`);
    expect(res.statusCode).toBe(204);

    // Verify it's gone
    const check = await request(app).get('/tasks');
    const exists = check.body.some(t => t.id === task.body.id);
    expect(exists).toBe(false);
  });

  // Edge Case: 404 for non-existent task
  it('should return 404 for non-existent task operations', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const res = await request(app).get(`/tasks/${fakeId}`);
    // If your API supports GET by ID, check for 404. 
    // Otherwise, check DELETE or PUT.
    const delRes = await request(app).delete(`/tasks/${fakeId}`);
    expect(delRes.statusCode).toBe(404);
  });
  describe('Validation Edge Cases', () => {
  // Hits the "invalid status" line
  it('should return 400 for invalid status', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'Valid Title', status: 'not-a-status' });
    expect(res.statusCode).toBe(400);
  });

  // Hits the "invalid priority" line
  it('should return 400 for invalid priority', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'Valid Title', priority: 'extreme' });
    expect(res.statusCode).toBe(400);
  });

  // Hits the "invalid dueDate" line
  it('should return 400 for invalid dueDate', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'Valid Title', dueDate: 'yesterday' });
    expect(res.statusCode).toBe(400);
  });

  // Hits validateUpdateTask specific logic
  it('should return 400 when updating with empty title', async () => {
    const task = await request(app).post('/tasks').send({ title: 'Original' });
    const res = await request(app)
      .put(`/tasks/${task.body.id}`)
      .send({ title: '' });
    expect(res.statusCode).toBe(400);
  });
});
});