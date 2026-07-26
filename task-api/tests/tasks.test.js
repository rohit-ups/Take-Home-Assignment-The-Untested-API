const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

describe('Tasks API - Integration Tests', () => {
  beforeEach(() => {
    taskService._reset();
  });

  // --- GET /tasks ---
  describe('GET /tasks', () => {
    it('should fetch all tasks', async () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });

      const res = await request(app).get('/tasks');

      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBe(2);
    });

    it('should filter tasks by status query parameter', async () => {
      taskService.create({ title: 'Task 1', status: 'todo' });
      taskService.create({ title: 'Task 2', status: 'done' });

      const res = await request(app).get('/tasks?status=done');

      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].title).toBe('Task 2');
    });

    it('should handle page and limit query parameters for pagination', async () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });

      const res = await request(app).get('/tasks?page=1&limit=1');

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // --- GET /tasks/stats ---
  describe('GET /tasks/stats', () => {
    it('should return task statistics', async () => {
      const res = await request(app).get('/tasks/stats');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('todo');
      expect(res.body).toHaveProperty('in_progress');
      expect(res.body).toHaveProperty('done');
      expect(res.body).toHaveProperty('overdue');
    });
  });

  // --- POST /tasks ---
  describe('POST /tasks', () => {
    it('should create a task with valid payload', async () => {
      const payload = { title: 'New Task', priority: 'high' };
      const res = await request(app).post('/tasks').send(payload);

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.title).toBe('New Task');
      expect(res.body.priority).toBe('high');
    });

    it('should return 400 when title is missing', async () => {
      const res = await request(app).post('/tasks').send({ description: 'No title' });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('title is required and must be a non-empty string');
    });

    it('should return 400 when title is not a string or is only whitespace', async () => {
      const res = await request(app).post('/tasks').send({ title: '   ' });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('title is required and must be a non-empty string');
    });

    it('should return 400 when status is invalid', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'Task', status: 'invalid_status' });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('status must be one of');
    });

    it('should return 400 when priority is invalid', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'Task', priority: 'super_high' });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('priority must be one of');
    });

    it('should return 400 when dueDate is an invalid date string', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'Task', dueDate: 'not-a-valid-date' });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('dueDate must be a valid ISO date string');
    });
  });

  // --- PUT /tasks/:id ---
  describe('PUT /tasks/:id', () => {
    it('should update an existing task', async () => {
      const task = taskService.create({ title: 'Original Task' });
      const res = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ title: 'Updated Task', status: 'in_progress' });

      expect(res.statusCode).toBe(200);
      expect(res.body.title).toBe('Updated Task');
      expect(res.body.status).toBe('in_progress');
    });

    it('should return 404 when updating non-existent task ID', async () => {
      const res = await request(app)
        .put('/tasks/non-existent-id')
        .send({ title: 'Updated' });

      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });

    it('should return 400 when update payload has invalid title', async () => {
      const task = taskService.create({ title: 'Original Task' });
      const res = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ title: '' });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('title must be a non-empty string');
    });

    it('should return 400 when update payload has invalid status', async () => {
      const task = taskService.create({ title: 'Original Task' });
      const res = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ status: 'bad_status' });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('status must be one of');
    });

    it('should return 400 when update payload has invalid priority', async () => {
      const task = taskService.create({ title: 'Original Task' });
      const res = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ priority: 'extreme' });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('priority must be one of');
    });

    it('should return 400 when update payload has invalid dueDate', async () => {
      const task = taskService.create({ title: 'Original Task' });
      const res = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ dueDate: 'invalid-date' });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('dueDate must be a valid ISO date string');
    });
  });

  // --- DELETE /tasks/:id ---
  describe('DELETE /tasks/:id', () => {
    it('should delete an existing task and return 204', async () => {
      const task = taskService.create({ title: 'To Delete' });
      const res = await request(app).delete(`/tasks/${task.id}`);

      expect(res.statusCode).toBe(204);
      expect(res.body).toEqual({});
    });

    it('should return 404 when deleting a non-existent task', async () => {
      const res = await request(app).delete('/tasks/non-existent-id');

      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });
  });

  // --- PATCH /tasks/:id/complete ---
  describe('PATCH /tasks/:id/complete', () => {
    it('should mark an existing task as complete', async () => {
      const task = taskService.create({ title: 'To Complete' });
      const res = await request(app).patch(`/tasks/${task.id}/complete`);

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('done');
      expect(res.body.completedAt).not.toBeNull();
    });

    it('should return 404 when completing a non-existent task', async () => {
      const res = await request(app).patch('/tasks/non-existent-id/complete');

      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });
  });

  describe('Express Global Error Handling & Edge Cases', () => {
  // Triggers lines 10-11 in app.js (Express global error handler)
  it('should hit global error middleware on unhandled route errors', async () => {
    // Force a route to throw an unexpected error
    const spy = jest.spyOn(taskService, 'getAll').mockImplementationOnce(() => {
      throw new Error('Database crash simulation');
    });

    // Quiet the console.error output during this intentional test error
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = await request(app).get('/tasks');

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('Internal server error');

    spy.mockRestore();
    consoleSpy.mockRestore();
  });

  // Triggers validator edge-case branches in validators.js
  it('should validate all edge cases for task creation and updates', async () => {
    // Create task with no optional fields to test defaults/falsy checks
    const res1 = await request(app)
      .post('/tasks')
      .send({ title: 'Bare minimum task' });
    expect(res1.statusCode).toBe(201);

    // Update with non-string title (Triggers Line 22 in validators.js)
    const res2 = await request(app)
      .put(`/tasks/${res1.body.id}`)
      .send({ title: 12345 });
    expect(res2.statusCode).toBe(400);

    // Update with valid title + missing optional fields (Triggers Line 25, 28, 31 checks)
    const res3 = await request(app)
      .put(`/tasks/${res1.body.id}`)
      .send({ title: 'Updated Valid Title' });
    expect(res3.statusCode).toBe(200);
  });
});

