const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

describe('Task API Integration Tests', () => {
  // Clear data before each test runs
  beforeEach(() => {
    taskService._reset();
  });

  describe('POST /tasks', () => {
    it('should create a task successfully and return 201', async () => {
      const payload = { title: 'Test API Task', priority: 'high' };
      
      const res = await request(app).post('/tasks').send(payload);

      expect(res.status).toBe(201);
      expect(res.body.title).toBe('Test API Task');
      expect(res.body.priority).toBe('high');
      expect(res.body.id).toBeDefined();
    });

    it('should return 400 if title is missing (edge case)', async () => {
      const payload = { priority: 'high' }; // missing title
      
      const res = await request(app).post('/tasks').send(payload);

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });
  });

  describe('GET /tasks', () => {
    beforeEach(() => {
      taskService.create({ title: 'Task 1', status: 'todo' });
      taskService.create({ title: 'Task 2', status: 'done' });
    });

    it('should return all tasks', async () => {
      const res = await request(app).get('/tasks');
      
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
    });

    it('should return tasks filtered by status', async () => {
      const res = await request(app).get('/tasks?status=done');
      
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].title).toBe('Task 2');
    });

    it('should return empty array if status has no matches (edge case)', async () => {
      const res = await request(app).get('/tasks?status=in_progress');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(0);
    });

    it('should return exactly the right paginated tasks', async () => {
      // Add more tasks for pagination testing
      taskService.create({ title: 'Task 3', status: 'todo' });
      taskService.create({ title: 'Task 4', status: 'done' });
      taskService.create({ title: 'Task 5', status: 'todo' });
      
      // Page 1, limit 2 should return Task 1 and Task 2
      const res1 = await request(app).get('/tasks?page=1&limit=2');
      expect(res1.status).toBe(200);
      expect(res1.body.length).toBe(2);
      expect(res1.body[0].title).toBe('Task 1');
      expect(res1.body[1].title).toBe('Task 2');

      // Page 2, limit 2 should return Task 3 and Task 4
      const res2 = await request(app).get('/tasks?page=2&limit=2');
      expect(res2.status).toBe(200);
      expect(res2.body.length).toBe(2);
      expect(res2.body[0].title).toBe('Task 3');
      expect(res2.body[1].title).toBe('Task 4');
    });

    it('should combine status filter and pagination correctly', async () => {
      taskService.create({ title: 'Task 3', status: 'done' });
      taskService.create({ title: 'Task 4', status: 'done' });
      taskService.create({ title: 'Task 5', status: 'done' });
      
      // We have 4 'done' tasks: Task 2, Task 3, Task 4, Task 5. 
      // Request page 2 with limit 2.
      const res = await request(app).get('/tasks?status=done&page=2&limit=2');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
      expect(res.body[0].title).toBe('Task 4');
      expect(res.body[1].title).toBe('Task 5');
    });

    it('should fallback securely to page 1 if given negative or zero page (edge case)', async () => {
      const res = await request(app).get('/tasks?page=-5&limit=2');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
      expect(res.body[0].title).toBe('Task 1'); // Successfully loaded page 1 instead of negative indices
    });
  });

  describe('GET /tasks/stats', () => {
    it('should return accurate stats', async () => {
      taskService.create({ title: 'A', status: 'todo' });
      taskService.create({ title: 'B', status: 'done', dueDate: '2020-01-01' }); 

      const res = await request(app).get('/tasks/stats');
      
      expect(res.status).toBe(200);
      expect(res.body.todo).toBe(1);
      expect(res.body.done).toBe(1);
    });
  });

  describe('PUT /tasks/:id', () => {
    it('should update an existing task', async () => {
      const task = taskService.create({ title: 'Old Title' });
      
      const payload = { title: 'New Title', status: 'in_progress' };
      const res = await request(app).put(`/tasks/${task.id}`).send(payload);

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('New Title');
    });

    it('should return 404 if task ID does not exist (edge case)', async () => {
      const res = await request(app).put('/tasks/invalid-id').send({ title: 'Test' });
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /tasks/:id/complete', () => {
    it('should mark task as complete', async () => {
      const task = taskService.create({ title: 'Finish me' });
      
      const res = await request(app).patch(`/tasks/${task.id}/complete`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('done');
    });

    it('should return 404 if task ID does not exist (edge case)', async () => {
      const res = await request(app).patch('/tasks/invalid-id/complete');
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /tasks/:id/assign', () => {
    it('should assign task and return 200', async () => {
      const task = taskService.create({ title: 'A' });
      const res = await request(app).patch(`/tasks/${task.id}/assign`).send({ assignee: 'Alice' });
      expect(res.status).toBe(200);
      expect(res.body.assignee).toBe('Alice');
    });

    it('should return 400 if assignee is missing or empty', async () => {
      const task = taskService.create({ title: 'A' });
      const res = await request(app).patch(`/tasks/${task.id}/assign`).send({ assignee: '   ' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should return 400 if already assigned to a different user', async () => {
      const task = taskService.create({ title: 'A' });
      await request(app).patch(`/tasks/${task.id}/assign`).send({ assignee: 'Bob' });
      
      const res = await request(app).patch(`/tasks/${task.id}/assign`).send({ assignee: 'Charlie' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Task is already assigned to someone else');
    });

    it('should return 404 if task not found', async () => {
      const res = await request(app).patch('/tasks/bad-id/assign').send({ assignee: 'Alice' });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /tasks/:id', () => {
    it('should delete existing task and return 204', async () => {
      const task = taskService.create({ title: 'Delete me' });
      
      const res = await request(app).delete(`/tasks/${task.id}`);

      expect(res.status).toBe(204);
      expect(taskService.getAll().length).toBe(0); // verify in memory
    });

    it('should return 404 if task does not exist (edge case)', async () => {
      const res = await request(app).delete(`/tasks/bad-id`);
      expect(res.status).toBe(404);
    });
  });

});
