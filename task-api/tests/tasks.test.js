const request = require('supertest');
const app = require('../src/app');
const { _reset } = require('../src/services/taskService');

describe('Tasks API Integration Tests', () => {
  beforeEach(() => {
    _reset();
  });

  describe('GET /tasks (List all tasks)', () => {
    test('should return 200 and an empty array when no tasks exist', async () => {
      const res = await request(app).get('/tasks');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    test('should return 200 and a list of all created tasks', async () => {
      await request(app).post('/tasks').send({ title: 'Task 1' });
      await request(app).post('/tasks').send({ title: 'Task 2' });

      const res = await request(app).get('/tasks');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].title).toBe('Task 1');
      expect(res.body[1].title).toBe('Task 2');
    });
  });

  describe('GET /tasks?status=... (Filter by status)', () => {
    test('should return 200 and filter tasks by status "todo"', async () => {
      await request(app).post('/tasks').send({ title: 'Todo 1', status: 'todo' });
      await request(app).post('/tasks').send({ title: 'Todo 2', status: 'todo' });
      await request(app).post('/tasks').send({ title: 'In Progress 1', status: 'in_progress' });

      const res = await request(app).get('/tasks?status=todo');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body.every((t) => t.status === 'todo')).toBe(true);
    });

    test('should return 200 and filter tasks by status "in_progress"', async () => {
      await request(app).post('/tasks').send({ title: 'Todo 1', status: 'todo' });
      await request(app).post('/tasks').send({ title: 'In Progress 1', status: 'in_progress' });

      const res = await request(app).get('/tasks?status=in_progress');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].status).toBe('in_progress');
    });

    test('should return 200 and filter tasks by status "done"', async () => {
      await request(app).post('/tasks').send({ title: 'Done 1', status: 'done' });
      await request(app).post('/tasks').send({ title: 'Todo 1', status: 'todo' });

      const res = await request(app).get('/tasks?status=done');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].status).toBe('done');
    });

    test('should return 200 and an empty array when no tasks match the requested status', async () => {
      await request(app).post('/tasks').send({ title: 'Todo 1', status: 'todo' });

      const res = await request(app).get('/tasks?status=done');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    test('should only match exact status and not partial substrings (e.g. status=do)', async () => {
      await request(app).post('/tasks').send({ title: 'Todo Task', status: 'todo' });
      await request(app).post('/tasks').send({ title: 'Done Task', status: 'done' });

      // "do" is a substring of both "todo" and "done", but not an exact status match
      const res = await request(app).get('/tasks?status=do');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe('GET /tasks?page=...&limit=... (Pagination)', () => {
    test('should return 200 and an empty array when paginating an empty store', async () => {
      const res = await request(app).get('/tasks?page=1&limit=10');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    test('should return 200 and the first page of tasks for page=1&limit=2 (1-indexed)', async () => {
      await request(app).post('/tasks').send({ title: 'Task 1' });
      await request(app).post('/tasks').send({ title: 'Task 2' });
      await request(app).post('/tasks').send({ title: 'Task 3' });
      await request(app).post('/tasks').send({ title: 'Task 4' });
      await request(app).post('/tasks').send({ title: 'Task 5' });

      const res = await request(app).get('/tasks?page=1&limit=2');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].title).toBe('Task 1');
      expect(res.body[1].title).toBe('Task 2');
    });

    test('should return 200 and the second page of tasks for page=2&limit=2', async () => {
      await request(app).post('/tasks').send({ title: 'Task 1' });
      await request(app).post('/tasks').send({ title: 'Task 2' });
      await request(app).post('/tasks').send({ title: 'Task 3' });
      await request(app).post('/tasks').send({ title: 'Task 4' });
      await request(app).post('/tasks').send({ title: 'Task 5' });

      const res = await request(app).get('/tasks?page=2&limit=2');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].title).toBe('Task 3');
      expect(res.body[1].title).toBe('Task 4');
    });

    test('should return 200 and an empty array when requested page exceeds total pages', async () => {
      await request(app).post('/tasks').send({ title: 'Task 1' });

      const res = await request(app).get('/tasks?page=5&limit=10');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    test('should fall back to default pagination when page or limit are non-numeric', async () => {
      await request(app).post('/tasks').send({ title: 'Task 1' });

      const res = await request(app).get('/tasks?page=invalid&limit=invalid');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(1);
    });
  });

  describe('GET /tasks/stats (Statistics)', () => {
    test('should return 200 and all zeroes when store is empty', async () => {
      const res = await request(app).get('/tasks/stats');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        todo: 0,
        in_progress: 0,
        done: 0,
        overdue: 0,
      });
    });

    test('should return 200 and accurate status counts and overdue counts', async () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString();
      const futureDate = new Date(Date.now() + 86400000).toISOString();

      await request(app).post('/tasks').send({ title: 'T1', status: 'todo', dueDate: pastDate });
      await request(app).post('/tasks').send({ title: 'T2', status: 'todo', dueDate: futureDate });
      await request(app).post('/tasks').send({ title: 'T3', status: 'in_progress', dueDate: pastDate });
      await request(app).post('/tasks').send({ title: 'T4', status: 'done', dueDate: pastDate });

      const res = await request(app).get('/tasks/stats');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        todo: 2,
        in_progress: 1,
        done: 1,
        overdue: 2,
      });
    });
  });

  describe('POST /tasks (Create task)', () => {
    test('should return 201 and created task with default values when only title is provided', async () => {
      const res = await request(app).post('/tasks').send({ title: 'Simple Task' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.title).toBe('Simple Task');
      expect(res.body.description).toBe('');
      expect(res.body.status).toBe('todo');
      expect(res.body.priority).toBe('medium');
      expect(res.body.dueDate).toBeNull();
      expect(res.body.completedAt).toBeNull();
      expect(res.body).toHaveProperty('createdAt');
    });

    test('should return 201 and created task with all custom fields provided', async () => {
      const dueDate = '2026-11-20T18:00:00.000Z';
      const payload = {
        title: 'Full Task',
        description: 'Complete description',
        status: 'in_progress',
        priority: 'high',
        dueDate,
      };

      const res = await request(app).post('/tasks').send(payload);

      expect(res.status).toBe(201);
      expect(res.body.title).toBe(payload.title);
      expect(res.body.description).toBe(payload.description);
      expect(res.body.status).toBe(payload.status);
      expect(res.body.priority).toBe(payload.priority);
      expect(res.body.dueDate).toBe(dueDate);
      expect(res.body.completedAt).toBeNull();
    });

    test('should return 400 when title is missing', async () => {
      const res = await request(app).post('/tasks').send({ description: 'No title provided' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toBe('title is required and must be a non-empty string');
    });

    test('should return 400 when title is an empty string or whitespace', async () => {
      const res = await request(app).post('/tasks').send({ title: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('title is required and must be a non-empty string');
    });

    test('should return 400 when title is not a string', async () => {
      const res = await request(app).post('/tasks').send({ title: 12345 });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('title is required and must be a non-empty string');
    });

    test('should return 400 when status is invalid', async () => {
      const res = await request(app).post('/tasks').send({
        title: 'Valid Title',
        status: 'invalid_status',
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('status must be one of: todo, in_progress, done');
    });

    test('should return 400 when priority is invalid', async () => {
      const res = await request(app).post('/tasks').send({
        title: 'Valid Title',
        priority: 'super_high',
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('priority must be one of: low, medium, high');
    });

    test('should return 400 when dueDate is not a valid date string', async () => {
      const res = await request(app).post('/tasks').send({
        title: 'Valid Title',
        dueDate: 'not-a-valid-date',
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('dueDate must be a valid ISO date string');
    });
  });

  describe('PUT /tasks/:id (Update task)', () => {
    test('should return 200 and updated task when updating single field', async () => {
      const createRes = await request(app).post('/tasks').send({ title: 'Before' });
      const taskId = createRes.body.id;

      const res = await request(app).put(`/tasks/${taskId}`).send({ title: 'After' });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('After');
      expect(res.body.id).toBe(taskId);
    });

    test('should return 200 and updated task when updating multiple fields', async () => {
      const createRes = await request(app).post('/tasks').send({ title: 'Original' });
      const taskId = createRes.body.id;

      const res = await request(app).put(`/tasks/${taskId}`).send({
        title: 'Updated Title',
        description: 'New Description',
        status: 'in_progress',
        priority: 'high',
      });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Updated Title');
      expect(res.body.description).toBe('New Description');
      expect(res.body.status).toBe('in_progress');
      expect(res.body.priority).toBe('high');
    });

    test('should return 404 when updating a nonexistent task id', async () => {
      const res = await request(app).put('/tasks/nonexistent-id').send({ title: 'Updated' });

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Task not found' });
    });

    test('should return 400 when updating with an empty title string', async () => {
      const createRes = await request(app).post('/tasks').send({ title: 'Original' });
      const taskId = createRes.body.id;

      const res = await request(app).put(`/tasks/${taskId}`).send({ title: '' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('title must be a non-empty string');
    });

    test('should return 400 when updating with an invalid status', async () => {
      const createRes = await request(app).post('/tasks').send({ title: 'Original' });
      const taskId = createRes.body.id;

      const res = await request(app).put(`/tasks/${taskId}`).send({ status: 'invalid_status' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('status must be one of: todo, in_progress, done');
    });

    test('should return 400 when updating with an invalid priority', async () => {
      const createRes = await request(app).post('/tasks').send({ title: 'Original' });
      const taskId = createRes.body.id;

      const res = await request(app).put(`/tasks/${taskId}`).send({ priority: 'critical' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('priority must be one of: low, medium, high');
    });

    test('should return 400 when updating with an invalid dueDate', async () => {
      const createRes = await request(app).post('/tasks').send({ title: 'Original' });
      const taskId = createRes.body.id;

      const res = await request(app).put(`/tasks/${taskId}`).send({ dueDate: 'invalid-date' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('dueDate must be a valid ISO date string');
    });

    test('should not allow updating immutable task id', async () => {
      const createRes = await request(app).post('/tasks').send({ title: 'Original' });
      const originalId = createRes.body.id;

      const res = await request(app).put(`/tasks/${originalId}`).send({
        id: 'malicious-custom-id',
        title: 'Renamed Task',
      });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(originalId);
    });
  });

  describe('DELETE /tasks/:id (Delete task)', () => {
    test('should return 204 No Content and remove the task when deleting an existing task', async () => {
      const createRes = await request(app).post('/tasks').send({ title: 'To Delete' });
      const taskId = createRes.body.id;

      const delRes = await request(app).delete(`/tasks/${taskId}`);
      expect(delRes.status).toBe(204);
      expect(delRes.body).toEqual({});

      const listRes = await request(app).get('/tasks');
      expect(listRes.body).toEqual([]);
    });

    test('should return 404 when deleting a nonexistent task id', async () => {
      const res = await request(app).delete('/tasks/nonexistent-id');

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Task not found' });
    });
  });

  describe('PATCH /tasks/:id/complete (Complete task)', () => {
    test('should return 200, mark status as done, and set completedAt timestamp', async () => {
      const createRes = await request(app).post('/tasks').send({ title: 'Task to Complete', status: 'todo' });
      const taskId = createRes.body.id;

      const res = await request(app).patch(`/tasks/${taskId}/complete`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('done');
      expect(typeof res.body.completedAt).toBe('string');
      expect(isNaN(Date.parse(res.body.completedAt))).toBe(false);
    });

    test('should return 404 when completing a nonexistent task id', async () => {
      const res = await request(app).patch('/tasks/nonexistent-id/complete');

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Task not found' });
    });

    test('should preserve existing high priority when completing a task', async () => {
      const createRes = await request(app).post('/tasks').send({
        title: 'High Priority Task',
        priority: 'high',
      });
      const taskId = createRes.body.id;

      const res = await request(app).patch(`/tasks/${taskId}/complete`);

      expect(res.status).toBe(200);
      expect(res.body.priority).toBe('high');
    });

    test('should preserve existing low priority when completing a task', async () => {
      const createRes = await request(app).post('/tasks').send({
        title: 'Low Priority Task',
        priority: 'low',
      });
      const taskId = createRes.body.id;

      const res = await request(app).patch(`/tasks/${taskId}/complete`);

      expect(res.status).toBe(200);
      expect(res.body.priority).toBe('low');
    });
  });

  describe('PATCH /tasks/:id/assign (Assign task)', () => {
    test('should return 200 and updated task containing assignee for a valid assignee', async () => {
      const createRes = await request(app).post('/tasks').send({ title: 'Task to Assign' });
      const taskId = createRes.body.id;

      const res = await request(app)
        .patch(`/tasks/${taskId}/assign`)
        .send({ assignee: 'Alice' });

      expect(res.status).toBe(200);
      expect(res.body.assignee).toBe('Alice');
      expect(res.body.id).toBe(taskId);
      expect(res.body.title).toBe('Task to Assign');
    });

    test('should preserve existing task fields when assigning', async () => {
      const createRes = await request(app).post('/tasks').send({
        title: 'Original Title',
        description: 'Original Description',
        priority: 'high',
        status: 'in_progress',
      });
      const original = createRes.body;

      const res = await request(app)
        .patch(`/tasks/${original.id}/assign`)
        .send({ assignee: 'Bob' });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(original.id);
      expect(res.body.title).toBe(original.title);
      expect(res.body.description).toBe(original.description);
      expect(res.body.status).toBe(original.status);
      expect(res.body.priority).toBe(original.priority);
      expect(res.body.createdAt).toBe(original.createdAt);
      expect(res.body.assignee).toBe('Bob');
    });

    test('should trim surrounding whitespace from assignee before storing', async () => {
      const createRes = await request(app).post('/tasks').send({ title: 'Trim Test' });
      const taskId = createRes.body.id;

      const res = await request(app)
        .patch(`/tasks/${taskId}/assign`)
        .send({ assignee: '  Anto  ' });

      expect(res.status).toBe(200);
      expect(res.body.assignee).toBe('Anto');
    });

    test('should allow reassignment and replace previous assignee', async () => {
      const createRes = await request(app).post('/tasks').send({ title: 'Reassign Task' });
      const taskId = createRes.body.id;

      await request(app)
        .patch(`/tasks/${taskId}/assign`)
        .send({ assignee: 'First Assignee' });

      const res = await request(app)
        .patch(`/tasks/${taskId}/assign`)
        .send({ assignee: 'Second Assignee' });

      expect(res.status).toBe(200);
      expect(res.body.assignee).toBe('Second Assignee');
    });

    test('should return 404 when assigning a nonexistent task id', async () => {
      const res = await request(app)
        .patch('/tasks/nonexistent-id/assign')
        .send({ assignee: 'Alice' });

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Task not found' });
    });

    test('should return 400 when assignee is missing from request body', async () => {
      const createRes = await request(app).post('/tasks').send({ title: 'Missing Assignee' });
      const taskId = createRes.body.id;

      const res = await request(app)
        .patch(`/tasks/${taskId}/assign`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('assignee is required and must be a non-empty string');
    });

    test('should return 400 when assignee is not a string (number)', async () => {
      const createRes = await request(app).post('/tasks').send({ title: 'Invalid Type' });
      const taskId = createRes.body.id;

      const res = await request(app)
        .patch(`/tasks/${taskId}/assign`)
        .send({ assignee: 12345 });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('assignee is required and must be a non-empty string');
    });

    test('should return 400 when assignee is an empty string', async () => {
      const createRes = await request(app).post('/tasks').send({ title: 'Empty String' });
      const taskId = createRes.body.id;

      const res = await request(app)
        .patch(`/tasks/${taskId}/assign`)
        .send({ assignee: '' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('assignee is required and must be a non-empty string');
    });

    test('should return 400 when assignee contains only whitespace', async () => {
      const createRes = await request(app).post('/tasks').send({ title: 'Whitespace Only' });
      const taskId = createRes.body.id;

      const res = await request(app)
        .patch(`/tasks/${taskId}/assign`)
        .send({ assignee: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('assignee is required and must be a non-empty string');
    });
  });
});