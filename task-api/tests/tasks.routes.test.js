const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

describe('Task Routes Integration Tests', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('GET /tasks', () => {
    it('should return an empty array when no tasks exist', async () => {
      const res = await request(app).get('/tasks');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('should filter tasks by status', async () => {
      taskService.create({ title: 'T1', status: 'todo' });
      taskService.create({ title: 'T2', status: 'done' });

      const res = await request(app).get('/tasks?status=todo');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].title).toBe('T1');
    });

    it('should paginate tasks with page and limit query params', async () => {
      taskService.create({ title: 'T1' });
      taskService.create({ title: 'T2' });
      taskService.create({ title: 'T3' });

      const res = await request(app).get('/tasks?page=1&limit=2');
      expect(res.status).toBe(200);
      // Exposes off-by-one bug, for page 1 returns wrong items
      expect(res.body.length).toBe(2);
    });
  });

  describe('GET /tasks/stats', () => {
    it('should return task statistics', async () => {
      taskService.create({ title: 'T1', status: 'todo' });
      taskService.create({ title: 'T2', status: 'in_progress' });

      const res = await request(app).get('/tasks/stats');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        todo: 1,
        in_progress: 1,
        done: 0,
        overdue: 0,
      });
    });
  });

  describe('POST /tasks', () => {
    it('should create a task with valid body (201)', async () => {
      const payload = {
        title: 'New Integration Task',
        priority: 'high',
        status: 'todo',
      };

      const res = await request(app).post('/tasks').send(payload);
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.title).toBe(payload.title);
      expect(res.body.priority).toBe('high');
    });

    it('should return 400 if title is missing or empty', async () => {
      const res = await request(app).post('/tasks').send({ title: '   ' });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should return 400 if status is invalid', async () => {
      const res = await request(app).post('/tasks').send({ title: 'Valid', status: 'invalid_status' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('status must be one of');
    });

    it('should return 400 if priority is invalid', async () => {
      const res = await request(app).post('/tasks').send({ title: 'Valid', priority: 'urgent' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('priority must be one of');
    });

    it('should return 400 if dueDate is not a valid date', async () => {
      const res = await request(app).post('/tasks').send({ title: 'Valid', dueDate: 'invalid-date' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('dueDate must be a valid ISO date string');
    });
  });

  describe('PUT /tasks/:id', () => {
    it('should update an existing task (200)', async () => {
      const task = taskService.create({ title: 'Before' });
      const res = await request(app).put(`/tasks/${task.id}`).send({ title: 'After' });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('After');
    });

    it('should return 404 for unknown task id', async () => {
      const res = await request(app).put('/tasks/non-existent-id').send({ title: 'After' });
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });

    it('should return 400 if update payload is invalid', async () => {
      const task = taskService.create({ title: 'Valid' });
      const res = await request(app).put(`/tasks/${task.id}`).send({ priority: 'invalid-priority' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('DELETE /tasks/:id', () => {
    it('should delete an existing task (204)', async () => {
      const task = taskService.create({ title: 'To Delete' });
      const res = await request(app).delete(`/tasks/${task.id}`);

      expect(res.status).toBe(204);
      expect(taskService.findById(task.id)).toBeUndefined();
    });

    it('should return 404 when deleting a non-existent task', async () => {
      const res = await request(app).delete('/tasks/unknown-id');
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /tasks/:id/complete', () => {
    it('should mark task complete (200)', async () => {
      const task = taskService.create({ title: 'Finish this' });
      const res = await request(app).patch(`/tasks/${task.id}/complete`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('done');
      expect(res.body.completedAt).not.toBeNull();
    });

    it('should return 404 for unknown task id', async () => {
      const res = await request(app).patch('/tasks/unknown-id/complete');
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /tasks/:id/assign', () => {
  it('should assign a task and return trimmed assignee (200)', async () => {
    const task = taskService.create({ title: 'Assign Task' });
    const res = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: '  Alice Dev  ' });

    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Alice Dev');
  });

  it('should allow reassigning an already assigned task', async () => {
    const task = taskService.create({ title: 'Reassign Task' });
    taskService.assignTask(task.id, 'Alice');

    const res = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: 'Bob' });

    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Bob');
  });

  it('should return 404 if task id does not exist', async () => {
    const res = await request(app)
      .patch('/tasks/non-existent-id/assign')
      .send({ assignee: 'Alice' });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Task not found');
  });

  it('should return 400 for empty or whitespace-only assignee', async () => {
    const task = taskService.create({ title: 'Task' });
    const res = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: '   ' });

    expect(res.status).toBe(400);
  });

  it('should return 400 if assignee is not a string', async () => {
    const task = taskService.create({ title: 'Task' });
    const res = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: 12345 });

    expect(res.status).toBe(400);
  });
});
});