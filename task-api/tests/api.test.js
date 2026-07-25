const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

beforeEach(() => {
  taskService._reset();
});

describe('Task API Integration', () => {
  describe('POST /tasks', () => {
    it('should create a new task and return 201', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'New Task' })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.title).toBe('New Task');
      expect(res.body.status).toBe('todo');
      expect(res.body.priority).toBe('medium');
    });

    it('should create a task with all fields', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({
          title: 'Full Task',
          description: 'Description here',
          status: 'in_progress',
          priority: 'high',
          dueDate: '2026-12-31T00:00:00.000Z',
        })
        .expect(201);

      expect(res.body.title).toBe('Full Task');
      expect(res.body.description).toBe('Description here');
      expect(res.body.status).toBe('in_progress');
      expect(res.body.priority).toBe('high');
      expect(res.body.dueDate).toBe('2026-12-31T00:00:00.000Z');
    });

    it('should return 400 when title is missing', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({})
        .expect(400);

      expect(res.body.error).toContain('title');
    });

    it('should return 400 for empty title', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: '' })
        .expect(400);

      expect(res.body.error).toBeTruthy();
    });

    it('should return 400 for invalid status', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'Test', status: 'invalid' })
        .expect(400);

      expect(res.body.error).toContain('status');
    });

    it('should return 400 for invalid priority', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'Test', priority: 'urgent' })
        .expect(400);

      expect(res.body.error).toContain('priority');
    });

    it('should return 400 for invalid dueDate', async () => {
      await request(app)
        .post('/tasks')
        .send({ title: 'Test', dueDate: 'not-a-date' })
        .expect(400);
    });

    it('should return 400 for empty body', async () => {
      await request(app)
        .post('/tasks')
        .send({})
        .expect(400);
    });
  });

  describe('GET /tasks', () => {
    it('should return empty array when no tasks exist', async () => {
      const res = await request(app).get('/tasks').expect(200);
      expect(res.body).toEqual([]);
    });

    it('should return all tasks', async () => {
      await request(app).post('/tasks').send({ title: 'Task 1' });
      await request(app).post('/tasks').send({ title: 'Task 2' });

      const res = await request(app).get('/tasks').expect(200);
      expect(res.body.length).toBe(2);
    });

    it('should filter tasks by status', async () => {
      await request(app).post('/tasks').send({ title: 'Todo', status: 'todo' });
      await request(app)
        .post('/tasks')
        .send({ title: 'Done', status: 'done' });

      const res = await request(app).get('/tasks?status=todo').expect(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].title).toBe('Todo');
    });

    it('should paginate results', async () => {
      for (let i = 1; i <= 15; i++) {
        await request(app).post('/tasks').send({ title: `Task ${i}` });
      }

      const res = await request(app)
        .get('/tasks?page=1&limit=5')
        .expect(200);
      expect(res.body.length).toBe(5);
    });

    it('should handle page parameter only (default limit 10)', async () => {
      for (let i = 1; i <= 12; i++) {
        await request(app).post('/tasks').send({ title: `Task ${i}` });
      }

      const res = await request(app).get('/tasks?page=1&limit=10').expect(200);
      expect(res.body.length).toBe(10);
    });
  });

  describe('PUT /tasks/:id', () => {
    it('should update an existing task', async () => {
      const createRes = await request(app)
        .post('/tasks')
        .send({ title: 'Original' });

      const res = await request(app)
        .put(`/tasks/${createRes.body.id}`)
        .send({ title: 'Updated' })
        .expect(200);

      expect(res.body.title).toBe('Updated');
    });

    it('should return 404 for non-existent task', async () => {
      await request(app)
        .put('/tasks/non-existent-id')
        .send({ title: 'X' })
        .expect(404);
    });

    it('should return 400 for invalid update body', async () => {
      const createRes = await request(app)
        .post('/tasks')
        .send({ title: 'Test' });

      await request(app)
        .put(`/tasks/${createRes.body.id}`)
        .send({ title: '' })
        .expect(400);
    });

    it('should preserve fields not in the update', async () => {
      const createRes = await request(app)
        .post('/tasks')
        .send({ title: 'T', description: 'Keep this' });

      const res = await request(app)
        .put(`/tasks/${createRes.body.id}`)
        .send({ title: 'New' })
        .expect(200);

      expect(res.body.description).toBe('Keep this');
    });
  });

  describe('DELETE /tasks/:id', () => {
    it('should delete an existing task and return 204', async () => {
      const createRes = await request(app)
        .post('/tasks')
        .send({ title: 'Delete Me' });

      await request(app)
        .delete(`/tasks/${createRes.body.id}`)
        .expect(204);
    });

    it('should return 404 when deleting non-existent task', async () => {
      await request(app).delete('/tasks/fake-id').expect(404);
    });

    it('should not affect other tasks after deletion', async () => {
      const t1 = await request(app)
        .post('/tasks')
        .send({ title: 'Keep' });
      const t2 = await request(app)
        .post('/tasks')
        .send({ title: 'Remove' });

      await request(app).delete(`/tasks/${t2.body.id}`).expect(204);

      const res = await request(app).get('/tasks').expect(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].title).toBe('Keep');
    });
  });

  describe('PATCH /tasks/:id/complete', () => {
    it('should mark a task as done', async () => {
      const createRes = await request(app)
        .post('/tasks')
        .send({ title: 'Complete Me' });

      const res = await request(app)
        .patch(`/tasks/${createRes.body.id}/complete`)
        .expect(200);

      expect(res.body.status).toBe('done');
      expect(res.body.completedAt).toBeTruthy();
    });

    it('should return 404 for non-existent task', async () => {
      await request(app).patch('/tasks/fake-id/complete').expect(404);
    });

    it('should preserve priority when completing', async () => {
      const createRes = await request(app)
        .post('/tasks')
        .send({ title: 'High', priority: 'high' });

      const res = await request(app)
        .patch(`/tasks/${createRes.body.id}/complete`)
        .expect(200);

      expect(res.body.priority).toBe('high');
    });

    it('should preserve title and description', async () => {
      const createRes = await request(app)
        .post('/tasks')
        .send({ title: 'Important', description: 'Critical' });

      const res = await request(app)
        .patch(`/tasks/${createRes.body.id}/complete`)
        .expect(200);

      expect(res.body.title).toBe('Important');
      expect(res.body.description).toBe('Critical');
    });
  });

  describe('GET /tasks/stats', () => {
    it('should return zero counts when no tasks exist', async () => {
      const res = await request(app).get('/tasks/stats').expect(200);
      expect(res.body).toEqual({ todo: 0, in_progress: 0, done: 0, overdue: 0 });
    });

    it('should return correct counts by status', async () => {
      await request(app).post('/tasks').send({ title: 'T1', status: 'todo' });
      await request(app).post('/tasks').send({ title: 'T2', status: 'todo' });
      await request(app)
        .post('/tasks')
        .send({ title: 'T3', status: 'in_progress' });
      await request(app).post('/tasks').send({ title: 'T4', status: 'done' });

      const res = await request(app).get('/tasks/stats').expect(200);
      expect(res.body.todo).toBe(2);
      expect(res.body.in_progress).toBe(1);
      expect(res.body.done).toBe(1);
    });

    it('should count overdue tasks', async () => {
      await request(app).post('/tasks').send({
        title: 'Overdue',
        status: 'todo',
        dueDate: '2020-01-01T00:00:00.000Z',
      });
      await request(app).post('/tasks').send({
        title: 'Not Overdue',
        status: 'done',
        dueDate: '2020-01-01T00:00:00.000Z',
      });

      const res = await request(app).get('/tasks/stats').expect(200);
      expect(res.body.overdue).toBe(1);
    });
  });

  describe('PATCH /tasks/:id/assign', () => {
    it('should assign a task to a user and return updated task', async () => {
      const createRes = await request(app)
        .post('/tasks')
        .send({ title: 'Assignable' });

      const res = await request(app)
        .patch(`/tasks/${createRes.body.id}/assign`)
        .send({ assignee: 'Alice' })
        .expect(200);

      expect(res.body.assignee).toBe('Alice');
      expect(res.body).toHaveProperty('assignedAt');
    });

    it('should return 404 for non-existent task', async () => {
      const res = await request(app)
        .patch('/tasks/fake-id/assign')
        .send({ assignee: 'Alice' })
        .expect(404);

      expect(res.body.error).toBe('Task not found');
    });

    it('should return 400 when assignee is missing', async () => {
      const createRes = await request(app)
        .post('/tasks')
        .send({ title: 'Test' });

      await request(app)
        .patch(`/tasks/${createRes.body.id}/assign`)
        .send({})
        .expect(400);
    });

    it('should return 400 for empty string assignee', async () => {
      const createRes = await request(app)
        .post('/tasks')
        .send({ title: 'Test' });

      await request(app)
        .patch(`/tasks/${createRes.body.id}/assign`)
        .send({ assignee: '' })
        .expect(400);
    });

    it('should return 400 for whitespace-only assignee', async () => {
      const createRes = await request(app)
        .post('/tasks')
        .send({ title: 'Test' });

      await request(app)
        .patch(`/tasks/${createRes.body.id}/assign`)
        .send({ assignee: '   ' })
        .expect(400);
    });

    it('should trim whitespace from assignee name', async () => {
      const createRes = await request(app)
        .post('/tasks')
        .send({ title: 'Test' });

      const res = await request(app)
        .patch(`/tasks/${createRes.body.id}/assign`)
        .send({ assignee: '  Alice  ' })
        .expect(200);

      expect(res.body.assignee).toBe('Alice');
    });

    it('should allow reassignment to a different user', async () => {
      const createRes = await request(app)
        .post('/tasks')
        .send({ title: 'Reassign' });

      await request(app)
        .patch(`/tasks/${createRes.body.id}/assign`)
        .send({ assignee: 'Alice' })
        .expect(200);

      const res = await request(app)
        .patch(`/tasks/${createRes.body.id}/assign`)
        .send({ assignee: 'Bob' })
        .expect(200);

      expect(res.body.assignee).toBe('Bob');
    });

    it('should preserve other task fields after assignment', async () => {
      const createRes = await request(app)
        .post('/tasks')
        .send({
          title: 'Keep Fields',
          priority: 'high',
          description: 'Important',
        });

      const res = await request(app)
        .patch(`/tasks/${createRes.body.id}/assign`)
        .send({ assignee: 'Alice' })
        .expect(200);

      expect(res.body.title).toBe('Keep Fields');
      expect(res.body.priority).toBe('high');
      expect(res.body.description).toBe('Important');
      expect(res.body.status).toBe('todo');
    });
  });
});
