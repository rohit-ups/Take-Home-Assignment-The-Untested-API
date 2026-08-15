const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

beforeEach(() => {
  taskService._reset();
});

describe('Task API', () => {
  describe('GET /tasks', () => {
    test('returns an empty array when there are no tasks', async () => {
      const response = await request(app).get('/tasks');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    test('returns all tasks', async () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });

      const response = await request(app).get('/tasks');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].title).toBe('Task 1');
      expect(response.body[1].title).toBe('Task 2');
    });

    test('filters tasks by status', async () => {
      taskService.create({
        title: 'Todo task',
        status: 'todo',
      });

      taskService.create({
        title: 'Done task',
        status: 'done',
      });

      const response = await request(app)
        .get('/tasks?status=todo');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].title).toBe('Todo task');
      expect(response.body[0].status).toBe('todo');
    });

    test('supports pagination', async () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });
      taskService.create({ title: 'Task 3' });
      taskService.create({ title: 'Task 4' });

      const response = await request(app)
        .get('/tasks?page=1&limit=2');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].title).toBe('Task 1');
      expect(response.body[1].title).toBe('Task 2');
    });
  });

  describe('POST /tasks', () => {
    test('creates a task successfully', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({
          title: 'Learn Supertest',
          description: 'Write API tests',
          status: 'todo',
          priority: 'high',
        });

      expect(response.status).toBe(201);
      expect(response.body.title).toBe('Learn Supertest');
      expect(response.body.description).toBe('Write API tests');
      expect(response.body.status).toBe('todo');
      expect(response.body.priority).toBe('high');
      expect(response.body.id).toBeDefined();
      expect(response.body.createdAt).toBeDefined();
      expect(response.body.completedAt).toBeNull();
    });

    test('creates a task using default values', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({
          title: 'Task with defaults',
        });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('todo');
      expect(response.body.priority).toBe('medium');
      expect(response.body.description).toBe('');
      expect(response.body.dueDate).toBeNull();
      expect(response.body.completedAt).toBeNull();
    });

    test('returns 400 when title is missing', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({
          description: 'Task without title',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe(
        'title is required and must be a non-empty string'
      );
    });

    test('returns 400 when title is empty', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({
          title: '   ',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe(
        'title is required and must be a non-empty string'
      );
    });

    test('returns 400 when status is invalid', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({
          title: 'Invalid status',
          status: 'invalid',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe(
        'status must be one of: todo, in_progress, done'
      );
    });

    test('returns 400 when priority is invalid', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({
          title: 'Invalid priority',
          priority: 'urgent',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe(
        'priority must be one of: low, medium, high'
      );
    });
  });

  describe('PUT /tasks/:id', () => {
    test('updates an existing task', async () => {
      const task = taskService.create({
        title: 'Original title',
        description: 'Original description',
        priority: 'low',
      });

      const response = await request(app)
        .put(`/tasks/${task.id}`)
        .send({
          title: 'Updated title',
        });

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(task.id);
      expect(response.body.title).toBe('Updated title');
      expect(response.body.description).toBe('Original description');
      expect(response.body.priority).toBe('low');
    });

    test('updates multiple fields', async () => {
      const task = taskService.create({
        title: 'Original',
        description: 'Old description',
        status: 'todo',
        priority: 'low',
      });

      const response = await request(app)
        .put(`/tasks/${task.id}`)
        .send({
          title: 'Updated',
          description: 'New description',
          status: 'in_progress',
          priority: 'high',
        });

      expect(response.status).toBe(200);
      expect(response.body.title).toBe('Updated');
      expect(response.body.description).toBe('New description');
      expect(response.body.status).toBe('in_progress');
      expect(response.body.priority).toBe('high');
    });

    test('returns 404 when task does not exist', async () => {
      const response = await request(app)
        .put('/tasks/non-existent-id')
        .send({
          title: 'Updated title',
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Task not found');
    });

    test('returns 400 when title is empty', async () => {
      const task = taskService.create({
        title: 'Original title',
      });

      const response = await request(app)
        .put(`/tasks/${task.id}`)
        .send({
          title: '   ',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe(
        'title must be a non-empty string'
      );
    });

    test('returns 400 when status is invalid', async () => {
      const task = taskService.create({
        title: 'Original title',
      });

      const response = await request(app)
        .put(`/tasks/${task.id}`)
        .send({
          status: 'invalid',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe(
        'status must be one of: todo, in_progress, done'
      );
    });

    test('returns 400 when priority is invalid', async () => {
      const task = taskService.create({
        title: 'Original title',
      });

      const response = await request(app)
        .put(`/tasks/${task.id}`)
        .send({
          priority: 'urgent',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe(
        'priority must be one of: low, medium, high'
      );
    });
  });

  describe('DELETE /tasks/:id', () => {
    test('deletes an existing task', async () => {
      const task = taskService.create({
        title: 'Delete me',
      });

      const response = await request(app)
        .delete(`/tasks/${task.id}`);

      expect(response.status).toBe(204);
    });

    test('actually removes the task', async () => {
      const task = taskService.create({
        title: 'Delete me',
      });

      await request(app)
        .delete(`/tasks/${task.id}`);

      const response = await request(app)
        .get('/tasks');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    test('returns 404 when task does not exist', async () => {
      const response = await request(app)
        .delete('/tasks/non-existent-id');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Task not found');
    });
  });

  describe('PATCH /tasks/:id/complete', () => {
    test('marks a task as completed', async () => {
      const task = taskService.create({
        title: 'Complete me',
        status: 'todo',
        priority: 'high',
      });

      const response = await request(app)
        .patch(`/tasks/${task.id}/complete`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(task.id);
      expect(response.body.status).toBe('done');
      expect(response.body.completedAt).toBeDefined();
      expect(typeof response.body.completedAt).toBe('string');
    });

    test('preserves priority when completing a task', async () => {
      const task = taskService.create({
        title: 'High priority task',
        priority: 'high',
      });

      const response = await request(app)
        .patch(`/tasks/${task.id}/complete`);

      expect(response.status).toBe(200);
      expect(response.body.priority).toBe('high');
    });

    test('returns 404 when task does not exist', async () => {
      const response = await request(app)
        .patch('/tasks/non-existent-id/complete');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Task not found');
    });
  });

  describe('PATCH /tasks/:id/assign', () => {
    test('assigns a task successfully', async () => {
      const task = taskService.create({
        title: 'Assign this task',
      });

      const response = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({
          assignee: 'Kashish',
        });

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(task.id);
      expect(response.body.title).toBe('Assign this task');
      expect(response.body.assignee).toBe('Kashish');
    });

    test('trims whitespace from assignee name', async () => {
      const task = taskService.create({
        title: 'Assign this task',
      });

      const response = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({
          assignee: '  Kashish  ',
        });

      expect(response.status).toBe(200);
      expect(response.body.assignee).toBe('Kashish');
    });

    test('returns 404 when task does not exist', async () => {
      const response = await request(app)
        .patch('/tasks/non-existent-id/assign')
        .send({
          assignee: 'Kashish',
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Task not found');
    });

    test('returns 400 when assignee is missing', async () => {
      const task = taskService.create({
        title: 'Assign this task',
      });

      const response = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe(
        'assignee is required and must be a non-empty string'
      );
    });

    test('returns 400 when assignee is an empty string', async () => {
      const task = taskService.create({
        title: 'Assign this task',
      });

      const response = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({
          assignee: '',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe(
        'assignee is required and must be a non-empty string'
      );
    });

    test('returns 400 when assignee contains only spaces', async () => {
      const task = taskService.create({
        title: 'Assign this task',
      });

      const response = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({
          assignee: '   ',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe(
        'assignee is required and must be a non-empty string'
      );
    });

    test('returns 400 when assignee is not a string', async () => {
      const task = taskService.create({
        title: 'Assign this task',
      });

      const response = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({
          assignee: 123,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe(
        'assignee is required and must be a non-empty string'
      );
    });

    test('allows reassigning an already assigned task', async () => {
      const task = taskService.create({
        title: 'Reassign this task',
      });

      await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({
          assignee: 'First User',
        });

      const response = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({
          assignee: 'Second User',
        });

      expect(response.status).toBe(200);
      expect(response.body.assignee).toBe('Second User');
    });
  });

  describe('GET /tasks/stats', () => {
    test('returns zero counts when there are no tasks', async () => {
      const response = await request(app)
        .get('/tasks/stats');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        todo: 0,
        in_progress: 0,
        done: 0,
        overdue: 0,
      });
    });

    test('returns correct counts by status', async () => {
      taskService.create({
        title: 'Todo 1',
        status: 'todo',
      });

      taskService.create({
        title: 'Todo 2',
        status: 'todo',
      });

      taskService.create({
        title: 'In progress',
        status: 'in_progress',
      });

      taskService.create({
        title: 'Done',
        status: 'done',
      });

      const response = await request(app)
        .get('/tasks/stats');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        todo: 2,
        in_progress: 1,
        done: 1,
        overdue: 0,
      });
    });

    test('returns the overdue task count', async () => {
      taskService.create({
        title: 'Overdue task',
        status: 'todo',
        dueDate: '2020-01-01T00:00:00.000Z',
      });

      const response = await request(app)
        .get('/tasks/stats');

      expect(response.status).toBe(200);
      expect(response.body.overdue).toBe(1);
    });
  });
});