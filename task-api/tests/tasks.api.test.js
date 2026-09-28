const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

describe('Tasks API Integration Tests', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('GET /tasks', () => {
    it('should return an empty list with 200 when no tasks exist', async () => {
      const res = await request(app).get('/tasks');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('should return all tasks with 200 when tasks exist', async () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });

      const res = await request(app).get('/tasks');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].title).toBe('Task 1');
      expect(res.body[1].title).toBe('Task 2');
    });

    it('should filter tasks by status with ?status=', async () => {
      taskService.create({ title: 'Task 1', status: 'todo' });
      taskService.create({ title: 'Task 2', status: 'in_progress' });
      taskService.create({ title: 'Task 3', status: 'done' });

      const res = await request(app).get('/tasks?status=in_progress');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe('Task 2');
      expect(res.body[0].status).toBe('in_progress');
    });

    it('should return empty list when page is past the end of results', async () => {
      taskService.create({ title: 'Task 1' });

      const res = await request(app).get('/tasks?page=10&limit=5');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('should paginate tasks starting at page 1 with correct items', async () => {
      taskService.create({ title: 'Item 1' });
      taskService.create({ title: 'Item 2' });
      taskService.create({ title: 'Item 3' });

      const res = await request(app).get('/tasks?page=1&limit=2');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].title).toBe('Item 1');
      expect(res.body[1].title).toBe('Item 2');
    });

    it('should return partial last page for page 2', async () => {
      taskService.create({ title: 'Item 1' });
      taskService.create({ title: 'Item 2' });
      taskService.create({ title: 'Item 3' });

      const res = await request(app).get('/tasks?page=2&limit=2');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe('Item 3');
    });

    // BUG: status filter uses substring match instead of exact match
    test.failing('should not return tasks when querying a substring of status', async () => {
      taskService.create({ title: 'Task 1', status: 'todo' });
      taskService.create({ title: 'Task 2', status: 'done' });

      const res = await request(app).get('/tasks?status=do');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(0);
    });

    // BUG: query params status and pagination do not work together (status early-returns)
    test.failing('should support filtering by status and pagination simultaneously', async () => {
      taskService.create({ title: 'T1', status: 'todo' });
      taskService.create({ title: 'T2', status: 'todo' });
      taskService.create({ title: 'T3', status: 'todo' });
      taskService.create({ title: 'O1', status: 'in_progress' });

      const res = await request(app).get('/tasks?status=todo&page=1&limit=2');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body.every((t) => t.status === 'todo')).toBe(true);
    });

    // BUG: invalid pagination params (negative or zero limit/page) should be rejected or sanitized
    test.failing('should return 400 for invalid negative limit or zero page', async () => {
      taskService.create({ title: 'Task 1' });

      const res = await request(app).get('/tasks?page=0&limit=-5');
      expect(res.status).toBe(400);
    });
  });

  describe('POST /tasks', () => {
    it('should create a task with 201 and return the created task', async () => {
      const payload = {
        title: 'Complete assignment',
        description: 'Write comprehensive tests',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2026-12-31T23:59:59.000Z',
      };

      const res = await request(app).post('/tasks').send(payload);

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.title).toBe(payload.title);
      expect(res.body.description).toBe(payload.description);
      expect(res.body.status).toBe(payload.status);
      expect(res.body.priority).toBe(payload.priority);
      expect(res.body.dueDate).toBe(payload.dueDate);
      expect(res.body.assignee).toBeNull();
      expect(res.body.completedAt).toBeNull();
      expect(res.body.createdAt).toBeDefined();
    });

    it('should create a task with default values when optional fields are omitted', async () => {
      const res = await request(app).post('/tasks').send({ title: 'Minimal Task' });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe('Minimal Task');
      expect(res.body.description).toBe('');
      expect(res.body.status).toBe('todo');
      expect(res.body.priority).toBe('medium');
      expect(res.body.dueDate).toBeNull();
      expect(res.body.completedAt).toBeNull();
    });

    it('should return 400 when title is missing', async () => {
      const res = await request(app).post('/tasks').send({ description: 'No title' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/title is required/);
    });

    it('should return 400 when title is empty or only whitespace', async () => {
      const res = await request(app).post('/tasks').send({ title: '   ' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/title is required/);
    });

    it('should return 400 when title is not a string', async () => {
      const res = await request(app).post('/tasks').send({ title: 12345 });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/title is required/);
    });

    it('should return 400 when status is invalid', async () => {
      const res = await request(app).post('/tasks').send({
        title: 'Task',
        status: 'archived',
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/status must be one of/);
    });

    it('should return 400 when priority is invalid', async () => {
      const res = await request(app).post('/tasks').send({
        title: 'Task',
        priority: 'urgent',
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/priority must be one of/);
    });

    it('should return 400 when dueDate is not a valid ISO date', async () => {
      const res = await request(app).post('/tasks').send({
        title: 'Task',
        dueDate: 'not-a-valid-date',
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/dueDate must be a valid ISO date/);
    });

    // BUG: validator uses `if (body.status && ...)` which skips empty string "" because it is falsy
    test.failing('should return 400 when status is an empty string instead of skipping validation', async () => {
      const res = await request(app).post('/tasks').send({
        title: 'Task',
        status: '',
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/status must be one of/);
    });

    // BUG: Express error handler returns 500 instead of 400 for malformed JSON body
    test.failing('should return 400 Bad Request when JSON body is malformed', async () => {
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const res = await request(app)
        .post('/tasks')
        .set('Content-Type', 'application/json')
        .send('{"title": "Malformed JSON');
      spy.mockRestore();

      expect(res.status).toBe(400);
    });
  });

  describe('PUT /tasks/:id', () => {
    it('should update task and return 200 with updated task', async () => {
      const task = taskService.create({ title: 'Before update' });

      const res = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ title: 'After update', priority: 'high' });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('After update');
      expect(res.body.priority).toBe('high');
    });

    it('should return 404 when updating a non-existent task id', async () => {
      const res = await request(app)
        .put('/tasks/non-existent-id')
        .send({ title: 'Updated' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });

    it('should return 400 when title in update is empty string', async () => {
      const task = taskService.create({ title: 'Initial' });

      const res = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ title: '  ' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/title must be a non-empty string/);
    });

    it('should return 400 when status in update is invalid', async () => {
      const task = taskService.create({ title: 'Initial' });

      const res = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ status: 'completed' }); // Note: valid values are todo, in_progress, done

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/status must be one of/);
    });

    it('should return 400 when priority in update is invalid', async () => {
      const task = taskService.create({ title: 'Initial' });

      const res = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ priority: 'critical' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/priority must be one of/);
    });

    it('should return 400 when dueDate in update is not a valid date', async () => {
      const task = taskService.create({ title: 'Initial' });

      const res = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ dueDate: 'yesterday' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/dueDate must be a valid ISO date/);
    });

    // BUG: PUT allows client to overwrite immutable protected fields like id and createdAt
    test.failing('should not allow overwriting immutable fields id or createdAt via PUT', async () => {
      const task = taskService.create({ title: 'Protected PUT' });
      const originalId = task.id;
      const originalCreatedAt = task.createdAt;

      const res = await request(app)
        .put(`/tasks/${originalId}`)
        .send({
          id: 'overwritten-id',
          createdAt: '2010-01-01T00:00:00.000Z',
          title: 'Protected PUT Updated',
        });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(originalId);
      expect(res.body.createdAt).toBe(originalCreatedAt);
    });

    // BUG: PUT updating status to 'done' does not set completedAt timestamp
    test.failing('should automatically set completedAt when updating status to done via PUT', async () => {
      const task = taskService.create({ title: 'PUT Done Task' });

      const res = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ status: 'done' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('done');
      expect(res.body.completedAt).not.toBeNull();
    });
  });

  describe('DELETE /tasks/:id', () => {
    it('should delete task and return 204 with no content', async () => {
      const task = taskService.create({ title: 'To Delete' });

      const res = await request(app).delete(`/tasks/${task.id}`);
      expect(res.status).toBe(204);
      expect(res.body).toEqual({});
    });

    it('should return 404 when deleting a non-existent task id', async () => {
      const res = await request(app).delete('/tasks/non-existent-id');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });

    it('should verify deleted task is no longer returned in GET /tasks (persistence check)', async () => {
      const task = taskService.create({ title: 'Will be deleted' });
      await request(app).delete(`/tasks/${task.id}`);

      const getRes = await request(app).get('/tasks');
      expect(getRes.body).toHaveLength(0);
    });

    it('should return 404 when attempting to delete the same task twice', async () => {
      const task = taskService.create({ title: 'Delete twice' });

      const first = await request(app).delete(`/tasks/${task.id}`);
      expect(first.status).toBe(204);

      const second = await request(app).delete(`/tasks/${task.id}`);
      expect(second.status).toBe(404);
    });
  });

  describe('PATCH /tasks/:id/complete', () => {
    it('should mark task as complete and return 200 with completedAt set', async () => {
      const task = taskService.create({ title: 'Mark complete' });

      const res = await request(app).patch(`/tasks/${task.id}/complete`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('done');
      expect(res.body.completedAt).toBeDefined();
      expect(isNaN(Date.parse(res.body.completedAt))).toBe(false);
    });

    it('should return 404 when completing non-existent task', async () => {
      const res = await request(app).patch('/tasks/non-existent-id/complete');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });

    // BUG: completeTask resets priority to medium instead of preserving existing priority
    test.failing('should retain original high priority when completed', async () => {
      const task = taskService.create({ title: 'Urgent Task', priority: 'high' });

      const res = await request(app).patch(`/tasks/${task.id}/complete`);
      expect(res.status).toBe(200);
      expect(res.body.priority).toBe('high');
    });

    // BUG: completing an already completed task overwrites completedAt
    test.failing('should not overwrite completedAt when completing an already completed task', async () => {
      const task = taskService.create({ title: 'Task' });
      const first = await request(app).patch(`/tasks/${task.id}/complete`);
      const initialTimestamp = first.body.completedAt;

      await new Promise((resolve) => setTimeout(resolve, 10));

      const second = await request(app).patch(`/tasks/${task.id}/complete`);
      expect(second.body.completedAt).toBe(initialTimestamp);
    });
  });

  describe('GET /tasks/stats', () => {
    it('should return zeros for all counts when no tasks exist', async () => {
      const res = await request(app).get('/tasks/stats');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        todo: 0,
        in_progress: 0,
        done: 0,
        overdue: 0,
      });
    });

    it('should return correct counts across statuses and overdue count', async () => {
      const past = new Date(Date.now() - 50000).toISOString();
      const future = new Date(Date.now() + 50000).toISOString();

      taskService.create({ title: 'T1', status: 'todo', dueDate: past }); // overdue
      taskService.create({ title: 'T2', status: 'in_progress', dueDate: past }); // overdue
      taskService.create({ title: 'T3', status: 'in_progress', dueDate: future }); // not overdue
      taskService.create({ title: 'T4', status: 'done', dueDate: past }); // done -> not overdue

      const res = await request(app).get('/tasks/stats');
      expect(res.status).toBe(200);
      expect(res.body.todo).toBe(1);
      expect(res.body.in_progress).toBe(2);
      expect(res.body.done).toBe(1);
      expect(res.body.overdue).toBe(2);
    });

    it('should not consider tasks with future dueDate as overdue', async () => {
      const future = new Date(Date.now() + 1000000).toISOString();
      taskService.create({ title: 'Future Task', status: 'todo', dueDate: future });

      const res = await request(app).get('/tasks/stats');
      expect(res.status).toBe(200);
      expect(res.body.overdue).toBe(0);
    });
  });

  describe('PATCH /tasks/:id/assign', () => {
    it('should assign a task to a user and return 200 with the updated task', async () => {
      const task = taskService.create({ title: 'Assign me' });

      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 'Alice Johnson' });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(task.id);
      expect(res.body.assignee).toBe('Alice Johnson');
    });

    it('should trim leading and trailing whitespace from assignee before saving', async () => {
      const task = taskService.create({ title: 'Trim assignee' });

      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: '   Bob Smith   ' });

      expect(res.status).toBe(200);
      expect(res.body.assignee).toBe('Bob Smith');
    });

    it('should return 404 when task does not exist, even if body is invalid or missing (checked first)', async () => {
      const resWithoutBody = await request(app)
        .patch('/tasks/non-existent-id/assign')
        .send({});
      expect(resWithoutBody.status).toBe(404);
      expect(resWithoutBody.body.error).toBe('Task not found');

      const resWithInvalidBody = await request(app)
        .patch('/tasks/non-existent-id/assign')
        .send({ assignee: 123 });
      expect(resWithInvalidBody.status).toBe(404);
      expect(resWithInvalidBody.body.error).toBe('Task not found');
    });

    it('should return 400 when assignee is missing from request body', async () => {
      const task = taskService.create({ title: 'Task' });

      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/assignee is required and must be a string/);
    });

    it('should return 400 when assignee is an empty string', async () => {
      const task = taskService.create({ title: 'Task' });

      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: '' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/assignee must be a non-empty string/);
    });

    it('should return 400 when assignee contains only whitespace', async () => {
      const task = taskService.create({ title: 'Task' });

      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: '     ' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/assignee must be a non-empty string/);
    });

    it('should return 400 when assignee is a number', async () => {
      const task = taskService.create({ title: 'Task' });

      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 12345 });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/assignee is required and must be a string/);
    });

    it('should return 400 when assignee is null', async () => {
      const task = taskService.create({ title: 'Task' });

      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: null });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/assignee is required and must be a string/);
    });

    it('should return 400 when assignee is an array', async () => {
      const task = taskService.create({ title: 'Task' });

      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: ['Alice'] });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/assignee is required and must be a string/);
    });

    it('should return 400 when assignee exceeds 100 characters', async () => {
      const task = taskService.create({ title: 'Task' });
      const longAssignee = 'a'.repeat(101);

      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: longAssignee });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/assignee must not exceed 100 characters/);
    });

    it('should allow reassigning an already assigned task and overwrite the assignee', async () => {
      const task = taskService.create({ title: 'Reassign me' });

      await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 'First Assignee' });

      const reassignRes = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 'Second Assignee' });

      expect(reassignRes.status).toBe(200);
      expect(reassignRes.body.assignee).toBe('Second Assignee');
    });

    it('should persist the assigned user so it is visible in GET /tasks', async () => {
      const task = taskService.create({ title: 'Persist test' });

      await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 'Persistent Worker' });

      const getRes = await request(app).get('/tasks');
      expect(getRes.status).toBe(200);
      const foundTask = getRes.body.find((t) => t.id === task.id);
      expect(foundTask).toBeDefined();
      expect(foundTask.assignee).toBe('Persistent Worker');
    });
  });
});
