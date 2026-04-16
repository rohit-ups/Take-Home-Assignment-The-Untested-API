const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

describe('Tasks API', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('POST /tasks', () => {
    it('should create a new task', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({ title: 'New Task' });
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe('New Task');
    });

    it('should return 400 if title is missing', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({});
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('should return 400 if status is invalid', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({ title: 'Task', status: 'invalid_status' });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /tasks', () => {
    beforeEach(() => {
      taskService.create({ title: 'Task 1', status: 'todo' });
      taskService.create({ title: 'Task 2', status: 'done' });
      taskService.create({ title: 'Task 3', status: 'in_progress' });
    });

    it('should return all tasks', async () => {
      const response = await request(app).get('/tasks');
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(3);
    });

    it('should filter tasks by status', async () => {
      const response = await request(app).get('/tasks?status=todo');
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].title).toBe('Task 1');
    });

    it('should paginate tasks (with bug in mind)', async () => {
      // After fixing bug, page 1 limit 2 should return first 2 items
      const response = await request(app).get('/tasks?page=1&limit=2');
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].title).toBe('Task 1');
      expect(response.body[1].title).toBe('Task 2');
    });
  });

  describe('GET /tasks/stats', () => {
    it('should return task statistics', async () => {
      taskService.create({ title: 'T1', status: 'todo' });
      taskService.create({ title: 'T2', status: 'done' });
      
      const response = await request(app).get('/tasks/stats');
      expect(response.status).toBe(200);
      expect(response.body.todo).toBe(1);
      expect(response.body.done).toBe(1);
      expect(response.body.in_progress).toBe(0);
    });
  });

  describe('PUT /tasks/:id', () => {
    let task;
    beforeEach(() => {
      task = taskService.create({ title: 'Old Title' });
    });

    it('should update task successfully', async () => {
      const response = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ title: 'New Title' });
      
      expect(response.status).toBe(200);
      expect(response.body.title).toBe('New Title');
    });

    it('should return 404 for non-existent task', async () => {
      const response = await request(app)
        .put('/tasks/invalid-id')
        .send({ title: 'New Title' });
      
      expect(response.status).toBe(404);
    });

    it('should return 400 for invalid data', async () => {
      const response = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ status: 'invalid_status' });
      
      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /tasks/:id', () => {
    let task;
    beforeEach(() => {
      task = taskService.create({ title: 'To Delete' });
    });

    it('should delete a task', async () => {
      const response = await request(app).delete(`/tasks/${task.id}`);
      expect(response.status).toBe(204);
      expect(taskService.getAll()).toHaveLength(0);
    });

    it('should return 404 for non-existent task', async () => {
      const response = await request(app).delete('/tasks/invalid-id');
      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /tasks/:id/complete', () => {
    let task;
    beforeEach(() => {
      task = taskService.create({ title: 'To Complete', status: 'todo' });
    });

    it('should mark task as complete', async () => {
      const response = await request(app).patch(`/tasks/${task.id}/complete`);
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('done');
      expect(response.body.completedAt).not.toBeNull();
    });

    it('should return 404 for non-existent task', async () => {
      const response = await request(app).patch('/tasks/invalid-id/complete');
      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /tasks/:id/assign', () => {
    let task;
    beforeEach(() => {
      task = taskService.create({ title: 'To Assign' });
    });

    it('should assign a task', async () => {
      const response = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 'Alice' });
      expect(response.status).toBe(200);
      expect(response.body.assignee).toBe('Alice');
    });

    it('should return 400 for empty assignee', async () => {
      const response = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: '' });
      expect(response.status).toBe(400);
    });

    it('should return 404 for non-existent task', async () => {
      const response = await request(app)
        .patch('/tasks/invalid-id/assign')
        .send({ assignee: 'Bob' });
      expect(response.status).toBe(404);
    });
  });
});
