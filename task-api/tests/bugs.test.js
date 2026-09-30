// Each test here asserts the CORRECT behaviour for one bug found while testing.
// See BUG_REPORT.md for the write-up.
//
// BUG-1 (pagination) is FIXED, its tests live in the normal suites.
// BUG-2..8 are documented but intentionally not fixed (the brief asks for one fix).
// They use `test.failing`: the suite stays green while the bug exists, and turns
// RED the moment someone fixes it, which is the cue to change it to a normal `test`.
const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

beforeEach(() => taskService._reset());

describe('BUG-2: status filter uses substring matching', () => {
  test.failing('?status=do must not match "todo" or "done"', async () => {
    taskService.create({ title: 'a', status: 'todo' });
    taskService.create({ title: 'b', status: 'done' });
    const res = await request(app).get('/tasks?status=do');
    expect(res.body).toHaveLength(0);
  });
});

describe('BUG-3: completing a task silently resets priority', () => {
  test.failing('priority is preserved on complete', () => {
    const t = taskService.create({ title: 'a', priority: 'high' });
    expect(taskService.completeTask(t.id).priority).toBe('high');
  });
});

describe('BUG-4: PUT can overwrite immutable / server-managed fields', () => {
  test.failing('id cannot be changed via PUT', async () => {
    const t = taskService.create({ title: 'a' });
    const res = await request(app).put(`/tasks/${t.id}`).send({ id: 'hijacked', createdAt: '1999-01-01' });
    expect(res.body.id).toBe(t.id);
    expect(res.body.createdAt).toBe(t.createdAt);
  });
});

describe('BUG-5: malformed JSON returns 500 instead of 400', () => {
  test.failing('client error is reported as a client error', async () => {
    const res = await request(app).post('/tasks').set('Content-Type', 'application/json').send('{"title": ');
    expect(res.status).toBe(400);
  });
});

describe('BUG-6: empty-string status/priority slips past validation', () => {
  test.failing('POST with status "" is rejected', async () => {
    const res = await request(app).post('/tasks').send({ title: 'a', status: '' });
    expect(res.status).toBe(400);
  });
});

describe('BUG-7: pagination params are not sanitised', () => {
  test.failing('negative page does not produce a negative slice offset', async () => {
    for (let i = 1; i <= 3; i++) taskService.create({ title: `t${i}` });
    const res = await request(app).get('/tasks?page=-1&limit=2');
    // Either a 400 or a clamped first page is acceptable; garbage slices are not.
    if (res.status === 200) expect(res.body.map((t) => t.title)).toEqual(['t1', 't2']);
    else expect(res.status).toBe(400);
  });
});

describe('BUG-8: PUT to status "done" never sets completedAt', () => {
  test.failing('completedAt is populated when status becomes done', async () => {
    const t = taskService.create({ title: 'a' });
    const res = await request(app).put(`/tasks/${t.id}`).send({ status: 'done' });
    expect(res.body.completedAt).not.toBeNull();
  });
});
