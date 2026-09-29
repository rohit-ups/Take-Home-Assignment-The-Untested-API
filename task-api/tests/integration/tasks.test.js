const request = require('supertest');
const app = require('../../src/app');
const taskService = require('../../src/services/taskService');

describe('Task API Routes (Integration Tests)', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('GET /tasks/stats', () => {
    it('should return default zero counts when no tasks exist', async () => {
      const res = await request(app).get('/tasks/stats');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        todo: 0,
        in_progress: 0,
        done: 0,
        overdue: 0,
      });
    });

    it('should accurately calculate status counts and overdue tasks', async () => {
      const pastDate = new Date(Date.now() - 60000).toISOString();
      const futureDate = new Date(Date.now() + 60000).toISOString();

      taskService.create({ title: 'Task 1', status: 'todo', dueDate: pastDate });
      taskService.create({ title: 'Task 2', status: 'in_progress', dueDate: pastDate });
      taskService.create({ title: 'Task 3', status: 'done', dueDate: pastDate }); // completed past due is not overdue
      taskService.create({ title: 'Task 4', status: 'todo', dueDate: futureDate });

      const res = await request(app).get('/tasks/stats');
      expect(res.status).toBe(200);
      expect(res.body.todo).toBe(2);
      expect(res.body.in_progress).toBe(1);
      expect(res.body.done).toBe(1);
      expect(res.body.overdue).toBe(2);
    });
  });

  describe('GET /tasks', () => {
    beforeEach(() => {
      taskService.create({ title: 'Task 1', status: 'todo' });
      taskService.create({ title: 'Task 2', status: 'in_progress' });
      taskService.create({ title: 'Task 3', status: 'todo' });
      taskService.create({ title: 'Task 4', status: 'done' });
    });

    it('should return all tasks when no query parameters provided', async () => {
      const res = await request(app).get('/tasks');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(4);
    });

    it('should filter tasks by exact status', async () => {
      const res = await request(app).get('/tasks?status=todo');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      res.body.forEach((t) => expect(t.status).toBe('todo'));
    });

    it('should NOT match partial status queries (e.g. ?status=progress)', async () => {
      const res = await request(app).get('/tasks?status=progress');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('should paginate results with page and limit', async () => {
      const resPage1 = await request(app).get('/tasks?page=1&limit=2');
      expect(resPage1.status).toBe(200);
      expect(resPage1.body).toHaveLength(2);
      expect(resPage1.body[0].title).toBe('Task 1');
      expect(resPage1.body[1].title).toBe('Task 2');

      const resPage2 = await request(app).get('/tasks?page=2&limit=2');
      expect(resPage2.status).toBe(200);
      expect(resPage2.body).toHaveLength(2);
      expect(resPage2.body[0].title).toBe('Task 3');
      expect(resPage2.body[1].title).toBe('Task 4');
    });

    it('should handle pagination when combined with status filter', async () => {
      const res = await request(app).get('/tasks?status=todo&page=1&limit=1');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe('Task 1');
      expect(res.body[0].status).toBe('todo');
    });

    it('should return empty list when page exceeds available items', async () => {
      const res = await request(app).get('/tasks?page=100&limit=10');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe('POST /tasks', () => {
    it('should create a task and return 201 with populated defaults', async () => {
      const payload = {
        title: 'New Integration Task',
        description: 'Testing POST endpoint',
        priority: 'high',
      };

      const res = await request(app).post('/tasks').send(payload);
      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.title).toBe(payload.title);
      expect(res.body.description).toBe(payload.description);
      expect(res.body.priority).toBe('high');
      expect(res.body.status).toBe('todo');
      expect(res.body.completedAt).toBeNull();
      expect(res.body.createdAt).toBeDefined();
    });

    it('should return 400 when title is missing', async () => {
      const res = await request(app).post('/tasks').send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('title is required');
    });

    it('should return 400 when title is whitespace only', async () => {
      const res = await request(app).post('/tasks').send({ title: '   ' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('title is required and must be a non-empty string');
    });

    it('should return 400 when status is invalid', async () => {
      const res = await request(app).post('/tasks').send({
        title: 'Valid Title',
        status: 'not_a_valid_status',
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('status must be one of');
    });

    it('should return 400 when priority is invalid', async () => {
      const res = await request(app).post('/tasks').send({
        title: 'Valid Title',
        priority: 'maximum',
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('priority must be one of');
    });

    it('should return 400 when dueDate is not a valid date string', async () => {
      const res = await request(app).post('/tasks').send({
        title: 'Valid Title',
        dueDate: 'invalid-date-string',
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('dueDate must be a valid ISO date string');
    });
  });

  describe('PUT /tasks/:id', () => {
    let existingTask;

    beforeEach(() => {
      existingTask = taskService.create({
        title: 'Before Update',
        description: 'Old Description',
        priority: 'low',
        status: 'todo',
      });
    });

    it('should update task and return 200 with updated fields', async () => {
      const res = await request(app)
        .put(`/tasks/${existingTask.id}`)
        .send({
          title: 'After Update',
          priority: 'high',
        });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(existingTask.id);
      expect(res.body.title).toBe('After Update');
      expect(res.body.priority).toBe('high');
      expect(res.body.description).toBe('Old Description');
    });

    it('should return 404 when updating non-existent task', async () => {
      const res = await request(app)
        .put('/tasks/non-existent-id')
        .send({ title: 'Updated Title' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });

    it('should return 400 when update payload has invalid title', async () => {
      const res = await request(app)
        .put(`/tasks/${existingTask.id}`)
        .send({ title: '' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('title must be a non-empty string');
    });

    it('should return 400 when update payload has invalid status', async () => {
      const res = await request(app)
        .put(`/tasks/${existingTask.id}`)
        .send({ status: 'invalid_status' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('status must be one of');
    });
  });

  describe('DELETE /tasks/:id', () => {
    it('should delete task and return 204 No Content', async () => {
      const task = taskService.create({ title: 'Delete me' });

      const res = await request(app).delete(`/tasks/${task.id}`);
      expect(res.status).toBe(204);
      expect(res.text).toBe('');

      expect(taskService.findById(task.id)).toBeUndefined();
    });

    it('should return 404 when deleting a non-existent task', async () => {
      const res = await request(app).delete('/tasks/random-id');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });
  });

  describe('PATCH /tasks/:id/complete', () => {
    it('should mark task as complete, set completedAt, and preserve existing priority', async () => {
      const task = taskService.create({ title: 'Finish ASAP', priority: 'high' });

      const res = await request(app).patch(`/tasks/${task.id}/complete`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('done');
      expect(res.body.completedAt).toBeDefined();
      expect(new Date(res.body.completedAt).getTime()).not.toBeNaN();
      // Verifies priority is preserved, not clobbered to 'medium'
      expect(res.body.priority).toBe('high');
    });

    it('should return 404 when marking non-existent task as complete', async () => {
      const res = await request(app).patch('/tasks/non-existent-id/complete');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });
  });

  describe('PATCH /tasks/:id/assign [New Feature]', () => {
    it('should assign a user to a task and return 200 with updated task', async () => {
      const task = taskService.create({ title: 'Feature Task' });

      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 'Sarah Connor' });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(task.id);
      expect(res.body.assignee).toBe('Sarah Connor');
    });

    it('should allow reassigning a task to another user', async () => {
      const task = taskService.create({ title: 'Feature Task' });
      await request(app).patch(`/tasks/${task.id}/assign`).send({ assignee: 'First Person' });

      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 'Second Person' });

      expect(res.status).toBe(200);
      expect(res.body.assignee).toBe('Second Person');
    });

    it('should return 404 when assigning a non-existent task', async () => {
      const res = await request(app)
        .patch('/tasks/non-existent-id/assign')
        .send({ assignee: 'Sarah Connor' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });

    it('should return 400 when assignee is missing from payload', async () => {
      const task = taskService.create({ title: 'Feature Task' });
      const res = await request(app).patch(`/tasks/${task.id}/assign`).send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('assignee is required');
    });

    it('should return 400 when assignee is empty or whitespace only', async () => {
      const task = taskService.create({ title: 'Feature Task' });

      const resEmpty = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: '' });
      expect(resEmpty.status).toBe(400);

      const resWhitespace = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: '   ' });
      expect(resWhitespace.status).toBe(400);
    });

    it('should return 400 when assignee is not a string', async () => {
      const task = taskService.create({ title: 'Feature Task' });
      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 12345 });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('assignee is required and must be a non-empty string');
    });
  });

  describe('Internal Server Error Handling', () => {
    it('should return 500 when an unexpected exception occurs in a service', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const getAllSpy = jest.spyOn(taskService, 'getAll').mockImplementationOnce(() => {
        throw new Error('Unexpected crash');
      });

      const res = await request(app).get('/tasks');
      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'Internal server error' });

      consoleSpy.mockRestore();
      getAllSpy.mockRestore();
    });
  });
});
