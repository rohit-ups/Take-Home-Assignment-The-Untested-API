const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

describe('tasks API Integration Tests', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('GET /tasks/stats', () => {
    it('should return default counts for stats', async () => {
      const res = await request(app).get('/tasks/stats');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        todo: 0,
        in_progress: 0,
        done: 0,
        overdue: 0,
      });
    });

    it('should return correct counts when tasks exist', async () => {
      taskService.create({ title: 'Task 1', status: 'todo' });
      taskService.create({ title: 'Task 2', status: 'in_progress' });
      taskService.create({ title: 'Task 3', status: 'done' });
      
      const res = await request(app).get('/tasks/stats');
      expect(res.status).toBe(200);
      expect(res.body.todo).toBe(1);
      expect(res.body.in_progress).toBe(1);
      expect(res.body.done).toBe(1);
    });
  });

  describe('GET /tasks', () => {
    it('should return an empty list initially', async () => {
      const res = await request(app).get('/tasks');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('should return all tasks', async () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });

      const res = await request(app).get('/tasks');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
      expect(res.body[0].title).toBe('Task 1');
      expect(res.body[1].title).toBe('Task 2');
    });

    it('should filter tasks by status with exact match', async () => {
      taskService.create({ title: 'Task 1', status: 'todo' });
      taskService.create({ title: 'Task 2', status: 'done' });

      const res1 = await request(app).get('/tasks?status=done');
      expect(res1.status).toBe(200);
      expect(res1.body.length).toBe(1);
      expect(res1.body[0].title).toBe('Task 2');

      const res2 = await request(app).get('/tasks?status=do');
      expect(res2.status).toBe(200);
      expect(res2.body.length).toBe(0);
    });

    it('should return paginated tasks using 1-based page', async () => {
      for (let i = 0; i < 15; i++) {
        taskService.create({ title: `Task ${i}` });
      }

      const res = await request(app).get('/tasks?page=1&limit=10');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(10);
      expect(res.body[0].title).toBe('Task 0');
      expect(res.body[9].title).toBe('Task 9');
    });

    it('should paginate with default limit if page is specified and limit is not', async () => {
      for (let i = 0; i < 15; i++) {
        taskService.create({ title: `Task ${i}` });
      }

      const res = await request(app).get('/tasks?page=1');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(10);
      expect(res.body[0].title).toBe('Task 0');
    });

    it('should paginate with default page if limit is specified and page is not', async () => {
      for (let i = 0; i < 15; i++) {
        taskService.create({ title: `Task ${i}` });
      }

      const res = await request(app).get('/tasks?limit=5');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(5);
      expect(res.body[0].title).toBe('Task 0');
    });
  });

  describe('POST /tasks', () => {
    it('should create a task successfully with valid data', async () => {
      const data = {
        title: 'New Task',
        description: 'New Description',
        status: 'todo',
        priority: 'high',
        dueDate: new Date().toISOString(),
      };

      const res = await request(app)
        .post('/tasks')
        .send(data);

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.title).toBe(data.title);
      expect(res.body.description).toBe(data.description);
      expect(res.body.status).toBe(data.status);
      expect(res.body.priority).toBe(data.priority);
      expect(res.body.dueDate).toBe(data.dueDate);
      expect(res.body.completedAt).toBeNull();
      expect(res.body.assignee).toBeNull();
      expect(res.body.createdAt).toBeDefined();
    });

    it('should return 400 if title is missing or empty', async () => {
      const res1 = await request(app)
        .post('/tasks')
        .send({ description: 'No Title' });

      expect(res1.status).toBe(400);
      expect(res1.body.error).toContain('title is required');

      const res2 = await request(app)
        .post('/tasks')
        .send({ title: '   ' });

      expect(res2.status).toBe(400);
      expect(res2.body.error).toContain('title is required');
    });

    it('should return 400 if status is invalid', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'Task', status: 'invalid_status' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('status must be one of');
    });

    it('should return 400 if priority is invalid', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'Task', priority: 'invalid_priority' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('priority must be one of');
    });

    it('should return 400 if dueDate is not a valid date string', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'Task', dueDate: 'not-a-date' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('dueDate must be a valid ISO date string');
    });
  });

  describe('PUT /tasks/:id', () => {
    it('should update task successfully with valid data', async () => {
      const task = taskService.create({ title: 'Before Update', description: 'Old description' });

      const res = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ title: 'After Update', status: 'in_progress', priority: 'low' });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(task.id);
      expect(res.body.title).toBe('After Update');
      expect(res.body.status).toBe('in_progress');
      expect(res.body.priority).toBe('low');
      expect(res.body.description).toBe('Old description');
    });

    it('should return 400 if update payload has invalid title', async () => {
      const task = taskService.create({ title: 'Task' });

      const res = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ title: '' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('title must be a non-empty string');
    });

    it('should return 400 if update payload has invalid status', async () => {
      const task = taskService.create({ title: 'Task' });

      const res = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ status: 'invalid_status' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('status must be one of');
    });

    it('should return 400 if update payload has invalid priority', async () => {
      const task = taskService.create({ title: 'Task' });

      const res = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ priority: 'invalid_priority' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('priority must be one of');
    });

    it('should return 400 if update payload has invalid dueDate', async () => {
      const task = taskService.create({ title: 'Task' });

      const res = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ dueDate: 'invalid_date' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('dueDate must be a valid ISO date string');
    });

    it('should return 404 if task to update does not exist', async () => {
      const res = await request(app)
        .put('/tasks/non-existent-uuid')
        .send({ title: 'Task' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });
  });

  describe('DELETE /tasks/:id', () => {
    it('should delete task and return 204', async () => {
      const task = taskService.create({ title: 'Delete Me' });

      const res = await request(app).delete(`/tasks/${task.id}`);
      expect(res.status).toBe(204);

      const found = taskService.findById(task.id);
      expect(found).toBeUndefined();
    });

    it('should return 404 if task to delete does not exist', async () => {
      const res = await request(app).delete('/tasks/non-existent-uuid');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });
  });

  describe('PATCH /tasks/:id/complete', () => {
    it('should mark task as completed, return updated task, and keep priority', async () => {
      const task = taskService.create({ title: 'Complete Me', priority: 'high' });

      const res = await request(app).patch(`/tasks/${task.id}/complete`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('done');
      expect(res.body.priority).toBe('high');
      expect(res.body.completedAt).toBeDefined();
    });

    it('should return 404 if task to complete does not exist', async () => {
      const res = await request(app).patch('/tasks/non-existent-uuid/complete');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });
  });

  describe('PATCH /tasks/:id/assign', () => {
    it('should assign a task successfully', async () => {
      const task = taskService.create({ title: 'Task to Assign' });

      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 'Jane Smith' });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(task.id);
      expect(res.body.assignee).toBe('Jane Smith');
    });

    it('should return 400 if assignee is empty string', async () => {
      const task = taskService.create({ title: 'Task to Assign' });

      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: '' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('assignee is required and must be a non-empty string');
    });

    it('should return 400 if assignee is missing', async () => {
      const task = taskService.create({ title: 'Task to Assign' });

      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('assignee is required and must be a non-empty string');
    });

    it('should return 400 if assignee is not a string', async () => {
      const task = taskService.create({ title: 'Task to Assign' });

      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 12345 });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('assignee is required and must be a non-empty string');
    });

    it('should return 404 if task to assign does not exist', async () => {
      const res = await request(app)
        .patch('/tasks/non-existent-uuid/assign')
        .send({ assignee: 'Jane Smith' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });
  });
});
