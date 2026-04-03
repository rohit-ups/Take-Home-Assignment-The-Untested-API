const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

describe("Task Routes", () => {

  beforeEach(() => {
    taskService._reset();
  });

  it("should create a task", async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: "New Task" });

    expect(res.statusCode).toBe(201);
    expect(res.body.title).toBe("New Task");
  });

  it("should return all tasks", async () => {
    await request(app).post('/tasks').send({ title: "Task 1" });
    await request(app).post('/tasks').send({ title: "Task 2" });

    const res = await request(app).get('/tasks');

    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(2);
  });

  it("should return paginated tasks", async () => {
    await request(app).post('/tasks').send({ title: "Task 1" });

    const res = await request(app).get('/tasks?page=1&limit=10');

    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(1);
  });

  it("should filter tasks by status", async () => {
    await request(app).post('/tasks').send({ title: "Task 1", status: "todo" });

    const res = await request(app).get('/tasks?status=todo');

    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(1);
  });

  it("should delete a task", async () => {
    const createRes = await request(app)
      .post('/tasks')
      .send({ title: "Delete me" });

    const id = createRes.body.id;

    const res = await request(app).delete(`/tasks/${id}`);

    expect(res.statusCode).toBe(204);
  });

  it("should mark task as completed", async () => {
    const createRes = await request(app)
      .post('/tasks')
      .send({ title: "Complete me" });

    const id = createRes.body.id;

    const res = await request(app).patch(`/tasks/${id}/complete`);

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("done");
  });

  it("should return 400 for invalid task creation", async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: "" });

    expect(res.statusCode).toBe(400);
  });

  it("should return 404 when deleting non-existing task", async () => {
    const res = await request(app).delete('/tasks/invalid-id');

    expect(res.statusCode).toBe(404);
  });

  it("should update a task", async () => {
    const createRes = await request(app)
      .post('/tasks')
      .send({ title: "Old Task" });

    const id = createRes.body.id;

    const res = await request(app)
      .put(`/tasks/${id}`)
      .send({ title: "Updated Task" });

    expect(res.statusCode).toBe(200);
    expect(res.body.title).toBe("Updated Task");
  });

  it("should return 404 when updating non-existing task", async () => {
    const res = await request(app)
      .put('/tasks/invalid-id')
      .send({ title: "Test" });

    expect(res.statusCode).toBe(404);
  });

  it("should return stats", async () => {
    await request(app).post('/tasks').send({ title: "Task 1" });

    const res = await request(app).get('/tasks/stats');

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("todo");
  });

  it("should return 404 when completing non-existing task", async () => {
    const res = await request(app).patch('/tasks/invalid-id/complete');

    expect(res.statusCode).toBe(404);
  });

  it("should assign a task", async () => {
  const createRes = await request(app)
    .post('/tasks')
    .send({ title: "Assign me" });

  const id = createRes.body.id;

  const res = await request(app)
        .patch(`/tasks/${id}/assign`)
        .send({ assignee: "Teju" });

    expect(res.statusCode).toBe(200);
    expect(res.body.assignee).toBe("Teju");
    });

    it("should return 404 when assigning non-existing task", async () => {
    const res = await request(app)
        .patch('/tasks/invalid-id/assign')
        .send({ assignee: "Teju" });

    expect(res.statusCode).toBe(404);
    });

    it("should return 400 for empty assignee", async () => {
    const createRes = await request(app)
        .post('/tasks')
        .send({ title: "Test" });

    const id = createRes.body.id;

    const res = await request(app)
        .patch(`/tasks/${id}/assign`)
        .send({ assignee: "" });

    expect(res.statusCode).toBe(400);
    });

});
