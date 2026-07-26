const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

describe('Tasks API Integration Tests', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('GET /tasks', () => {
    test('should return an empty list initially', async () => {
      const response = await request(app).get('/tasks');
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    test('should return all created tasks', async () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });

      const response = await request(app).get('/tasks');
      expect(response.status).toBe(200);
      expect(response.body.length).toBe(2);
      expect(response.body[0].title).toBe('Task 1');
      expect(response.body[1].title).toBe('Task 2');
    });

    test('should filter tasks by status', async () => {
      taskService.create({ title: 'Todo 1', status: 'todo' });
      taskService.create({ title: 'Done 1', status: 'done' });

      const response = await request(app).get('/tasks?status=todo');
      expect(response.status).toBe(200);
      expect(response.body.length).toBe(1);
      expect(response.body[0].title).toBe('Todo 1');
    });

    test('should return empty list when no tasks match status strictly', async () => {
      taskService.create({ title: 'Todo 1', status: 'todo' });

      const response = await request(app).get('/tasks?status=to');
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    test('should support pagination correctly starting at index 0 for page 1', async () => {
      for (let i = 1; i <= 5; i++) {
        taskService.create({ title: `Task ${i}` });
      }

      const responsePage1 = await request(app).get('/tasks?page=1&limit=2');
      expect(responsePage1.status).toBe(200);
      expect(responsePage1.body.length).toBe(2);
      expect(responsePage1.body[0].title).toBe('Task 1');
      expect(responsePage1.body[1].title).toBe('Task 2');

      const responsePage2 = await request(app).get('/tasks?page=2&limit=2');
      expect(responsePage2.status).toBe(200);
      expect(responsePage2.body.length).toBe(2);
      expect(responsePage2.body[0].title).toBe('Task 3');
      expect(responsePage2.body[1].title).toBe('Task 4');
    });
  });

  describe('POST /tasks', () => {
    test('should create a task with valid data', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({
          title: 'New Task',
          description: 'A test description',
          priority: 'high',
          status: 'in_progress',
        });

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.title).toBe('New Task');
      expect(response.body.status).toBe('in_progress');
      expect(response.body.priority).toBe('high');
      expect(response.body.assignee).toBeNull();
    });

    test('should fail to create a task with missing title', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({ description: 'No title' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('title');
    });

    test('should fail to create a task with invalid status', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({ title: 'Task', status: 'unknown' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('status must be one of');
    });

    test('should fail to create a task with invalid priority', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({ title: 'Task', priority: 'extreme' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('priority must be one of');
    });

    test('should fail to create a task with invalid dueDate', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({ title: 'Task', dueDate: 'invalid-date' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('dueDate must be a valid ISO date');
    });
  });

  describe('PUT /tasks/:id', () => {
    test('should update an existing task successfully', async () => {
      const task = taskService.create({ title: 'Old Title', priority: 'medium' });

      const response = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ title: 'Updated Title', priority: 'low' });

      expect(response.status).toBe(200);
      expect(response.body.title).toBe('Updated Title');
      expect(response.body.priority).toBe('low');
    });

    test('should return 400 for invalid update payload', async () => {
      const task = taskService.create({ title: 'Title' });

      const response = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ status: 'invalid_status' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    test('should return 404 if updating non-existent task', async () => {
      const response = await request(app)
        .put('/tasks/non-existent-id')
        .send({ title: 'Random Title' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Task not found');
    });
  });

  describe('DELETE /tasks/:id', () => {
    test('should delete task and return 204', async () => {
      const task = taskService.create({ title: 'To Delete' });

      const response = await request(app).delete(`/tasks/${task.id}`);
      expect(response.status).toBe(204);
      expect(taskService.findById(task.id)).toBeUndefined();
    });

    test('should return 404 when deleting a non-existent task', async () => {
      const response = await request(app).delete('/tasks/non-existent');
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Task not found');
    });
  });

  describe('PATCH /tasks/:id/complete', () => {
    test('should complete task, set status done, and preserve original priority', async () => {
      const task = taskService.create({ title: 'Do HW', priority: 'high' });

      const response = await request(app).patch(`/tasks/${task.id}/complete`);
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('done');
      expect(response.body.completedAt).not.toBeNull();
      // Should preserve priority instead of resetting to medium!
      expect(response.body.priority).toBe('high');
    });

    test('should return 404 for completing non-existent task', async () => {
      const response = await request(app).patch('/tasks/non-existent/complete');
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Task not found');
    });
  });

  describe('GET /tasks/stats', () => {
    test('should return counts by status and overdue count', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      taskService.create({ title: 'Task 1', status: 'todo', dueDate: yesterday.toISOString() });
      taskService.create({ title: 'Task 2', status: 'in_progress' });
      taskService.create({ title: 'Task 3', status: 'done', dueDate: yesterday.toISOString() });

      const response = await request(app).get('/tasks/stats');
      expect(response.status).toBe(200);
      expect(response.body.todo).toBe(1);
      expect(response.body.in_progress).toBe(1);
      expect(response.body.done).toBe(1);
      expect(response.body.overdue).toBe(1); // Task 1 is overdue, Task 3 is done so not overdue
    });
  });

  describe('PATCH /tasks/:id/assign', () => {
    test('should assign task to assignee successfully', async () => {
      const task = taskService.create({ title: 'Unassigned Task' });

      const response = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 'Charlie Brown' });

      expect(response.status).toBe(200);
      expect(response.body.assignee).toBe('Charlie Brown');
    });

    test('should return 400 if assignee is missing in request body', async () => {
      const task = taskService.create({ title: 'Unassigned Task' });

      const response = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('assignee is required');
    });

    test('should return 400 if assignee is not a string', async () => {
      const task = taskService.create({ title: 'Unassigned Task' });

      const response = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 12345 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('assignee must be a non-empty string');
    });

    test('should return 400 if assignee is empty string', async () => {
      const task = taskService.create({ title: 'Unassigned Task' });

      const response = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: '   ' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('assignee must be a non-empty string');
    });

    test('should return 404 if task does not exist', async () => {
      const response = await request(app)
        .patch('/tasks/non-existent-id/assign')
        .send({ assignee: 'Charlie Brown' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Task not found');
    });
  });

  describe('Edge cases and Error handling', () => {
    test('should support pagination with page only', async () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });

      const response = await request(app).get('/tasks?page=1');
      expect(response.status).toBe(200);
      expect(response.body.length).toBe(2);
    });

    test('should support pagination with limit only', async () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });

      const response = await request(app).get('/tasks?limit=1');
      expect(response.status).toBe(200);
      expect(response.body.length).toBe(1);
    });

    test('should fallback to defaults for negative or invalid page and limit query params', async () => {
      for (let i = 1; i <= 15; i++) {
        taskService.create({ title: `Task ${i}` });
      }

      // page=-1, limit=abc -> falls back to page 1, limit 10
      const response1 = await request(app).get('/tasks?page=-1&limit=abc');
      expect(response1.status).toBe(200);
      expect(response1.body.length).toBe(10);
      expect(response1.body[0].title).toBe('Task 1');

      // page=abc, limit=-5 -> falls back to page 1, limit 10
      const response2 = await request(app).get('/tasks?page=abc&limit=-5');
      expect(response2.status).toBe(200);
      expect(response2.body.length).toBe(10);
    });

    test('should ignore mass assignment fields when calling PUT /tasks/:id', async () => {
      const task = taskService.create({ title: 'Task' });
      const originalCreatedAt = task.createdAt;

      const response = await request(app)
        .put(`/tasks/${task.id}`)
        .send({
          title: 'Modified Title',
          id: 'hacker-id',
          createdAt: '2000-01-01',
          completedAt: '2000-01-01'
        });

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(task.id);
      expect(response.body.createdAt).toBe(originalCreatedAt);
      expect(response.body.completedAt).toBeNull();
      expect(response.body.title).toBe('Modified Title');
    });

    test('should return 400 for PUT with invalid title (non-string)', async () => {
      const task = taskService.create({ title: 'Task' });
      const response = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ title: 123 });
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('title');
    });

    test('should return 400 for PUT with invalid title (empty string)', async () => {
      const task = taskService.create({ title: 'Task' });
      const response = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ title: '   ' });
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('title');
    });

    test('should return 400 for PUT with invalid priority', async () => {
      const task = taskService.create({ title: 'Task' });
      const response = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ priority: 'extreme' });
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('priority');
    });

    test('should return 400 for PUT with invalid dueDate', async () => {
      const task = taskService.create({ title: 'Task' });
      const response = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ dueDate: 'invalid-date' });
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('dueDate');
    });

    test('should trigger 500 internal server error handler', async () => {
      const originalGetAll = taskService.getAll;
      taskService.getAll = () => {
        throw new Error('Mock Database Error');
      };
      const response = await request(app).get('/tasks');
      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
      taskService.getAll = originalGetAll; // restore
    });
  });
});
