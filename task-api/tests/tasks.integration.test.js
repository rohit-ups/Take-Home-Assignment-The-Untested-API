const request = require('supertest');

const app = require('../src/app');
const taskService = require('../src/services/taskService');

describe('Task API', () => {
  beforeEach(() => {
    taskService._reset();
  });

  // =========================================================
  // GET /tasks
  // =========================================================

  describe('GET /tasks', () => {
    test('returns 200 with empty array when no tasks exist', async () => {
      const response = await request(app)
        .get('/tasks');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    test('returns all tasks', async () => {
      await request(app)
        .post('/tasks')
        .send({
          title: 'Task 1',
        });

      await request(app)
        .post('/tasks')
        .send({
          title: 'Task 2',
        });

      const response = await request(app)
        .get('/tasks');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
    });
  });

  // =========================================================
  // GET /tasks?status=
  // =========================================================

  describe('GET /tasks?status=', () => {
    beforeEach(async () => {
      await request(app)
        .post('/tasks')
        .send({
          title: 'Todo task',
          status: 'todo',
        });

      await request(app)
        .post('/tasks')
        .send({
          title: 'Progress task',
          status: 'in_progress',
        });

      await request(app)
        .post('/tasks')
        .send({
          title: 'Done task',
          status: 'done',
        });
    });

    test('filters todo tasks', async () => {
      const response = await request(app)
        .get('/tasks?status=todo');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].status).toBe('todo');
    });

    test('filters in_progress tasks', async () => {
      const response = await request(app)
        .get('/tasks?status=in_progress');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].status).toBe('in_progress');
    });

    test('filters done tasks', async () => {
      const response = await request(app)
        .get('/tasks?status=done');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].status).toBe('done');
    });

    test('returns empty array for unknown status', async () => {
      const response = await request(app)
        .get('/tasks?status=unknown');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });
  });

  // =========================================================
  // PAGINATION
  // =========================================================

  describe('GET /tasks?page=&limit=', () => {
    beforeEach(async () => {
      for (let i = 1; i <= 25; i++) {
        await request(app)
          .post('/tasks')
          .send({
            title: `Task ${i}`,
          });
      }
    });

    test('returns first page', async () => {
      const response = await request(app)
        .get('/tasks?page=1&limit=10');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(10);

      expect(response.body[0].title).toBe('Task 1');
      expect(response.body[9].title).toBe('Task 10');
    });

    test('returns second page', async () => {
      const response = await request(app)
        .get('/tasks?page=2&limit=10');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(10);

      expect(response.body[0].title).toBe('Task 11');
      expect(response.body[9].title).toBe('Task 20');
    });

    test('returns third page', async () => {
      const response = await request(app)
        .get('/tasks?page=3&limit=10');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(5);

      expect(response.body[0].title).toBe('Task 21');
      expect(response.body[4].title).toBe('Task 25');
    });

    test('returns empty array for page beyond data', async () => {
      const response = await request(app)
        .get('/tasks?page=100&limit=10');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    test('uses default page when only limit is supplied', async () => {
      const response = await request(app)
        .get('/tasks?limit=5');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(5);
      expect(response.body[0].title).toBe('Task 1');
    });

    test('uses default limit when only page is supplied', async () => {
      const response = await request(app)
        .get('/tasks?page=2');

      expect(response.status).toBe(200);

      expect(response.body[0].title).toBe('Task 11');
    });
  });

  // =========================================================
  // GET /tasks/stats
  // =========================================================

  describe('GET /tasks/stats', () => {
    test('returns zero stats when there are no tasks', async () => {
      const response = await request(app)
        .get('/tasks/stats');

      expect(response.status).toBe(200);

      expect(response.body).toEqual({
        todo: 0,
        in_progress: 0,
        done: 0,
        overdue: 0,
      });
    });

    test('returns correct status counts', async () => {
      await request(app)
        .post('/tasks')
        .send({
          title: 'Todo',
          status: 'todo',
        });

      await request(app)
        .post('/tasks')
        .send({
          title: 'Progress',
          status: 'in_progress',
        });

      await request(app)
        .post('/tasks')
        .send({
          title: 'Done',
          status: 'done',
        });

      const response = await request(app)
        .get('/tasks/stats');

      expect(response.status).toBe(200);

      expect(response.body.todo).toBe(1);
      expect(response.body.in_progress).toBe(1);
      expect(response.body.done).toBe(1);
    });

    test('counts overdue tasks', async () => {
      await request(app)
        .post('/tasks')
        .send({
          title: 'Overdue task',
          dueDate: '2020-01-01T00:00:00.000Z',
        });

      const response = await request(app)
        .get('/tasks/stats');

      expect(response.status).toBe(200);
      expect(response.body.overdue).toBe(1);
    });

    test('does not count completed overdue tasks', async () => {
      const createResponse = await request(app)
        .post('/tasks')
        .send({
          title: 'Overdue task',
          dueDate: '2020-01-01T00:00:00.000Z',
        });

      const id = createResponse.body.id;

      await request(app)
        .patch(`/tasks/${id}/complete`);

      const response = await request(app)
        .get('/tasks/stats');

      expect(response.body.overdue).toBe(0);
    });
  });

  // =========================================================
  // POST /tasks
  // =========================================================

  describe('POST /tasks', () => {
    test('creates a task', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({
          title: 'Build API',
          description: 'Build task API',
          status: 'todo',
          priority: 'high',
        });

      expect(response.status).toBe(201);

      expect(response.body).toEqual(
        expect.objectContaining({
          title: 'Build API',
          description: 'Build task API',
          status: 'todo',
          priority: 'high',
          completedAt: null,
        })
      );

      expect(response.body.id).toEqual(expect.any(String));
      expect(response.body.createdAt).toEqual(expect.any(String));
    });

    test('creates task using defaults', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({
          title: 'Simple task',
        });

      expect(response.status).toBe(201);

      expect(response.body.status).toBe('todo');
      expect(response.body.priority).toBe('medium');
      expect(response.body.description).toBe('');
      expect(response.body.dueDate).toBeNull();
    });

    test('rejects missing title', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({
          description: 'No title',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    test('rejects empty title', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({
          title: '',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    test('rejects whitespace title', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({
          title: '   ',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    test('rejects invalid status', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({
          title: 'Task',
          status: 'invalid',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain(
        'status must be one of'
      );
    });

    test('rejects invalid priority', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({
          title: 'Task',
          priority: 'urgent',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain(
        'priority must be one of'
      );
    });

    test('rejects invalid due date', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({
          title: 'Task',
          dueDate: 'not-a-date',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe(
        'dueDate must be a valid ISO date string'
      );
    });
  });

  // =========================================================
  // PUT /tasks/:id
  // =========================================================

  describe('PUT /tasks/:id', () => {
    let task;

    beforeEach(async () => {
      const response = await request(app)
        .post('/tasks')
        .send({
          title: 'Original task',
          description: 'Original description',
          priority: 'low',
        });

      task = response.body;
    });

    test('updates a task', async () => {
      const response = await request(app)
        .put(`/tasks/${task.id}`)
        .send({
          title: 'Updated task',
          priority: 'high',
        });

      expect(response.status).toBe(200);
      expect(response.body.title).toBe('Updated task');
      expect(response.body.priority).toBe('high');
    });

    test('preserves fields not included in update', async () => {
      const response = await request(app)
        .put(`/tasks/${task.id}`)
        .send({
          title: 'Updated',
        });

      expect(response.status).toBe(200);
      expect(response.body.description).toBe(
        'Original description'
      );
      expect(response.body.priority).toBe('low');
    });

    test('returns 404 for unknown task', async () => {
      const response = await request(app)
        .put('/tasks/non-existent-id')
        .send({
          title: 'Updated',
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Task not found');
    });

    test('rejects empty title', async () => {
      const response = await request(app)
        .put(`/tasks/${task.id}`)
        .send({
          title: '',
        });

      expect(response.status).toBe(400);
    });

    test('rejects invalid status', async () => {
      const response = await request(app)
        .put(`/tasks/${task.id}`)
        .send({
          status: 'invalid',
        });

      expect(response.status).toBe(400);
    });

    test('rejects invalid priority', async () => {
      const response = await request(app)
        .put(`/tasks/${task.id}`)
        .send({
          priority: 'urgent',
        });

      expect(response.status).toBe(400);
    });

    test('rejects invalid due date', async () => {
      const response = await request(app)
        .put(`/tasks/${task.id}`)
        .send({
          dueDate: 'not-a-date',
        });

      expect(response.status).toBe(400);
    });
  });

  // =========================================================
  // DELETE /tasks/:id
  // =========================================================

  describe('DELETE /tasks/:id', () => {
    test('deletes an existing task', async () => {
      const createResponse = await request(app)
        .post('/tasks')
        .send({
          title: 'Delete me',
        });

      const id = createResponse.body.id;

      const response = await request(app)
        .delete(`/tasks/${id}`);

      expect(response.status).toBe(204);
      expect(response.body).toEqual({});
    });

    test('returns 404 for unknown task', async () => {
      const response = await request(app)
        .delete('/tasks/non-existent-id');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Task not found');
    });

    test('deleted task can no longer be retrieved', async () => {
      const createResponse = await request(app)
        .post('/tasks')
        .send({
          title: 'Delete me',
        });

      const id = createResponse.body.id;

      await request(app)
        .delete(`/tasks/${id}`);

      const response = await request(app)
        .get('/tasks');

      expect(response.body).toHaveLength(0);
    });
  });

  // =========================================================
  // PATCH /tasks/:id/complete
  // =========================================================

  describe('PATCH /tasks/:id/complete', () => {
    test('completes an existing task', async () => {
      const createResponse = await request(app)
        .post('/tasks')
        .send({
          title: 'Complete me',
        });

      const id = createResponse.body.id;

      const response = await request(app)
        .patch(`/tasks/${id}/complete`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('done');
      expect(response.body.completedAt).toEqual(
        expect.any(String)
      );
    });

    test('returns 404 for unknown task', async () => {
      const response = await request(app)
        .patch('/tasks/non-existent-id/complete');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Task not found');
    });

    test('completion is reflected in GET /tasks', async () => {
      const createResponse = await request(app)
        .post('/tasks')
        .send({
          title: 'Complete me',
        });

      const id = createResponse.body.id;

      await request(app)
        .patch(`/tasks/${id}/complete`);

      const response = await request(app)
        .get('/tasks');

      expect(response.body[0].status).toBe('done');
      expect(response.body[0].completedAt).not.toBeNull();
    });

    test('completion is reflected in stats', async () => {
      const createResponse = await request(app)
        .post('/tasks')
        .send({
          title: 'Complete me',
          dueDate: '2020-01-01T00:00:00.000Z',
        });

      const id = createResponse.body.id;

      await request(app)
        .patch(`/tasks/${id}/complete`);

      const response = await request(app)
        .get('/tasks/stats');

      expect(response.body.done).toBe(1);
      expect(response.body.overdue).toBe(0);
    });
  });

  // =========================================================
  // GENERAL API EDGE CASES
  // =========================================================

  describe('General API behavior', () => {
    test('returns 404 for unknown route', async () => {
      const response = await request(app)
        .get('/something-that-does-not-exist');

      expect(response.status).toBe(404);
    });

    test('does not allow malformed JSON body to crash server', async () => {
      const response = await request(app)
        .post('/tasks')
        .set('Content-Type', 'application/json')
        .send('{"title":');

      expect(response.status).toBe(400);
    });

    test('supports JSON responses', async () => {
      const response = await request(app)
        .get('/tasks');

      expect(response.headers['content-type']).toMatch(
        /json/
      );
    });
  });
});