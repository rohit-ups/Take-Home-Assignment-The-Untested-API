const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

describe('Tasks API Integration Tests', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('GET /', () => {
    test('returns health status and available endpoints', async () => {
      const response = await request(app).get('/');
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('online');
      expect(response.body.endpoints).toHaveProperty('tasks');
    });
  });

  describe('POST /tasks', () => {
    test('creates a task with required fields (happy path)', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({ title: 'Integration Test Task' });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe('Integration Test Task');
      expect(response.body.status).toBe('todo');
      expect(response.body.priority).toBe('medium');
      expect(response.body.description).toBe('');
      expect(response.body.dueDate).toBeNull();
      expect(response.body.assignee).toBeNull();
      expect(response.body.completedAt).toBeNull();
      expect(response.body).toHaveProperty('createdAt');
    });

    test('creates a task with all valid fields', async () => {
      const dueDate = '2026-11-20T12:00:00.000Z';
      const response = await request(app)
        .post('/tasks')
        .send({
          title: 'Full Task',
          description: 'Detailed description',
          status: 'in_progress',
          priority: 'high',
          dueDate,
        });

      expect(response.status).toBe(201);
      expect(response.body.title).toBe('Full Task');
      expect(response.body.description).toBe('Detailed description');
      expect(response.body.status).toBe('in_progress');
      expect(response.body.priority).toBe('high');
      expect(response.body.dueDate).toBe(dueDate);
      expect(response.body.assignee).toBeNull();
    });

    test('returns 400 when title is missing', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({ description: 'No title' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('title is required');
    });

    test('returns 400 when title is an empty string or whitespace', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({ title: '   ' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('returns 400 when status is invalid', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({ title: 'Valid title', status: 'invalid_status' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('status must be one of');
    });

    test('returns 400 when priority is invalid', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({ title: 'Valid title', priority: 'super-high' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('priority must be one of');
    });

    test('returns 400 when dueDate is not a valid date string', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({ title: 'Valid title', dueDate: 'not-a-valid-date' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('dueDate must be a valid ISO date string');
    });
  });

  describe('GET /tasks', () => {
    test('returns an empty list when no tasks exist', async () => {
      const response = await request(app).get('/tasks');
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    test('returns all tasks (happy path)', async () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });

      const response = await request(app).get('/tasks');
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].title).toBe('Task 1');
      expect(response.body[1].title).toBe('Task 2');
    });

    test('filters tasks by status', async () => {
      taskService.create({ title: 'Task Todo', status: 'todo' });
      taskService.create({ title: 'Task Done', status: 'done' });

      const response = await request(app).get('/tasks?status=todo');
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].title).toBe('Task Todo');
      expect(response.body[0].status).toBe('todo');
    });

    test('returns paginated tasks (page 1 and page 2)', async () => {
      const t1 = taskService.create({ title: 'Task 1' });
      const t2 = taskService.create({ title: 'Task 2' });
      const t3 = taskService.create({ title: 'Task 3' });

      const page1Response = await request(app).get('/tasks?page=1&limit=2');
      expect(page1Response.status).toBe(200);
      expect(page1Response.body).toHaveLength(2);
      expect(page1Response.body[0].id).toBe(t1.id);
      expect(page1Response.body[1].id).toBe(t2.id);

      const page2Response = await request(app).get('/tasks?page=2&limit=2');
      expect(page2Response.status).toBe(200);
      expect(page2Response.body).toHaveLength(1);
      expect(page2Response.body[0].id).toBe(t3.id);
    });

    test('supports combined status filter and pagination', async () => {
      taskService.create({ title: 'Todo 1', status: 'todo' });
      taskService.create({ title: 'Todo 2', status: 'todo' });
      taskService.create({ title: 'Todo 3', status: 'todo' });
      taskService.create({ title: 'Done 1', status: 'done' });

      const response = await request(app).get('/tasks?status=todo&page=1&limit=2');
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].title).toBe('Todo 1');
      expect(response.body[1].title).toBe('Todo 2');

      const page2 = await request(app).get('/tasks?status=todo&page=2&limit=2');
      expect(page2.status).toBe(200);
      expect(page2.body).toHaveLength(1);
      expect(page2.body[0].title).toBe('Todo 3');
    });

    test('returns empty array when requested page exceeds total tasks', async () => {
      taskService.create({ title: 'Task 1' });
      const response = await request(app).get('/tasks?page=99&limit=10');
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });
  });

  describe('GET /tasks/stats', () => {
    test('returns counts by status and overdue count', async () => {
      const pastDate = new Date(Date.now() - 3600000).toISOString();
      const futureDate = new Date(Date.now() + 3600000).toISOString();

      taskService.create({ title: 'T1', status: 'todo', dueDate: pastDate }); // overdue
      taskService.create({ title: 'T2', status: 'in_progress', dueDate: futureDate });
      taskService.create({ title: 'T3', status: 'done', dueDate: pastDate }); // completed, not overdue

      const response = await request(app).get('/tasks/stats');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        todo: 1,
        in_progress: 1,
        done: 1,
        overdue: 1,
      });
    });

    test('returns zeros when no tasks exist', async () => {
      const response = await request(app).get('/tasks/stats');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        todo: 0,
        in_progress: 0,
        done: 0,
        overdue: 0,
      });
    });
  });

  describe('PUT /tasks/:id', () => {
    test('updates a task successfully (happy path)', async () => {
      const task = taskService.create({ title: 'Original Title', priority: 'low' });

      const response = await request(app)
        .put(`/tasks/${task.id}`)
        .send({
          title: 'Updated Title',
          priority: 'high',
          description: 'Updated Description',
        });

      expect(response.status).toBe(200);
      expect(response.body.title).toBe('Updated Title');
      expect(response.body.priority).toBe('high');
      expect(response.body.description).toBe('Updated Description');
      expect(response.body.id).toBe(task.id);
    });

    test('returns 404 when updating non-existent task', async () => {
      const response = await request(app)
        .put('/tasks/non-existent-uuid')
        .send({ title: 'Updated Title' });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Task not found');
    });

    test('returns 400 when update payload has invalid fields', async () => {
      const task = taskService.create({ title: 'Original' });

      const response = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ status: 'invalid_status' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /tasks/:id', () => {
    test('deletes a task successfully (returns 204)', async () => {
      const task = taskService.create({ title: 'To Delete' });

      const response = await request(app).delete(`/tasks/${task.id}`);
      expect(response.status).toBe(204);
      expect(response.body).toEqual({});

      expect(taskService.findById(task.id)).toBeUndefined();
    });

    test('returns 404 when deleting a non-existent task', async () => {
      const response = await request(app).delete('/tasks/non-existent-uuid');
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Task not found');
    });
  });

  describe('PATCH /tasks/:id/complete', () => {
    test('marks a task as complete and records completedAt (happy path)', async () => {
      const task = taskService.create({ title: 'To Complete', priority: 'high' });

      const response = await request(app).patch(`/tasks/${task.id}/complete`);
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('done');
      expect(response.body.completedAt).toBeDefined();
      expect(new Date(response.body.completedAt).getTime()).not.toBeNaN();
      expect(response.body.priority).toBe('high'); // Priority is preserved!
    });

    test('returns 404 when marking a non-existent task as complete', async () => {
      const response = await request(app).patch('/tasks/non-existent-uuid/complete');
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Task not found');
    });
  });

  describe('PATCH /tasks/:id/assign', () => {
    test('assigns a user to an unassigned task (happy path)', async () => {
      const task = taskService.create({ title: 'New Feature Task' });

      const response = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 'Sarah Connor' });

      expect(response.status).toBe(200);
      expect(response.body.assignee).toBe('Sarah Connor');
      expect(response.body.id).toBe(task.id);
    });

    test('reassigns a task that is already assigned', async () => {
      const task = taskService.create({ title: 'Feature Task' });
      await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 'Sarah Connor' });

      const response = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 'John Connor' });

      expect(response.status).toBe(200);
      expect(response.body.assignee).toBe('John Connor');
    });

    test('trims whitespace from assignee string', async () => {
      const task = taskService.create({ title: 'Whitespace Task' });

      const response = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: '   Alice Bob   ' });

      expect(response.status).toBe(200);
      expect(response.body.assignee).toBe('Alice Bob');
    });

    test('returns 400 when assignee is missing from request body', async () => {
      const task = taskService.create({ title: 'Task Missing Assignee' });

      const response = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('assignee is required');
    });

    test('returns 400 when assignee is an empty string or whitespace', async () => {
      const task = taskService.create({ title: 'Empty Assignee Task' });

      const response = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: '   ' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('returns 400 when assignee is not a string', async () => {
      const task = taskService.create({ title: 'Non-string Assignee Task' });

      const response = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 12345 });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('returns 404 when assigning a non-existent task', async () => {
      const response = await request(app)
        .patch('/tasks/non-existent-uuid/assign')
        .send({ assignee: 'Sarah Connor' });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Task not found');
    });
  });

  describe('Error handling middleware', () => {
    test('handles internal server errors gracefully (500)', async () => {
      const spy = jest.spyOn(taskService, 'getAll').mockImplementationOnce(() => {
        throw new Error('Simulated internal failure');
      });

      // Suppress console.error in test output for clean logs
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const response = await request(app).get('/tasks');
      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Internal server error' });

      spy.mockRestore();
      consoleSpy.mockRestore();
    });
  });
});
