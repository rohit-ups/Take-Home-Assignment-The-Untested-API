const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

describe('Task API - GET /tasks', () => {
  beforeEach(() => {
    taskService._reset();
  });

  test('should return all tasks', async () => {
    taskService.create({ title: 'Task 1' });
    taskService.create({ title: 'Task 2' });

    const response = await request(app)
      .get('/tasks')
      .expect(200);

    expect(response.body).toHaveLength(2);
    expect(response.body[0].title).toBe('Task 1');
    expect(response.body[1].title).toBe('Task 2');
  });

  test('should return tasks filtered by status', async () => {
    taskService.create({
      title: 'Todo task',
      status: 'todo',
    });

    taskService.create({
      title: 'Completed task',
      status: 'done',
    });

    const response = await request(app)
      .get('/tasks?status=todo')
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0].title).toBe('Todo task');
  });

  test('should return an empty array when there are no tasks', async () => {
    const response = await request(app)
      .get('/tasks')
      .expect(200);

    expect(response.body).toEqual([]);
  });
});

describe('Task API - POST /tasks', () => {
  beforeEach(() => {
    taskService._reset();
  });

  test('should create a new task', async () => {
    const response = await request(app)
      .post('/tasks')
      .send({
        title: 'Write API tests',
        priority: 'high',
      })
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.title).toBe('Write API tests');
    expect(response.body.priority).toBe('high');
    expect(response.body.status).toBe('todo');
    expect(response.body.description).toBe('');
    expect(response.body.dueDate).toBeNull();
    expect(response.body.completedAt).toBeNull();
    expect(response.body).toHaveProperty('createdAt');
  });

  test('should reject a task without a title', async () => {
    const response = await request(app)
      .post('/tasks')
      .send({
        priority: 'high',
      })
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  test('should reject an invalid priority', async () => {
    const response = await request(app)
      .post('/tasks')
      .send({
        title: 'Invalid priority task',
        priority: 'urgent',
      })
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  test('should reject an invalid status', async () => {
    const response = await request(app)
      .post('/tasks')
      .send({
        title: 'Invalid status task',
        status: 'invalid_status',
      })
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  test('should reject an invalid due date', async () => {
    const response = await request(app)
      .post('/tasks')
      .send({
        title: 'Invalid date task',
        dueDate: 'not-a-date',
      })
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  test('should reject an empty title', async () => {
    const response = await request(app)
      .post('/tasks')
      .send({
        title: '   ',
      })
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });
});

describe('Task API - PUT /tasks/:id', () => {
  beforeEach(() => {
    taskService._reset();
  });

  test('should update an existing task', async () => {
    const task = taskService.create({
      title: 'Original title',
      priority: 'low',
    });

    const response = await request(app)
      .put(`/tasks/${task.id}`)
      .send({
        title: 'Updated title',
        priority: 'high',
      })
      .expect(200);

    expect(response.body.id).toBe(task.id);
    expect(response.body.title).toBe('Updated title');
    expect(response.body.priority).toBe('high');
  });

  test('should return 404 when updating a non-existing task', async () => {
    const response = await request(app)
      .put('/tasks/non-existing-id')
      .send({
        title: 'Updated title',
      })
      .expect(404);

    expect(response.body.error).toBe('Task not found');
  });

  test('should reject an invalid update', async () => {
    const task = taskService.create({
      title: 'Original title',
    });

    const response = await request(app)
      .put(`/tasks/${task.id}`)
      .send({
        priority: 'urgent',
      })
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  test('should reject an empty title during update', async () => {
    const task = taskService.create({
      title: 'Original title',
    });

    const response = await request(app)
      .put(`/tasks/${task.id}`)
      .send({
        title: '   ',
      })
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  test('should reject an invalid status during update', async () => {
    const task = taskService.create({
      title: 'Original title',
    });

    const response = await request(app)
      .put(`/tasks/${task.id}`)
      .send({
        status: 'invalid_status',
      })
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  test('should reject an invalid due date during update', async () => {
    const task = taskService.create({
      title: 'Original title',
    });

    const response = await request(app)
      .put(`/tasks/${task.id}`)
      .send({
        dueDate: 'not-a-date',
      })
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });
});

describe('Task API - DELETE /tasks/:id', () => {
  beforeEach(() => {
    taskService._reset();
  });

  test('should delete an existing task', async () => {
    const task = taskService.create({
      title: 'Task to delete',
    });

    await request(app)
      .delete(`/tasks/${task.id}`)
      .expect(204);

    const response = await request(app)
      .get('/tasks')
      .expect(200);

    expect(response.body).toHaveLength(0);
  });

  test('should return 404 when deleting a non-existing task', async () => {
    const response = await request(app)
      .delete('/tasks/non-existing-id')
      .expect(404);

    expect(response.body.error).toBe('Task not found');
  });
});

describe('Task API - PATCH /tasks/:id/complete', () => {
  beforeEach(() => {
    taskService._reset();
  });

  test('should mark an existing task as completed', async () => {
    const task = taskService.create({
      title: 'Complete this task',
      priority: 'high',
    });

    const response = await request(app)
      .patch(`/tasks/${task.id}/complete`)
      .expect(200);

    expect(response.body.id).toBe(task.id);
    expect(response.body.status).toBe('done');
    expect(response.body.completedAt).not.toBeNull();
  });

  test('should return 404 when completing a non-existing task', async () => {
    const response = await request(app)
      .patch('/tasks/non-existing-id/complete')
      .expect(404);

    expect(response.body.error).toBe('Task not found');
  });
});

describe('Task API - GET /tasks/stats', () => {
  beforeEach(() => {
    taskService._reset();
  });

  test('should return task counts by status and overdue count', async () => {
    taskService.create({
      title: 'Todo task',
      status: 'todo',
    });

    taskService.create({
      title: 'In progress task',
      status: 'in_progress',
    });

    taskService.create({
      title: 'Completed task',
      status: 'done',
    });

    taskService.create({
      title: 'Overdue task',
      status: 'todo',
      dueDate: '2020-01-01T00:00:00.000Z',
    });

    const response = await request(app)
      .get('/tasks/stats')
      .expect(200);

    expect(response.body.todo).toBe(2);
    expect(response.body.in_progress).toBe(1);
    expect(response.body.done).toBe(1);
    expect(response.body.overdue).toBe(1);
  });

  test('should return zero counts when there are no tasks', async () => {
    const response = await request(app)
      .get('/tasks/stats')
      .expect(200);

    expect(response.body.todo).toBe(0);
    expect(response.body.in_progress).toBe(0);
    expect(response.body.done).toBe(0);
    expect(response.body.overdue).toBe(0);
  });
});

describe('Task API - GET /tasks pagination', () => {
  beforeEach(() => {
    taskService._reset();
  });

  test('should return the first page of tasks', async () => {
    taskService.create({ title: 'Task 1' });
    taskService.create({ title: 'Task 2' });
    taskService.create({ title: 'Task 3' });
    taskService.create({ title: 'Task 4' });

    const response = await request(app)
      .get('/tasks?page=1&limit=2')
      .expect(200);

    expect(response.body).toHaveLength(2);
    expect(response.body[0].title).toBe('Task 1');
    expect(response.body[1].title).toBe('Task 2');
  });
});

describe('Task API - PATCH /tasks/:id/assign', () => {
  beforeEach(() => {
    taskService._reset();
  });

  test('should assign a task to a user', async () => {
    const task = taskService.create({
      title: 'Task to assign',
    });

    const response = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({
        assignee: 'John',
      })
      .expect(200);

    expect(response.body.id).toBe(task.id);
    expect(response.body.assignee).toBe('John');
    expect(response.body.title).toBe('Task to assign');
  });

  test('should return 404 when assigning a non-existing task', async () => {
    const response = await request(app)
      .patch('/tasks/non-existing-id/assign')
      .send({
        assignee: 'John',
      })
      .expect(404);

    expect(response.body.error).toBe('Task not found');
  });

  test('should reject an empty assignee', async () => {
    const task = taskService.create({
      title: 'Task to assign',
    });

    const response = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({
        assignee: '',
      })
      .expect(400);

    expect(response.body.error).toBe(
      'assignee must be a non-empty string'
    );
  });

  test('should reject an assignee containing only spaces', async () => {
    const task = taskService.create({
      title: 'Task to assign',
    });

    const response = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({
        assignee: '   ',
      })
      .expect(400);

    expect(response.body.error).toBe(
      'assignee must be a non-empty string'
    );
  });

  test('should trim whitespace from the assignee name', async () => {
    const task = taskService.create({
      title: 'Task to assign',
    });

    const response = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({
        assignee: '  John  ',
      })
      .expect(200);

    expect(response.body.assignee).toBe('John');
  });

  test('should allow reassignment of an already assigned task', async () => {
    const task = taskService.create({
      title: 'Assigned task',
    });

    await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({
        assignee: 'John',
      })
      .expect(200);

    const response = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({
        assignee: 'Sarah',
      })
      .expect(200);

    expect(response.body.assignee).toBe('Sarah');
  });
});