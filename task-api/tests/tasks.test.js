const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

describe('Task API Endpoints', () => {
  beforeEach(() => {
    taskService._reset(); // Reset in-memory store before each test
  });

  describe('POST /tasks', () => {
    it('should create a new task successfully', async () => {
      const res = await request(app).post('/tasks').send({
        title: 'Test task',
        description: 'Test description',
        status: 'todo',
        priority: 'high',
        dueDate: '2025-12-31T00:00:00.000Z',
        assignee: 'Alice'
      });

      expect(res.statusCode).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.title).toBe('Test task');
      expect(res.body.status).toBe('todo');
      expect(res.body.priority).toBe('high');
      expect(res.body.assignee).toBe('Alice');
    });

    it('should return 400 if title is missing', async () => {
      const res = await request(app).post('/tasks').send({ description: 'No title' });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('title is required');
    });

    it('should return 400 if status is invalid', async () => {
      const res = await request(app).post('/tasks').send({ title: 'Test', status: 'invalid' });
      expect(res.statusCode).toBe(400);
    });

    it('should return 400 if assignee is empty string', async () => {
      const res = await request(app).post('/tasks').send({ title: 'Test', assignee: '   ' });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('assignee must be a non-empty string');
    });
  });

  describe('GET /tasks', () => {
    beforeEach(() => {
      taskService.create({ title: 'Task 1', status: 'todo' });
      taskService.create({ title: 'Task 2', status: 'done' });
      taskService.create({ title: 'Task 3', status: 'todo' });
    });

    it('should return all tasks', async () => {
      const res = await request(app).get('/tasks');
      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBe(3);
    });

    it('should filter tasks by status properly (Bug Fix #2)', async () => {
      const res = await request(app).get('/tasks?status=todo');
      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBe(2);
      
      const res2 = await request(app).get('/tasks?status=do');
      expect(res2.statusCode).toBe(200);
      expect(res2.body.length).toBe(0); // Should be 0, older version returned 3
    });

    it('should paginate tasks properly (Bug Fix #1)', async () => {
      // Create total 10 tasks to test pagination limits
      for(let i=4; i<=10; i++) taskService.create({ title: `Task ${i}` });

      const page1 = await request(app).get('/tasks?page=1&limit=5');
      expect(page1.statusCode).toBe(200);
      expect(page1.body.length).toBe(5);
      expect(page1.body[0].title).toBe('Task 1');

      const page2 = await request(app).get('/tasks?page=2&limit=5');
      expect(page2.statusCode).toBe(200);
      expect(page2.body.length).toBe(5);
      expect(page2.body[0].title).toBe('Task 6');
    });
  });

  describe('GET /tasks/:id', () => {
    it('should fetch a specific task by id (Bug Fix #4)', async () => {
      const task = taskService.create({ title: 'Find Me' });
      const res = await request(app).get(`/tasks/${task.id}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body.id).toBe(task.id);
      expect(res.body.title).toBe('Find Me');
    });

    it('should return 404 for non-existent id', async () => {
      const res = await request(app).get('/tasks/invalid-id');
      expect(res.statusCode).toBe(404);
    });
  });

  describe('PUT /tasks/:id', () => {
    let taskId;
    beforeEach(() => {
      const task = taskService.create({ title: 'Original Task' });
      taskId = task.id;
    });

    it('should update task fields securely (Bug Fix #5)', async () => {
      const res = await request(app).put(`/tasks/${taskId}`).send({
        title: 'Updated Task',
        id: 'hacked-id', // Attacking the endpoint
        isAdmin: true // Arbitrary field
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.title).toBe('Updated Task');
      expect(res.body.id).toBe(taskId); // ID should not be updated
      expect(res.body.isAdmin).toBeUndefined(); // Unknown fields should be dropped
    });

    it('should return 404 for updating non-existent task', async () => {
      const res = await request(app).put(`/tasks/invalid`).send({ title: 'New' });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('DELETE /tasks/:id', () => {
    it('should delete an existing task', async () => {
      const task = taskService.create({ title: 'Delete Me' });
      const res = await request(app).delete(`/tasks/${task.id}`);
      expect(res.statusCode).toBe(204);

      const fetchRes = await request(app).get(`/tasks/${task.id}`);
      expect(fetchRes.statusCode).toBe(404);
    });

    it('should return 404 for deleting non-existent task', async () => {
      const res = await request(app).delete('/tasks/invalid-id');
      expect(res.statusCode).toBe(404);
    });
  });

  describe('PATCH /tasks/:id/complete', () => {
    it('should complete task without altering priority (Bug Fix #3)', async () => {
      const task = taskService.create({ title: 'Complete Me', priority: 'high' });
      const res = await request(app).patch(`/tasks/${task.id}/complete`);

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('done');
      expect(res.body.priority).toBe('high'); // Used to erroneously change to 'medium'
      expect(res.body.completedAt).toBeDefined();
    });
    
    it('should return 404 if completing non-existent task', async () => {
      const res = await request(app).patch('/tasks/non-existent/complete');
      expect(res.statusCode).toBe(404);
    });
  });

  describe('PATCH /tasks/:id/assign', () => {
    it('should assign a task to a user', async () => {
      const task = taskService.create({ title: 'Assign Me' });
      const res = await request(app).patch(`/tasks/${task.id}/assign`).send({
        assignee: 'Bob Builder'
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.assignee).toBe('Bob Builder');
    });

    it('should return 400 if assignee is missing or invalid', async () => {
      const task = taskService.create({ title: 'Assign Me' });
      
      const res1 = await request(app).patch(`/tasks/${task.id}/assign`).send({});
      expect(res1.statusCode).toBe(400);

      const res2 = await request(app).patch(`/tasks/${task.id}/assign`).send({ assignee: '' });
      expect(res2.statusCode).toBe(400);
    });
    
    it('should return 404 if assigning non-existent task', async () => {
      const res = await request(app).patch('/tasks/non-existent/assign').send({ assignee: 'Bob' });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('GET /tasks/stats', () => {
    it('should return correct statistics', async () => {
      taskService.create({ title: 'Task 1', status: 'todo' });
      taskService.create({ title: 'Task 2', status: 'in_progress', dueDate: '2020-01-01' }); // Overdue
      taskService.create({ title: 'Task 3', status: 'done' });

      const res = await request(app).get('/tasks/stats');

      expect(res.statusCode).toBe(200);
      expect(res.body.todo).toBe(1);
      expect(res.body.in_progress).toBe(1);
      expect(res.body.done).toBe(1);
      expect(res.body.overdue).toBe(1);
    });
  });
});
