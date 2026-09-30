const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');
const { validateAssignee } = require('../src/utils/validators');

beforeEach(() => taskService._reset());

const newTask = async () => (await request(app).post('/tasks').send({ title: 'sample' })).body;
const assign = (id, body) => request(app).patch(`/tasks/${id}/assign`).send(body);

describe('PATCH /tasks/:id/assign', () => {
  test('new tasks start unassigned', async () => {
    expect((await newTask()).assignee).toBeNull();
  });

  test('200 and returns the updated task', async () => {
    const t = await newTask();
    const res = await assign(t.id, { assignee: 'Pranav' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: t.id, title: 'sample', assignee: 'Pranav' });
  });

  test('persists the assignee (visible through GET)', async () => {
    const t = await newTask();
    await assign(t.id, { assignee: 'Pranav' });
    const list = (await request(app).get('/tasks')).body;
    expect(list[0].assignee).toBe('Pranav');
  });

  test('trims surrounding whitespace', async () => {
    const t = await newTask();
    expect((await assign(t.id, { assignee: '  Pranav  ' })).body.assignee).toBe('Pranav');
  });

  test('404 for an unknown task', async () => {
    const res = await assign('does-not-exist', { assignee: 'Pranav' });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Task not found');
  });

  test.each([
    ['empty string', { assignee: '' }],
    ['whitespace only', { assignee: '   ' }],
    ['missing field', {}],
    ['null', { assignee: null }],
    ['number', { assignee: 42 }],
    ['array', { assignee: ['a'] }],
    ['object', { assignee: { name: 'a' } }],
    ['over 100 chars', { assignee: 'x'.repeat(101) }],
  ])('400 for %s', async (_label, body) => {
    const t = await newTask();
    const res = await assign(t.id, body);
    expect(res.status).toBe(400);
    expect(res.body.error).toEqual(expect.any(String));
    // and the task must be left untouched
    expect(taskService.findById(t.id).assignee).toBeNull();
  });

  test('re-assigning an already-assigned task replaces the assignee', async () => {
    const t = await newTask();
    await assign(t.id, { assignee: 'Alice' });
    const res = await assign(t.id, { assignee: 'Bob' });
    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Bob');
  });

  test('assigning the same person twice is idempotent', async () => {
    const t = await newTask();
    await assign(t.id, { assignee: 'Alice' });
    const res = await assign(t.id, { assignee: 'Alice' });
    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Alice');
  });

  test('does not touch other fields (status, priority, completedAt)', async () => {
    const t = (await request(app).post('/tasks').send({ title: 'x', priority: 'high', status: 'in_progress' })).body;
    const res = await assign(t.id, { assignee: 'Alice' });
    expect(res.body).toMatchObject({ priority: 'high', status: 'in_progress', completedAt: null });
  });
});

describe('taskService.assign (unit)', () => {
  test('returns null for unknown id', () => {
    expect(taskService.assign('nope', 'Alice')).toBeNull();
  });
});

describe('validateAssignee (unit)', () => {
  test('accepts a normal name and a name exactly 100 chars long', () => {
    expect(validateAssignee({ assignee: 'Alice' })).toBeNull();
    expect(validateAssignee({ assignee: 'x'.repeat(100) })).toBeNull();
  });
  test('handles an undefined body without throwing', () => {
    expect(validateAssignee(undefined)).toEqual(expect.any(String));
  });
});