describe('GET /tasks (Bug Fix Verification: Filter + Pagination)', () => {
  it('should combine status filtering and pagination correctly', async () => {
    //  3 'todo' tasks and 1 'done' task
    taskService.create({ title: 'Todo 1', status: 'todo' });
    taskService.create({ title: 'Todo 2', status: 'todo' });
    taskService.create({ title: 'Todo 3', status: 'todo' });
    taskService.create({ title: 'Done 1', status: 'done' });

    // Request page 1 with limit 2 for 'todo' tasks only
    const res = await request(app).get('/tasks?status=todo&page=1&limit=2');

    expect(res.statusCode).toBe(200);
    // Should return only 2 items (respecting limit), not all 3
    expect(res.body.length).toBe(2);
    expect(res.body[0].title).toBe('Todo 1');
    expect(res.body[1].title).toBe('Todo 2');
    expect(res.body.every((t) => t.status === 'todo')).toBe(true);
  });

  it('should return page 2 of filtered status results', async () => {
    taskService.create({ title: 'Todo 1', status: 'todo' });
    taskService.create({ title: 'Todo 2', status: 'todo' });
    taskService.create({ title: 'Todo 3', status: 'todo' });

    // Request page 2 with limit 2 for 'todo' tasks
    const res = await request(app).get('/tasks?status=todo&page=2&limit=2');

    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].title).toBe('Todo 3');
  });
});

// --- PATCH /tasks/:id/assign --- for new feature added
describe('PATCH /tasks/:id/assign (New Feature)', () => {
  it('should successfully assign a task to a user (200)', async () => {
    const task = taskService.create({ title: 'Unassigned Task' });

    const res = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: 'Alice' });

    expect(res.statusCode).toBe(200);
    expect(res.body.assignee).toBe('Alice');
  });

  it('should overwrite existing assignee when re-assigned', async () => {
    const task = taskService.create({ title: 'Task', assignee: 'Alice' });

    const res = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: 'Bob' });

    expect(res.statusCode).toBe(200);
    expect(res.body.assignee).toBe('Bob');
  });

  it('should return 400 when assignee is missing or empty string', async () => {
    const task = taskService.create({ title: 'Task' });

    const res = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: '   ' });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('assignee is required and must be a non-empty string');
  });

  it('should return 400 when assignee is not a string', async () => {
    const task = taskService.create({ title: 'Task' });

    const res = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: 12345 });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('assignee is required and must be a non-empty string');
  });

  it('should return 404 when assigning a non-existent task', async () => {
    const res = await request(app)
      .patch('/tasks/non-existent-id/assign')
      .send({ assignee: 'Alice' });

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe('Task not found');
  });
});
});