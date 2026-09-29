/*
  what we are testing: all the task api routes via http
  why: making sure the routes respond correctly end to end,
  validations work, edge cases dont crash the server,
  and the bugs we found are documented with failing tests

  this is integration testing as we are testing things in a flow
  like all or many things are there coupled while we are tesing
*/

const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

// rest tasks before each test so nothing leaks between them
beforeEach(() => {
  taskService._reset();
});

// GET /tasks

describe('GET /tasks', () => {
  it('returns empty array when no tasks', async () => {
    const res = await request(app).get('/tasks');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns all tasks', async () => {
    await request(app).post('/tasks').send({ title: 'one' });
    await request(app).post('/tasks').send({ title: 'two' });

    const res = await request(app).get('/tasks');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });
});

// GET /tasks?status= 

describe('GET /tasks?status=', () => {
  it('filters tasks by status', async () => {
    await request(app).post('/tasks').send({ title: 'todo task', status: 'todo' });
    await request(app).post('/tasks').send({ title: 'done task', status: 'done' });

    const res = await request(app).get('/tasks?status=todo');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('todo task');
  });

  it('returns empty array for unknown status', async () => {
    await request(app).post('/tasks').send({ title: 'some task' });
    const res = await request(app).get('/tasks?status=blahblah');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]); // no error, just empty - worth knowing
  });

  // was a bug - .includes() matched partial strings
  // fixed: now uses === so this returns empty
  it('partial status string should not match any tasks', async () => {
    await request(app).post('/tasks').send({ title: 'a task', status: 'todo' });
    const res = await request(app).get('/tasks?status=tod');
    expect(res.body).toHaveLength(0); // no match after fix
  });
});

// ─── GET /tasks?page=&limit= 

describe('GET /tasks?page=&limit=', () => {
  beforeEach(async () => {
    for (let i = 1; i <= 5; i++) {
      await request(app).post('/tasks').send({ title: `task ${i}` });
    }
  });

  // observation: pagination bug - page 1 should return first items
  // but offset = page * limit so page 1 skips the first chunk
  it('bug: page=1 skips first results instead of returning them', async () => {
    const res = await request(app).get('/tasks?page=1&limit=2');
    expect(res.status).toBe(200);
    expect(res.body[0].title).toBe('task 3'); // skipped task 1 and 2
  });

  it('returns correct results with page=0', async () => {
    const res = await request(app).get('/tasks?page=0&limit=2');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].title).toBe('task 1');
  });
});

//  GET /tasks/stats

describe('GET /tasks/stats', () => {
  it('returns counts for all statuses', async () => {
    await request(app).post('/tasks').send({ title: 'a', status: 'todo' });
    await request(app).post('/tasks').send({ title: 'b', status: 'done' });

    const res = await request(app).get('/tasks/stats');
    expect(res.status).toBe(200);
    expect(res.body.todo).toBe(1);
    expect(res.body.done).toBe(1);
    expect(res.body.in_progress).toBe(0);
  });

  it('counts overdue tasks', async () => {
    await request(app).post('/tasks').send({ title: 'overdue', dueDate: '2020-01-01' });
    const res = await request(app).get('/tasks/stats');
    expect(res.body.overdue).toBe(1);
  });
});

//  POST /tasks 

describe('POST /tasks', () => {
  it('creates a task and returns 201', async () => {
    const res = await request(app).post('/tasks').send({ title: 'new task' });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('new task');
    expect(res.body.id).toBeDefined();
  });

  it('returns 400 when title is missing', async () => {
    const res = await request(app).post('/tasks').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('returns 400 when title is empty string', async () => {
    const res = await request(app).post('/tasks').send({ title: '' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid status', async () => {
    const res = await request(app).post('/tasks').send({ title: 'ok', status: 'invalid' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid priority', async () => {
    const res = await request(app).post('/tasks').send({ title: 'ok', priority: 'urgent' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid dueDate', async () => {
    const res = await request(app).post('/tasks').send({ title: 'ok', dueDate: 'not-a-date' });
    expect(res.status).toBe(400);
  });

  // observation: empty string on status/priority is falsy so validator skips it
  // this is a bug - empty string should be rejected
  it('bug: status empty string passes validation and gets stored', async () => {
    const res = await request(app).post('/tasks').send({ title: 'ok', status: '' });
    expect(res.status).toBe(400); // this will fail - empty string slips through
  });

  it('bug: priority empty string passes validation and gets stored', async () => {
    const res = await request(app).post('/tasks').send({ title: 'ok', priority: '' });
    expect(res.status).toBe(400); // this will fail - same issue
  });

  // observation: dueDate empty string slips through and stored as "" not null
  it('bug: dueDate empty string gets stored instead of null', async () => {
    const res = await request(app).post('/tasks').send({ title: 'ok', dueDate: '' });
    expect(res.status).toBe(400); // will fail - empty string is falsy, check skipped
  });
});

//  PUT /tasks/:id 

describe('PUT /tasks/:id', () => {
  it('updates task and returns updated task', async () => {
    const created = await request(app).post('/tasks').send({ title: 'old' });
    const id = created.body.id;

    const res = await request(app).put(`/tasks/${id}`).send({ title: 'new' });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('new');
  });

  it('returns 404 for non existent id', async () => {
    const res = await request(app).put('/tasks/fake-id').send({ title: 'x' });
    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid status in update', async () => {
    const created = await request(app).post('/tasks').send({ title: 'task' });
    const res = await request(app).put(`/tasks/${created.body.id}`).send({ status: 'bad' });
    expect(res.status).toBe(400);
  });

  it('does not overwrite fields that are not sent', async () => {
    const created = await request(app).post('/tasks').send({ title: 'task', priority: 'high' });
    const res = await request(app).put(`/tasks/${created.body.id}`).send({ title: 'updated' });
    expect(res.body.priority).toBe('high');
  });
});

//  DELETE /tasks/:id

describe('DELETE /tasks/:id', () => {
  it('deletes task and returns 204', async () => {
    const created = await request(app).post('/tasks').send({ title: 'bye' });
    const res = await request(app).delete(`/tasks/${created.body.id}`);
    expect(res.status).toBe(204);
  });

  it('returns 404 for non existent id', async () => {
    const res = await request(app).delete('/tasks/fake-id');
    expect(res.status).toBe(404);
  });

  it('task is actually gone after delete', async () => {
    const created = await request(app).post('/tasks').send({ title: 'gone' });
    await request(app).delete(`/tasks/${created.body.id}`);

    const all = await request(app).get('/tasks');
    expect(all.body).toHaveLength(0);
  });
});

//  PATCH /tasks/:id/complete

describe('PATCH /tasks/:id/complete', () => {
  it('marks task as done', async () => {
    const created = await request(app).post('/tasks').send({ title: 'finish me' });
    const res = await request(app).patch(`/tasks/${created.body.id}/complete`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('done');
    expect(res.body.completedAt).not.toBeNull();
  });

  it('returns 404 for non existent id', async () => {
    const res = await request(app).patch('/tasks/fake-id/complete');
    expect(res.status).toBe(404);
  });

  // observation: completeTask always resets priority to medium
  // high priority task silently becomes medium - prob not intentional
  it('bug: completing a high priority task resets priority to medium', async () => {
    const created = await request(app).post('/tasks').send({ title: 'urgent', priority: 'high' });
    const res = await request(app).patch(`/tasks/${created.body.id}/complete`);
    expect(res.body.priority).toBe('high'); // will fail - gets reset to medium
  });
});
