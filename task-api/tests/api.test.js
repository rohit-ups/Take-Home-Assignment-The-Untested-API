const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

// Reset the in-memory store before each test
beforeEach(() => {
  taskService._reset();
});

// Helper: quickly create a task via the API
const createTask = (overrides = {}) =>
  request(app)
    .post('/tasks')
    .send({ title: 'Test Task', ...overrides });


// POST /tasks — Create a task

describe('POST /tasks', () => {
  it('should create a task with valid data and return 201', async () => {
    const res = await createTask({ title: 'New Task', priority: 'high' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      title: 'New Task',
      priority: 'high',
      status: 'todo',
      completedAt: null,
    });
    expect(res.body.id).toBeDefined();
    expect(res.body.createdAt).toBeDefined();
  });

  it('should create a task with only a title (defaults applied)', async () => {
    const res = await createTask({ title: 'Minimal' });

    expect(res.status).toBe(201);
    expect(res.body.description).toBe('');
    expect(res.body.status).toBe('todo');
    expect(res.body.priority).toBe('medium');
    expect(res.body.dueDate).toBeNull();
  });

  // Edge case: missing title
  it('should return 400 when title is missing', async () => {
    const res = await request(app).post('/tasks').send({ description: 'no title' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  // Edge case: empty title
  it('should return 400 when title is an empty string', async () => {
    const res = await createTask({ title: '' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  // Edge case: whitespace-only title
  it('should return 400 when title is only whitespace', async () => {
    const res = await createTask({ title: '   ' });
    expect(res.status).toBe(400);
  });

  // Edge case: invalid status
  it('should return 400 for invalid status value', async () => {
    const res = await createTask({ title: 'Bad Status', status: 'invalid' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('status');
  });

  // Edge case: invalid priority
  it('should return 400 for invalid priority value', async () => {
    const res = await createTask({ title: 'Bad Priority', priority: 'urgent' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('priority');
  });

  // Edge case: invalid dueDate
  it('should return 400 for an invalid dueDate', async () => {
    const res = await createTask({ title: 'Bad Date', dueDate: 'not-a-date' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('dueDate');
  });

  it('should accept a valid dueDate', async () => {
    const res = await createTask({
      title: 'With Date',
      dueDate: '2026-12-25T00:00:00.000Z',
    });
    expect(res.status).toBe(201);
    expect(res.body.dueDate).toBe('2026-12-25T00:00:00.000Z');
  });
});

// GET /tasks — List tasks
describe('GET /tasks', () => {
  it('should return an empty array when no tasks exist', async () => {
    const res = await request(app).get('/tasks');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('should return all tasks', async () => {
    await createTask({ title: 'Task 1' });
    await createTask({ title: 'Task 2' });

    const res = await request(app).get('/tasks');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });
});

// GET /tasks?status= — Filter by status
describe('GET /tasks?status=', () => {
  it('should filter tasks by status', async () => {
    await createTask({ title: 'Todo', status: 'todo' });
    await createTask({ title: 'Done', status: 'done' });

    const res = await request(app).get('/tasks?status=todo');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Todo');
  });

  it('should return empty array when no tasks match the status', async () => {
    await createTask({ title: 'Todo', status: 'todo' });
    const res = await request(app).get('/tasks?status=in_progress');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  // Edge case — partial status match via includes()
  it('should not partially match status values', () => {
  taskService.create({ title: 'Completed', status: 'done' });

  const result = taskService.getByStatus('do');
  expect(result).toHaveLength(0);
});
});

// GET /tasks?page=&limit= — Pagination
describe('GET /tasks?page=&limit=', () => {
  beforeEach(async () => {
    for (let i = 1; i <= 12; i++) {
      await createTask({ title: `Task ${i}` });
    }
  });

  it('should return the first 5 items for page 1', async () => {
    const res = await request(app).get('/tasks?page=1&limit=5');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(5);
    expect(res.body[0].title).toBe('Task 1');
    expect(res.body[4].title).toBe('Task 5');
  });

  it('should use default limit of 10 when not specified', async () => {
    const res = await request(app).get('/tasks?page=1');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(10);
  });

  it('should return empty array for a page beyond available data', async () => {
    const res = await request(app).get('/tasks?page=999&limit=5');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

// PUT /tasks/:id — Update a task

describe('PUT /tasks/:id', () => {
  it('should update a task and return 200', async () => {
    const createRes = await createTask({ title: 'Original' });
    const id = createRes.body.id;

    const res = await request(app)
      .put(`/tasks/${id}`)
      .send({ title: 'Updated Title', priority: 'high' });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated Title');
    expect(res.body.priority).toBe('high');
    expect(res.body.id).toBe(id);
  });

  it('should return 404 when task does not exist', async () => {
    const res = await request(app)
      .put('/tasks/nonexistent-id')
      .send({ title: 'Ghost' });

    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });

  // Edge case: empty title
  it('should return 400 when title is set to empty string', async () => {
    const createRes = await createTask({ title: 'Valid' });
    const res = await request(app)
      .put(`/tasks/${createRes.body.id}`)
      .send({ title: '' });

    expect(res.status).toBe(400);
  });

  // Edge case: invalid status
  it('should return 400 for invalid status on update', async () => {
    const createRes = await createTask({ title: 'Valid' });
    const res = await request(app)
      .put(`/tasks/${createRes.body.id}`)
      .send({ status: 'invalid_status' });

    expect(res.status).toBe(400);
  });

  // Edge case: invalid priority on update
  it('should return 400 for invalid priority on update', async () => {
    const createRes = await createTask({ title: 'Valid' });
    const res = await request(app)
      .put(`/tasks/${createRes.body.id}`)
      .send({ priority: 'critical' });

    expect(res.status).toBe(400);
  });

  it('should allow partial updates (only update one field)', async () => {
    const createRes = await createTask({ title: 'Original', priority: 'low' });
    const id = createRes.body.id;

    const res = await request(app)
      .put(`/tasks/${id}`)
      .send({ priority: 'high' });

    expect(res.status).toBe(200);
    expect(res.body.priority).toBe('high');
    expect(res.body.title).toBe('Original'); 
  });
});

// DELETE /tasks/:id — Delete a task
describe('DELETE /tasks/:id', () => {
  it('should delete a task and return 204', async () => {
    const createRes = await createTask({ title: 'Delete Me' });
    const id = createRes.body.id;

    const res = await request(app).delete(`/tasks/${id}`);
    expect(res.status).toBe(204);

    // verify its gone
    const getRes = await request(app).get('/tasks');
    expect(getRes.body).toHaveLength(0);
  });

  it('should return 404 when task does not exist', async () => {
    const res = await request(app).delete('/tasks/nonexistent-id');
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });

  // edge case- double delete
  it('should return 404 on second delete of the same task', async () => {
    const createRes = await createTask({ title: 'Delete Twice' });
    const id = createRes.body.id;

    await request(app).delete(`/tasks/${id}`);
    const res = await request(app).delete(`/tasks/${id}`);

    expect(res.status).toBe(404);
  });
});

// mark as complete

describe('PATCH /tasks/:id/complete', () => {
  it('should mark a task as done and set completedAt', async () => {
    const createRes = await createTask({ title: 'Complete Me' });
    const id = createRes.body.id;

    const res = await request(app).patch(`/tasks/${id}/complete`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('done');
    expect(res.body.completedAt).toBeDefined();
  });

  it('should return 404 when task does not exist', async () => {
    const res = await request(app).patch('/tasks/nonexistent-id/complete');
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });

 it('should preserve priority when completing task', () => {
  const task = taskService.create({
    title:'Urgent',
    priority:'high'
  });

  const completed = taskService.completeTask(task.id);
  expect(completed.priority).toBe('high');
});

  // Edge case: complete an already completed task
  it('should allow completing an already-done task (idempotent)', async () => {
    const createRes = await createTask({ title: 'Already Done', status: 'done' });
    const id = createRes.body.id;

    const res = await request(app).patch(`/tasks/${id}/complete`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('done');
  });

  it('should not change completedAt when completing already completed task', async()=>{
    const createRes = await createTask({
      title:'Done',
      status:'done'
    });

    const first = await request(app)
    .patch(`/tasks/${createRes.body.id}/complete`);

    const second = await request(app)
    .patch(`/tasks/${createRes.body.id}/complete`);

    expect(second.body.completedAt)
    .toBe(first.body.completedAt);
  });
});

// PATCH /tasks/:id/assign — Assign a task
describe('PATCH /tasks/:id/assign', () => {
  it('should assign a person to a task and return 200', async () => {
    const createRes = await createTask({ title: 'Assign Me' });
    const id = createRes.body.id;

    const res = await request(app)
      .patch(`/tasks/${id}/assign`)
      .send({ assignee: 'Alice' });

    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Alice');
    expect(res.body.id).toBe(id);
    expect(res.body.title).toBe('Assign Me');
  });

  it('should return 404 when task does not exist', async () => {
    const res = await request(app)
      .patch('/tasks/nonexistent-id/assign')
      .send({ assignee: 'Bob' });

    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });

  // Edge case: missing assignee field
  it('should return 400 when assignee field is missing', async () => {
    const createRes = await createTask({ title: 'No Assignee' });
    const res = await request(app)
      .patch(`/tasks/${createRes.body.id}/assign`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('assignee');
  });

  // Edge case: empty string assignee
  it('should return 400 when assignee is an empty string', async () => {
    const createRes = await createTask({ title: 'Empty Assignee' });
    const res = await request(app)
      .patch(`/tasks/${createRes.body.id}/assign`)
      .send({ assignee: '' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('assignee');
  });

  // Edge case: whitespace-only assignee
  it('should return 400 when assignee is only whitespace', async () => {
    const createRes = await createTask({ title: 'Whitespace' });
    const res = await request(app)
      .patch(`/tasks/${createRes.body.id}/assign`)
      .send({ assignee: '   ' });

    expect(res.status).toBe(400);
  });

  // Edge case: non-string assignee
  it('should return 400 when assignee is not a string', async () => {
    const createRes = await createTask({ title: 'Number' });
    const res = await request(app)
      .patch(`/tasks/${createRes.body.id}/assign`)
      .send({ assignee: 123 });

    expect(res.status).toBe(400);
  });

  // Edge case: reassignment (task already assigned)
  it('should allow reassigning a task to a different person', async () => {
    const createRes = await createTask({ title: 'Reassign' });
    const id = createRes.body.id;

    await request(app).patch(`/tasks/${id}/assign`).send({ assignee: 'Alice' });
    const res = await request(app).patch(`/tasks/${id}/assign`).send({ assignee: 'Bob' });

    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Bob');
  });

  // Edge case: assignee with leading/trailing whitespace should be trimmed
  it('should trim whitespace from assignee name', async () => {
    const createRes = await createTask({ title: 'Trim Test' });
    const res = await request(app)
      .patch(`/tasks/${createRes.body.id}/assign`)
      .send({ assignee: '  Alice  ' });

    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Alice');
  });

  // Verify new tasks start with assignee: null
  it('should show assignee as null on newly created tasks', async () => {
    const res = await createTask({ title: 'Fresh Task' });
    expect(res.body.assignee).toBeNull();
  });
});

// GET /tasks/stats — Stats endpoint
describe('GET /tasks/stats', () => {
  it('should return zero counts when no tasks exist', async () => {
    const res = await request(app).get('/tasks/stats');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ todo: 0, in_progress: 0, done: 0, overdue: 0 });
  });

  it('should return correct counts by status', async () => {
    await createTask({ title: 'A', status: 'todo' });
    await createTask({ title: 'B', status: 'todo' });
    await createTask({ title: 'C', status: 'in_progress' });
    await createTask({ title: 'D', status: 'done' });

    const res = await request(app).get('/tasks/stats');
    expect(res.status).toBe(200);
    expect(res.body.todo).toBe(2);
    expect(res.body.in_progress).toBe(1);
    expect(res.body.done).toBe(1);
  });

  it('should count overdue tasks correctly', async () => {
    // Overdue: past due date + not done
    await createTask({
      title: 'Overdue',
      status: 'todo',
      dueDate: '2020-01-01T00:00:00.000Z',
    });
    // Not overdue: past due date but done
    await createTask({
      title: 'Done Past',
      status: 'done',
      dueDate: '2020-01-01T00:00:00.000Z',
    });
    // Not overdue: future due date
    await createTask({
      title: 'Future',
      status: 'todo',
      dueDate: '2099-12-31T00:00:00.000Z',
    });

    const res = await request(app).get('/tasks/stats');
    expect(res.body.overdue).toBe(1);
  });

  // Edge case: tasks with no dueDate are never overdue
  it('should not count tasks without dueDate as overdue', async () => {
    await createTask({ title: 'No Date', status: 'todo' });
    const res = await request(app).get('/tasks/stats');
    expect(res.body.overdue).toBe(0);
  });
});

// Edge case: Unknown routes
describe('Unknown routes', () => {
  it('should return 404 for an unknown path', async () => {
    const res = await request(app).get('/unknown-path');
    expect(res.status).toBe(404);
  });
});
