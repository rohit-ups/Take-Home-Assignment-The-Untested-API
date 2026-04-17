const request = require('supertest');
const app = require('../../src/app');
const taskService = require('../../src/services/taskService');

describe('Tasks API Integration Tests', () => {
  beforeEach(() => {
    // Reset data before each test to ensure test isolation
    taskService._reset();
  });

  describe('GET /tasks', () => {
    it('should return 200 and an empty array initially', async () => {
      const res = await request(app).get('/tasks');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('should return 200 and an array of tasks when data exists', async () => {
      taskService.create({ title: 'Task 1' });
      const res = await request(app).get('/tasks');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].title).toBe('Task 1');
    });

    it('should filter tasks by status with GET /tasks?status=todo', async () => {
      taskService.create({ title: 'T1', status: 'todo' });
      taskService.create({ title: 'T2', status: 'done' });

      const res = await request(app).get('/tasks?status=todo');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].status).toBe('todo');
    });

    it('should paginate tasks with GET /tasks?page=1&limit=1', async () => {
      taskService.create({ title: 'T1' });
      taskService.create({ title: 'T2' });

      // Correct expectation: page=1 should return the first item T1
      const res = await request(app).get('/tasks?page=1&limit=1');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].title).toBe('T1');
    });
  });

  describe('GET /tasks/stats', () => {
    it('should return statistics of tasks', async () => {
      taskService.create({ title: 'T1', status: 'todo' });
      taskService.create({ title: 'T2', status: 'done' });
      
      const res = await request(app).get('/tasks/stats');
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        todo: 1,
        in_progress: 0,
        done: 1,
        overdue: 0
      });
    });
  });

  describe('POST /tasks', () => {
    it('should create a new task successfully', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'New API Task' });
      
      expect(res.status).toBe(201);
      expect(res.body.title).toBe('New API Task');
      expect(res.body.id).toBeDefined();
    });

    it('should fail with 400 when validation fails (missing title)', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ description: 'No title' });
      
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });
  });

  describe('PUT /tasks/:id', () => {
    it('should update an existing task successfully', async () => {
      const task = taskService.create({ title: 'Initial Title' });
      const res = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ title: 'Updated Title', status: 'in_progress' });
      
      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Updated Title');
      expect(res.body.status).toBe('in_progress');
    });

    it('should fail with 400 on validation error', async () => {
      const task = taskService.create({ title: 'Initial Title' });
      const res = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ status: 'invalid_status' });
      
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('status must be one of');
    });

    it('should return 404 when updating non-existent task', async () => {
      const res = await request(app)
        .put('/tasks/invalid-id')
        .send({ title: 'Updated Title' });
      
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });
  });

  describe('DELETE /tasks/:id', () => {
    it('should successfully delete an existing task', async () => {
      const task = taskService.create({ title: 'To Delete' });
      const res = await request(app).delete(`/tasks/${task.id}`);
      
      expect(res.status).toBe(204);
      // Verify deletion
      expect(taskService.findById(task.id)).toBeUndefined();
    });

    it('should return 404 when deleting a non-existent task', async () => {
      const res = await request(app).delete('/tasks/invalid-id');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });
  });

  describe('PATCH /tasks/:id/complete', () => {
    it('should mark a task as complete successfully', async () => {
      const task = taskService.create({ title: 'Complete Me' });
      const res = await request(app).patch(`/tasks/${task.id}/complete`);
      
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('done');
      expect(res.body.completedAt).not.toBeNull();
    });

    it('should return 404 when completing a non-existent task', async () => {
      const res = await request(app).patch('/tasks/invalid-id/complete');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });
  });

  describe('PATCH /tasks/:id/assign', () => {
    it('should assign a task successfully', async () => {
      const task = taskService.create({ title: 'Assign Me' });
      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 'Jane Smith' });
      
      expect(res.status).toBe(200);
      expect(res.body.assignee).toBe('Jane Smith');
    });

    it('should return 404 when assigning a non-existent task', async () => {
      const res = await request(app)
        .patch('/tasks/invalid-id/assign')
        .send({ assignee: 'Jane Smith' });
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });

    it('should return 400 when assignee is empty or missing', async () => {
      const task = taskService.create({ title: 'Assign Me' });
      const res1 = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: '' });
      expect(res1.status).toBe(400);

      const res2 = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({});
      expect(res2.status).toBe(400);
    });

    it('should successfully reassign an existing task', async () => {
      const task = taskService.create({ title: 'Assign Me' });
      taskService.assignTask(task.id, 'Original Assignee');
      
      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 'New Assignee' });
      
      expect(res.status).toBe(200);
      expect(res.body.assignee).toBe('New Assignee');
    });
  });
});
