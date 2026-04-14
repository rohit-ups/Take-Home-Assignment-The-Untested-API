const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

describe('Tasks API', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('GET /tasks/stats', () => {
    it('should return 200 and task stats', async () => {
      taskService.create({ title: 'Task 1', status: 'todo' });
      taskService.create({ title: 'Task 2', status: 'done' });
      
      const res = await request(app).get('/tasks/stats');
      expect(res.statusCode).toBe(200);
      expect(res.body.todo).toBe(1);
      expect(res.body.done).toBe(1);
    });
  });

  describe('GET /tasks', () => {
    beforeEach(() => {
      taskService.create({ title: 'Task 1', status: 'todo' });
      taskService.create({ title: 'Task 2', status: 'in_progress' });
      taskService.create({ title: 'Task 3', status: 'done' });
    });

    it('should return all tasks', async () => {
      const res = await request(app).get('/tasks');
      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBe(3);
    });

    it('should filter tasks by status', async () => {
      const res = await request(app).get('/tasks?status=todo');
      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].status).toBe('todo');
    });

    it('should return paginated tasks', async () => {
      const res = await request(app).get('/tasks?page=0&limit=2');
      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBe(2);
      expect(res.body[0].title).toBe('Task 1');
      expect(res.body[1].title).toBe('Task 2');
    });
  });

  describe('POST /tasks', () => {
    it('should return 201 and create a task', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'New Task', priority: 'high' });
      expect(res.statusCode).toBe(201);
      expect(res.body.title).toBe('New Task');
      expect(res.body.priority).toBe('high');
      expect(taskService.getAll().length).toBe(1);
    });

    it('should return 400 if validation fails', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ priority: 'high' }); // missing title
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBeDefined();
    });
    
    it('should return 400 if priority is invalid', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'T1', priority: 'ultra' });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/priority/);
    });
  });

  describe('PUT /tasks/:id', () => {
    let taskId;
    beforeEach(() => {
      const task = taskService.create({ title: 'Original' });
      taskId = task.id;
    });

    it('should return 200 and update the task', async () => {
      const res = await request(app)
        .put(`/tasks/${taskId}`)
        .send({ title: 'Updated Task', status: 'in_progress' });
      expect(res.statusCode).toBe(200);
      expect(res.body.title).toBe('Updated Task');
      expect(res.body.status).toBe('in_progress');
    });

    it('should return 404 if task not found', async () => {
      const res = await request(app)
        .put('/tasks/invalid-id')
        .send({ title: 'Updated' });
      expect(res.statusCode).toBe(404);
    });

    it('should return 400 if validation fails', async () => {
      const res = await request(app)
        .put(`/tasks/${taskId}`)
        .send({ title: '' }); // invalid empty title
      expect(res.statusCode).toBe(400);
    });
  });

  describe('DELETE /tasks/:id', () => {
    let taskId;
    beforeEach(() => {
      const task = taskService.create({ title: 'To Delete' });
      taskId = task.id;
    });

    it('should return 204 and delete the task', async () => {
      const res = await request(app).delete(`/tasks/${taskId}`);
      expect(res.statusCode).toBe(204);
      expect(taskService.findById(taskId)).toBeUndefined();
    });

    it('should return 404 if task not found', async () => {
      const res = await request(app).delete('/tasks/invalid-id');
      expect(res.statusCode).toBe(404);
    });
  });

  describe('PATCH /tasks/:id/complete', () => {
    let taskId;
    beforeEach(() => {
      const task = taskService.create({ title: 'To Complete', status: 'todo' });
      taskId = task.id;
    });

    it('should return 200 and mark task complete', async () => {
      const res = await request(app).patch(`/tasks/${taskId}/complete`);
      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('done');
      expect(res.body.completedAt).not.toBeNull();
    });

    it('should return 404 if task not found', async () => {
      const res = await request(app).patch('/tasks/invalid-id/complete');
      expect(res.statusCode).toBe(404);
    });
  });

  describe('PATCH /tasks/:id/assign', () => {
    let taskId;
    beforeEach(() => {
      const task = taskService.create({ title: 'To Assign' });
      taskId = task.id;
    });

    it('should return 200 and assign task', async () => {
      const res = await request(app)
        .patch(`/tasks/${taskId}/assign`)
        .send({ assignee: 'Parth' });
      expect(res.statusCode).toBe(200);
      expect(res.body.assignee).toBe('Parth');
    });

    it('should return 400 for invalid assignee', async () => {
      const res = await request(app)
        .patch(`/tasks/${taskId}/assign`)
        .send({ assignee: '' });
      expect(res.statusCode).toBe(400);
    });

    it('should return 404 if task not found', async () => {
      const res = await request(app)
        .patch('/tasks/invalid-id/assign')
        .send({ assignee: 'Parth' });
      expect(res.statusCode).toBe(404);
    });
  });
});
