const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

// clean the list before every test
beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  taskService._reset();
});

// helper to create a task
const makeTask = async () => {
  const res = await request(app).post('/tasks').send({ title: 'Write tests' });
  return res.body;
};

describe('GET /tasks', () => {
  it('returns an empty list when there are no tasks', async () => {
    const res = await request(app).get('/tasks');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns all tasks', async () => {
    await makeTask();
    await makeTask();

    const res = await request(app).get('/tasks');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it('filters tasks by status', async () => {
    await makeTask();
    await request(app).post('/tasks').send({ title: 'Done task', status: 'done' });

    const res = await request(app).get('/tasks?status=todo');
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Write tests');
  });
});

describe('POST /tasks', () => {
  it('creates a task', async () => {
    const res = await request(app).post('/tasks').send({ title: 'Write tests' });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Write tests');
    expect(res.body.status).toBe('todo');
  });

  it('returns 400 when title is missing', async () => {
    const res = await request(app).post('/tasks').send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  it('returns 400 when status or priority is not valid', async () => {
    const badStatus = await request(app).post('/tasks').send({ title: 'x', status: 'urgent' });
    expect(badStatus.status).toBe(400);

    const badPriority = await request(app).post('/tasks').send({ title: 'x', priority: 'urgent' });
    expect(badPriority.status).toBe(400);
  });
});

describe('PUT /tasks/:id', () => {
  it('updates a task', async () => {
    const task = await makeTask();

    const res = await request(app).put(`/tasks/${task.id}`).send({ title: 'New title' });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('New title');
  });

  it('returns 404 when the task does not exist', async () => {
    const res = await request(app).put('/tasks/wrong-id').send({ title: 'x' });

    expect(res.status).toBe(404);
  });

  it('returns 400 when priority or dueDate is not valid', async () => {
    const task = await makeTask();

    const badPriority = await request(app).put(`/tasks/${task.id}`).send({ priority: 'urgent' });
    expect(badPriority.status).toBe(400);

    const badDueDate = await request(app).put(`/tasks/${task.id}`).send({ dueDate: 'not-a-date' });
    expect(badDueDate.status).toBe(400);
  });
});

describe('DELETE /tasks/:id', () => {
  it('deletes a task', async () => {
    const task = await makeTask();

    const res = await request(app).delete(`/tasks/${task.id}`);

    expect(res.status).toBe(204);
  });

  it('returns 404 when the task does not exist', async () => {
    const res = await request(app).delete('/tasks/wrong-id');

    expect(res.status).toBe(404);
  });
});

describe('PATCH /tasks/:id/complete', () => {
  it('marks a task as complete', async () => {
    const task = await makeTask();

    const res = await request(app).patch(`/tasks/${task.id}/complete`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('done');
    expect(res.body.completedAt).toBeTruthy();
  });

  it('keeps the priority when completing a task', async () => {
    const created = await request(app).post('/tasks').send({ title: 'Urgent', priority: 'high' });

    const res = await request(app).patch(`/tasks/${created.body.id}/complete`);

    expect(res.status).toBe(200);
    expect(res.body.priority).toBe('high');
  });

  it('returns 404 when the task does not exist', async () => {
    const res = await request(app).patch('/tasks/wrong-id/complete');

    expect(res.status).toBe(404);
  });
});

describe('GET /tasks/stats', () => {
  it('returns stats', async () => {
    await makeTask();

    const res = await request(app).get('/tasks/stats');

    expect(res.status).toBe(200);
    expect(res.body.todo).toBe(1);
  });
});

describe('PATCH /tasks/:id/assign', () => {
  it('assigns a task to a user', async () => {
    const task = await makeTask();

    const res = await request(app).patch(`/tasks/${task.id}/assign`).send({ assignee: 'John' });

    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('John');
  });

  it('returns 400 when assignee is missing', async () => {
    const task = await makeTask();

    const res = await request(app).patch(`/tasks/${task.id}/assign`).send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  it('returns 404 when the task does not exist', async () => {
    const res = await request(app).patch('/tasks/wrong-id/assign').send({ assignee: 'John' });

    expect(res.status).toBe(404);
  });
});

describe('bad request body', () => {
  it('returns 500 when the body is not valid json', async () => {
    const res = await request(app)
      .post('/tasks')
      .set('Content-Type', 'application/json')
      .send('{not json');

    expect(res.status).toBe(500);
  });
});