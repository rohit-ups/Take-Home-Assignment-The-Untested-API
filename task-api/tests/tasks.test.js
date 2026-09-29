const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

describe('Task API - Full Coverage (Day 1 + Day 2)', () => {
  beforeEach(() => {
    taskService._reset();
  });


  describe('taskService unit tests', () => {
    test('create and getAll', () => {
      const t = taskService.create({ title: 'Unit Test' });
      expect(t.id).toBeDefined();
      expect(taskService.getAll().length).toBe(1);
    });

    test('findById returns task', () => {
      const created = taskService.create({ title: 'Find Me' });
      const found = taskService.findById(created.id);
      expect(found.title).toBe('Find Me');
    });

    test('findById returns undefined for unknown', () => {
      expect(taskService.findById('nope')).toBeUndefined();
    });

    test('getByStatus exact match', () => {
      taskService.create({ title: 'A', status: 'todo' });
      taskService.create({ title: 'B', status: 'done' });
      expect(taskService.getByStatus('todo').length).toBe(1);
      expect(taskService.getByStatus('do').length).toBe(0); // should NOT partial match
    });

    test('getPaginated offset (page-1)*limit', () => {
      for(let i=1;i<=5;i++) taskService.create({ title: `T${i}` });
      const page1 = taskService.getPaginated(1,2);
      expect(page1[0].title).toBe('T1');
      const page2 = taskService.getPaginated(2,2);
      expect(page2[0].title).toBe('T3');
    });

    test('getStats counts', () => {
      taskService.create({ title: '1', status: 'todo' });
      taskService.create({ title: '2', status: 'in_progress' });
      taskService.create({ title: '3', status: 'done' });
      const stats = taskService.getStats();
      expect(stats.todo).toBe(1);
      expect(stats.in_progress).toBe(1);
      expect(stats.done).toBe(1);
    });

    test('update and remove', () => {
      const t = taskService.create({ title: 'Old' });
      const updated = taskService.update(t.id, { title: 'New' });
      expect(updated.title).toBe('New');
      expect(taskService.remove(t.id)).toBe(true);
      expect(taskService.getAll().length).toBe(0);
    });

    test('complete preserves priority', () => {
      const t = taskService.create({ title: 'High', priority: 'high' });
      const completed = taskService.completeTask(t.id);
      expect(completed.status).toBe('done');
      expect(completed.priority).toBe('high'); // should NOT become medium
      expect(completed.completedAt).toBeTruthy();
    });

    test('assignTask', () => {
      const t = taskService.create({ title: 'Assign' });
      const assigned = taskService.assignTask(t.id, 'vraj');
      expect(assigned.assignee).toBe('vraj');
    });
  });

  // --- INTEGRATION TESTS ---
  describe('API Integration', () => {
    test('GET /tasks - empty initially', async () => {
      const res = await request(app).get('/tasks');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    test('POST /tasks - happy path', async () => {
      const res = await request(app).post('/tasks').send({ title: 'My Task' });
      expect(res.status).toBe(201);
      expect(res.body.title).toBe('My Task');
      expect(res.body.id).toBeDefined();
    });

    test('POST /tasks - edge: missing title -> 400', async () => {
      const res = await request(app).post('/tasks').send({ description: 'no title' });
      expect(res.status).toBe(400);
    });

    test('POST /tasks - edge: invalid status -> 400', async () => {
      const res = await request(app).post('/tasks').send({ title: 'Bad', status: 'invalid_status' });
      expect(res.status).toBe(400);
    });

    test('GET /tasks?status=todo - filter', async () => {
      await request(app).post('/tasks').send({ title: 'Todo1', status: 'todo' });
      await request(app).post('/tasks').send({ title: 'Done1', status: 'done' });
      const res = await request(app).get('/tasks?status=todo');
      expect(res.body.length).toBe(1);
      expect(res.body[0].status).toBe('todo');
    });

    test('GET /tasks?page=1&limit=2 - pagination', async () => {
      for(let i=1;i<=5;i++) await request(app).post('/tasks').send({ title: `Task ${i}` });
      const res = await request(app).get('/tasks?page=1&limit=2');
      expect(res.body.length).toBe(2);
      expect(res.body[0].title).toBe('Task 1');
    });

    test('GET /tasks?status=todo&page=1&limit=2 - combined', async () => {
      for(let i=1;i<=5;i++) await request(app).post('/tasks').send({ title: `Task ${i}`, status: 'todo' });
      await request(app).post('/tasks').send({ title: 'Other', status: 'done' });
      const res = await request(app).get('/tasks?status=todo&page=1&limit=2');
      expect(res.body.length).toBe(2);
    });

    test('GET /tasks/stats - happy', async () => {
      await request(app).post('/tasks').send({ title: 'One', status: 'todo' });
      const res = await request(app).get('/tasks/stats');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('todo');
      expect(res.body).toHaveProperty('overdue');
    });

    test('GET /tasks/:id - happy', async () => {
      const created = await request(app).post('/tasks').send({ title: 'ById' });
      const res = await request(app).get(`/tasks/${created.body.id}`);
      expect(res.status).toBe(200);
      expect(res.body.title).toBe('ById');
    });

    test('GET /tasks/:id - edge: not found -> 404', async () => {
      const res = await request(app).get('/tasks/non-existent-id');
      expect(res.status).toBe(404);
    });

    test('PUT /tasks/:id - happy', async () => {
      const created = await request(app).post('/tasks').send({ title: 'Old' });
      const res = await request(app).put(`/tasks/${created.body.id}`).send({ title: 'New Title' });
      expect(res.status).toBe(200);
      expect(res.body.title).toBe('New Title');
    });

    test('PUT /tasks/:id - edge: invalid dueDate -> 400', async () => {
      const created = await request(app).post('/tasks').send({ title: 'Test' });
      const res = await request(app).put(`/tasks/${created.body.id}`).send({ dueDate: 'not-a-date' });
      expect(res.status).toBe(400);
    });

    test('DELETE /tasks/:id - happy -> 204', async () => {
      const created = await request(app).post('/tasks').send({ title: 'ToDelete' });
      const res = await request(app).delete(`/tasks/${created.body.id}`);
      expect(res.status).toBe(204);
    });

    test('DELETE /tasks/:id - edge: not found -> 404', async () => {
      const res = await request(app).delete('/tasks/unknown');
      expect(res.status).toBe(404);
    });

    test('PATCH /tasks/:id/complete - preserves priority', async () => {
      const created = await request(app).post('/tasks').send({ title: 'High', priority: 'high' });
      const res = await request(app).patch(`/tasks/${created.body.id}/complete`);
      expect(res.status).toBe(200);
      expect(res.body.priority).toBe('high');
      expect(res.body.status).toBe('done');
      expect(res.body.completedAt).toBeTruthy();
    });

    test('PATCH /tasks/:id/complete - edge: not found -> 404', async () => {
      const res = await request(app).patch('/tasks/unknown/complete');
      expect(res.status).toBe(404);
    });

    test('PATCH /tasks/:id/assign - happy', async () => {
      const created = await request(app).post('/tasks').send({ title: 'Assign Me' });
      const res = await request(app).patch(`/tasks/${created.body.id}/assign`).send({ assignee: 'vraj' });
      expect(res.status).toBe(200);
      expect(res.body.assignee).toBe('vraj');
    });

    test('PATCH /tasks/:id/assign - edge: empty string -> 400', async () => {
      const created = await request(app).post('/tasks').send({ title: 'Assign' });
      const res = await request(app).patch(`/tasks/${created.body.id}/assign`).send({ assignee: '' });
      expect(res.status).toBe(400);
    });

    test('PATCH /tasks/:id/assign - edge: not found -> 404', async () => {
      const res = await request(app).patch('/tasks/unknown/assign').send({ assignee: 'vraj' });
      expect(res.status).toBe(404);
    });

    test('PATCH /tasks/:id/assign - edge: already assigned can re-assign', async () => {
      const created = await request(app).post('/tasks').send({ title: 'ReAssign' });
      await request(app).patch(`/tasks/${created.body.id}/assign`).send({ assignee: 'first' });
      const res = await request(app).patch(`/tasks/${created.body.id}/assign`).send({ assignee: 'second' });
      expect(res.body.assignee).toBe('second');
    });
  });
});
