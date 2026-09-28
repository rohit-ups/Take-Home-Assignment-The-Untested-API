const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

describe('API Integration Tests', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('GET /tasks', () => {
    it('should return empty array when no tasks exist', async () => {
      const response = await request(app).get('/tasks');
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should return all tasks', async () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });
      
      const response = await request(app).get('/tasks');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
    });

    it('should filter tasks by status', async () => {
      taskService.create({ title: 'Task 1', status: 'todo' });
      taskService.create({ title: 'Task 2', status: 'in_progress' });
      taskService.create({ title: 'Task 3', status: 'todo' });
      
      const response = await request(app).get('/tasks?status=todo');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
    });

    it('should return paginated tasks with page and limit', async () => {
      for (let i = 1; i <= 15; i++) {
        taskService.create({ title: `Task ${i}` });
      }
      
      const response = await request(app).get('/tasks?page=1&limit=5');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(5);
      expect(response.body[0].title).toBe('Task 1');
    });

    it('should return paginated tasks with only page', async () => {
      for (let i = 1; i <= 15; i++) {
        taskService.create({ title: `Task ${i}` });
      }
      
      const response = await request(app).get('/tasks?page=1');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(10);
    });

    it('should return paginated tasks with only limit', async () => {
      for (let i = 1; i <= 15; i++) {
        taskService.create({ title: `Task ${i}` });
      }
      
      const response = await request(app).get('/tasks?limit=3');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(3);
    });

    it('should handle invalid page number gracefully', async () => {
      for (let i = 1; i <= 5; i++) {
        taskService.create({ title: `Task ${i}` });
      }
      
      const response = await request(app).get('/tasks?page=invalid&limit=5');
      
      expect(response.status).toBe(200);
    });

    it('should return all tasks when no query params provided', async () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });
      
      const response = await request(app).get('/tasks');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
    });
  });

  describe('POST /tasks', () => {
    it('should create a new task with valid data', async () => {
      const taskData = {
        title: 'New Task',
        description: 'Task description',
        status: 'todo',
        priority: 'high'
      };
      
      const response = await request(app)
        .post('/tasks')
        .send(taskData);
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe('New Task');
      expect(response.body.description).toBe('Task description');
      expect(response.body.status).toBe('todo');
      expect(response.body.priority).toBe('high');
    });

    it('should create task with only required title', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({ title: 'Minimal Task' });
      
      expect(response.status).toBe(201);
      expect(response.body.title).toBe('Minimal Task');
      expect(response.body.description).toBe('');
      expect(response.body.status).toBe('todo');
      expect(response.body.priority).toBe('medium');
    });

    it('should return 400 when title is missing', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({ description: 'No title' });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 when title is empty string', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({ title: '   ' });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 when title is not a string', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({ title: 123 });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 when status is invalid', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({ title: 'Task', status: 'invalid_status' });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 when priority is invalid', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({ title: 'Task', priority: 'invalid_priority' });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 when dueDate is invalid', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({ title: 'Task', dueDate: 'not-a-date' });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should accept valid ISO date for dueDate', async () => {
      const dueDate = new Date().toISOString();
      const response = await request(app)
        .post('/tasks')
        .send({ title: 'Task', dueDate });
      
      expect(response.status).toBe(201);
      expect(response.body.dueDate).toBe(dueDate);
    });
  });

  describe('PUT /tasks/:id', () => {
    it('should update an existing task', async () => {
      const task = taskService.create({ title: 'Original' });
      
      const response = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ title: 'Updated' });
      
      expect(response.status).toBe(200);
      expect(response.body.title).toBe('Updated');
      expect(response.body.id).toBe(task.id);
    });

    it('should update multiple fields', async () => {
      const task = taskService.create({ title: 'Original' });
      
      const response = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ 
          title: 'Updated',
          status: 'done',
          priority: 'low'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.title).toBe('Updated');
      expect(response.body.status).toBe('done');
      expect(response.body.priority).toBe('low');
    });

    it('should return 404 when task does not exist', async () => {
      const response = await request(app)
        .put('/tasks/non-existent-id')
        .send({ title: 'Updated' });
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 when title is empty string', async () => {
      const task = taskService.create({ title: 'Original' });
      
      const response = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ title: '   ' });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 when status is invalid', async () => {
      const task = taskService.create({ title: 'Original' });
      
      const response = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ status: 'invalid' });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 when priority is invalid', async () => {
      const task = taskService.create({ title: 'Original' });
      
      const response = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ priority: 'invalid' });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 when dueDate is invalid', async () => {
      const task = taskService.create({ title: 'Original' });
      
      const response = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ dueDate: 'invalid-date' });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should allow partial updates', async () => {
      const task = taskService.create({ 
        title: 'Original',
        description: 'Original description'
      });
      
      const response = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ title: 'Updated title only' });
      
      expect(response.status).toBe(200);
      expect(response.body.title).toBe('Updated title only');
      expect(response.body.description).toBe('Original description');
    });
  });

  describe('DELETE /tasks/:id', () => {
    it('should delete an existing task', async () => {
      const task = taskService.create({ title: 'To delete' });
      
      const response = await request(app).delete(`/tasks/${task.id}`);
      
      expect(response.status).toBe(204);
      expect(response.body).toEqual({});
    });

    it('should return 404 when task does not exist', async () => {
      const response = await request(app).delete('/tasks/non-existent-id');
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should actually remove the task', async () => {
      const task = taskService.create({ title: 'To delete' });
      
      await request(app).delete(`/tasks/${task.id}`);
      
      const found = taskService.findById(task.id);
      expect(found).toBeUndefined();
    });
  });

  describe('PATCH /tasks/:id/complete', () => {
    it('should mark a task as complete', async () => {
      const task = taskService.create({ title: 'Task', status: 'todo' });
      
      const response = await request(app).patch(`/tasks/${task.id}/complete`);
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('done');
      expect(response.body.completedAt).toBeTruthy();
    });

    it('should return 404 when task does not exist', async () => {
      const response = await request(app).patch('/tasks/non-existent-id/complete');
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should set priority to medium when completing', async () => {
      const task = taskService.create({ title: 'Task', priority: 'high' });
      
      const response = await request(app).patch(`/tasks/${task.id}/complete`);
      
      expect(response.status).toBe(200);
      expect(response.body.priority).toBe('medium');
    });

    it('should set completedAt timestamp', async () => {
      const task = taskService.create({ title: 'Task' });
      
      const response = await request(app).patch(`/tasks/${task.id}/complete`);
      
      expect(response.status).toBe(200);
      expect(() => new Date(response.body.completedAt)).not.toThrow();
    });

    it('should preserve other fields', async () => {
      const task = taskService.create({ 
        title: 'Task',
        description: 'Description',
        dueDate: new Date().toISOString()
      });
      
      const response = await request(app).patch(`/tasks/${task.id}/complete`);
      
      expect(response.body.title).toBe('Task');
      expect(response.body.description).toBe('Description');
      expect(response.body.dueDate).toBeTruthy();
    });
  });

  describe('PATCH /tasks/:id/assign', () => {
    it('should assign a task to a person', async () => {
      const task = taskService.create({ title: 'Task' });
      
      const response = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 'John Doe' });
      
      expect(response.status).toBe(200);
      expect(response.body.assignee).toBe('John Doe');
    });

    it('should return 404 when task does not exist', async () => {
      const response = await request(app)
        .patch('/tasks/non-existent-id/assign')
        .send({ assignee: 'John Doe' });
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 when assignee is missing', async () => {
      const task = taskService.create({ title: 'Task' });
      
      const response = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({});
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 when assignee is empty string', async () => {
      const task = taskService.create({ title: 'Task' });
      
      const response = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: '   ' });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 when assignee is not a string', async () => {
      const task = taskService.create({ title: 'Task' });
      
      const response = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 123 });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should preserve other fields when assigning', async () => {
      const task = taskService.create({ 
        title: 'Task',
        description: 'Description',
        status: 'in_progress',
        priority: 'high'
      });
      
      const response = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 'Jane Smith' });
      
      expect(response.status).toBe(200);
      expect(response.body.title).toBe('Task');
      expect(response.body.description).toBe('Description');
      expect(response.body.status).toBe('in_progress');
      expect(response.body.priority).toBe('high');
    });

    it('should allow reassigning a task', async () => {
      const task = taskService.create({ title: 'Task' });
      
      await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 'John Doe' });
      
      const response = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 'Jane Smith' });
      
      expect(response.status).toBe(200);
      expect(response.body.assignee).toBe('Jane Smith');
    });

    it('should handle assignee with spaces', async () => {
      const task = taskService.create({ title: 'Task' });
      
      const response = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 'John Doe Jr.' });
      
      expect(response.status).toBe(200);
      expect(response.body.assignee).toBe('John Doe Jr.');
    });
  });

  describe('GET /tasks/stats', () => {
    it('should return zero counts when no tasks exist', async () => {
      const response = await request(app).get('/tasks/stats');
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        todo: 0,
        in_progress: 0,
        done: 0,
        overdue: 0
      });
    });

    it('should return correct counts for tasks', async () => {
      taskService.create({ title: 'Task 1', status: 'todo' });
      taskService.create({ title: 'Task 2', status: 'todo' });
      taskService.create({ title: 'Task 3', status: 'in_progress' });
      taskService.create({ title: 'Task 4', status: 'done' });
      
      const response = await request(app).get('/tasks/stats');
      
      expect(response.status).toBe(200);
      expect(response.body.todo).toBe(2);
      expect(response.body.in_progress).toBe(1);
      expect(response.body.done).toBe(1);
    });

    it('should count overdue tasks correctly', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);
      
      taskService.create({ 
        title: 'Overdue task',
        status: 'todo',
        dueDate: pastDate.toISOString()
      });
      
      const response = await request(app).get('/tasks/stats');
      
      expect(response.status).toBe(200);
      expect(response.body.overdue).toBe(1);
    });

    it('should not count done tasks as overdue', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);
      
      taskService.create({ 
        title: 'Done task',
        status: 'done',
        dueDate: pastDate.toISOString()
      });
      
      const response = await request(app).get('/tasks/stats');
      
      expect(response.status).toBe(200);
      expect(response.body.overdue).toBe(0);
    });
  });
});
