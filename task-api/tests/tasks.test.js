const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

beforeEach(() => {
  taskService._reset();
});

// GET /tasks

describe('GET /tasks', () => {
  test('returns empty array when no tasks exist', async () => {
    const res = await request(app).get('/tasks');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('returns all tasks', async () => {
    taskService.create({ title: 'Task 1' });
    taskService.create({ title: 'Task 2' });
    const res = await request(app).get('/tasks');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });
});

// GET /tasks?status= 

describe('GET /tasks?status=', () => {
  test('returns only tasks with matching status', async () => {
    taskService.create({ title: 'Todo task', status: 'todo' });
    taskService.create({ title: 'Done task', status: 'done' });
    const res = await request(app).get('/tasks?status=todo');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].status).toBe('todo');
  });

  test('returns empty array when no tasks match status', async () => {
    taskService.create({ title: 'Todo task', status: 'todo' });
    const res = await request(app).get('/tasks?status=done');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

// GET /tasks?page=&limit= 

describe('GET /tasks?page=&limit=', () => {
  beforeEach(() => {
    for (let i = 1; i <= 5; i++) {
      taskService.create({ title: `Task ${i}` });
    }
  });

  // This test WILL FAIL — exposes the pagination bug at the route level
  test('page 1 limit 2 returns first 2 tasks', async () => {
    const res = await request(app).get('/tasks?page=1&limit=2');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].title).toBe('Task 1');
  });

  test('returns tasks for page 2', async () => {
    const res = await request(app).get('/tasks?page=2&limit=2');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });
});

// GET /tasks/stats 

describe('GET /tasks/stats', () => {
  test('returns zero counts when no tasks exist', async () => {
    const res = await request(app).get('/tasks/stats');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ todo: 0, in_progress: 0, done: 0, overdue: 0 });
  });

  test('returns correct counts after creating tasks', async () => {
    taskService.create({ title: 'T1', status: 'todo' });
    taskService.create({ title: 'T2', status: 'in_progress' });
    const res = await request(app).get('/tasks/stats');
    expect(res.status).toBe(200);
    expect(res.body.todo).toBe(1);
    expect(res.body.in_progress).toBe(1);
  });
});

// POST /tasks 

describe('POST /tasks', () => {
  test('creates a task and returns 201 with the task', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'New task', priority: 'high' });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('New task');
    expect(res.body.priority).toBe('high');
    expect(res.body.id).toBeDefined();
  });

  test('returns 400 when title is missing', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ priority: 'high' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  test('returns 400 when title is empty string', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: '' });
    expect(res.status).toBe(400);
  });

  test('returns 400 when status is invalid', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'Task', status: 'invalid_status' });
    expect(res.status).toBe(400);
  });

  test('returns 400 when priority is invalid', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'Task', priority: 'urgent' });
    expect(res.status).toBe(400);
  });
});

// PUT /tasks/:id 

describe('PUT /tasks/:id', () => {
  test('updates an existing task and returns it', async () => {
    const task = taskService.create({ title: 'Original' });
    const res = await request(app)
      .put(`/tasks/${task.id}`)
      .send({ title: 'Updated' });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated');
  });

  test('returns 404 for non-existent task', async () => {
    const res = await request(app)
      .put('/tasks/non-existent-id')
      .send({ title: 'Updated' });
    expect(res.status).toBe(404);
  });

  test('returns 400 when title is empty string', async () => {
    const task = taskService.create({ title: 'Original' });
    const res = await request(app)
      .put(`/tasks/${task.id}`)
      .send({ title: '' });
    expect(res.status).toBe(400);
  });
});

// DELETE /tasks/:id 

describe('DELETE /tasks/:id', () => {
  test('deletes an existing task and returns 204', async () => {
    const task = taskService.create({ title: 'To delete' });
    const res = await request(app).delete(`/tasks/${task.id}`);
    expect(res.status).toBe(204);
  });

  test('returns 404 for non-existent task', async () => {
    const res = await request(app).delete('/tasks/non-existent-id');
    expect(res.status).toBe(404);
  });
});

// PATCH /tasks/:id/complete 

describe('PATCH /tasks/:id/complete', () => {
  test('marks a task as complete and returns it', async () => {
    const task = taskService.create({ title: 'Finish me' });
    const res = await request(app).patch(`/tasks/${task.id}/complete`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('done');
    expect(res.body.completedAt).not.toBeNull();
  });

  test('returns 404 for non-existent task', async () => {
    const res = await request(app).patch('/tasks/non-existent-id/complete');
    expect(res.status).toBe(404);
  });

  // This test WILL FAIL — exposes the priority reset bug at the route level
  test('does not change priority when completing a task', async () => {
    const task = taskService.create({ title: 'High priority', priority: 'high' });
    const res = await request(app).patch(`/tasks/${task.id}/complete`);
    expect(res.status).toBe(200);
    expect(res.body.priority).toBe('high');
  });
});

// PATCH /tasks/:id/assign 

describe('PATCH /tasks/:id/assign', () => {
  test('assigns a task and returns the updated task', async () => {
    const task = taskService.create({ title: 'Task to assign' });
    const res = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: 'Abhinav' });
    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Abhinav');
    expect(res.body.id).toBe(task.id);
  });

  test('returns 404 for non-existent task', async () => {
    const res = await request(app)
      .patch('/tasks/non-existent-id/assign')
      .send({ assignee: 'Abhinav' });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Task not found');
  });

  test('returns 400 when assignee is empty string', async () => {
    const task = taskService.create({ title: 'Task' });
    const res = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: '' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  test('returns 400 when assignee is missing from body', async () => {
    const task = taskService.create({ title: 'Task' });
    const res = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  test('trims whitespace from assignee name', async () => {
    const task = taskService.create({ title: 'Task' });
    const res = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: '  Abhinav  ' });
    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Abhinav');
  });

  test('allows reassigning an already assigned task', async () => {
    const task = taskService.create({ title: 'Task' });
    await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: 'Abhinav' });
    const res = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: 'Rohit' });
    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Rohit');
  });
});