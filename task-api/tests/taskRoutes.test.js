const request = require("supertest");
const app = require("../src/app");

describe("Task API - Integration Tests", () => {
  let taskId;

  test("GET /tasks should return empty array", async () => {
    const res = await request(app).get("/tasks");

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test("POST /tasks should create a task", async () => {
    const res = await request(app).post("/tasks").send({
      title: "New Task",
      priority: "low",
    });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("id");

    taskId = res.body.id;
  });

  test("POST should fail with invalid priority", async () => {
    const res = await request(app).post("/tasks").send({
      title: "Task",
      priority: "invalid",
    });
    expect(res.statusCode).toBe(400);
  });

  test("GET /tasks/:id should return task", async () => {
    const create = await request(app).post("/tasks").send({ title: "Find me" });

    const res = await request(app).get(`/tasks/${create.body.id}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.id).toBe(create.body.id);
  });

  test("pagination should limit results", async () => {
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post("/tasks")
        .send({ title: `Task ${i}` });
    }

    const res = await request(app).get("/tasks?page=0&limit=2");

    expect(res.body.length).toBe(2);
  });

  test("stats should return correct counts", async () => {
    await request(app).post("/tasks").send({ title: "T1", status: "todo" });
    await request(app).post("/tasks").send({ title: "T2", status: "done" });

    const res = await request(app).get("/tasks/stats");

    expect(res.body.todo).toBeGreaterThanOrEqual(1);
    expect(res.body.done).toBeGreaterThanOrEqual(1);
  });
  test("should count overdue tasks", async () => {
    await request(app).post("/tasks").send({
      title: "Overdue Task",
      dueDate: "2020-01-01",
    });

    const res = await request(app).get("/tasks/stats");

    expect(res.body.overdue).toBeGreaterThanOrEqual(1);
  });

  test("POST should fail with empty title", async () => {
    const res = await request(app).post("/tasks").send({ title: "" });

    expect(res.statusCode).toBe(400);
  });



  test('PATCH /tasks/:id/assign should assign task', async () => {
  const create = await request(app)
    .post('/tasks')
    .send({ title: 'Assign me' });

  const res = await request(app)
    .patch(`/tasks/${create.body.id}/assign`)
    .send({ assignee: 'Sumit' });

  expect(res.statusCode).toBe(200);
  expect(res.body.assignee).toBe('Sumit');
});

test('should overwrite existing assignee', async () => {
  const create = await request(app)
    .post('/tasks')
    .send({ title: 'Task' });

  await request(app)
    .patch(`/tasks/${create.body.id}/assign`)
    .send({ assignee: 'A' });

  const res = await request(app)
    .patch(`/tasks/${create.body.id}/assign`)
    .send({ assignee: 'B' });

  expect(res.body.assignee).toBe('B');
});

test('should fail if assignee is empty', async () => {
  const create = await request(app)
    .post('/tasks')
    .send({ title: 'Task' });

  const res = await request(app)
    .patch(`/tasks/${create.body.id}/assign`)
    .send({ assignee: '' });

  expect(res.statusCode).toBe(400);
});

test('should return 404 if task not found', async () => {
  const res = await request(app)
    .patch('/tasks/invalid-id/assign')
    .send({ assignee: 'Sumit' });

  expect(res.statusCode).toBe(404);
});

  test("GET /tasks should return tasks", async () => {
    const res = await request(app).get("/tasks");

    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  test("GET /tasks?status=todo", async () => {
    const res = await request(app).get("/tasks?status=todo");

    expect(res.statusCode).toBe(200);
  });

  test("GET /tasks?page=0&limit=1", async () => {
    const res = await request(app).get("/tasks?page=0&limit=1");

    expect(res.statusCode).toBe(200);
  });

  test("PUT /tasks/:id should update task", async () => {
    const res = await request(app)
      .put(`/tasks/${taskId}`)
      .send({ title: "Updated Task" });

    expect(res.statusCode).toBe(200);
    expect(res.body.title).toBe("Updated Task");
  });

  test("PUT should return 404 for invalid id", async () => {
    const res = await request(app)
      .put("/tasks/invalid-id")
      .send({ title: "x" });

    expect(res.statusCode).toBe(404);
  });

  test("PATCH /tasks/:id/complete", async () => {
    const res = await request(app).patch(`/tasks/${taskId}/complete`);

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("done");
  });

  test("DELETE /tasks/:id", async () => {
    const res = await request(app).delete(`/tasks/${taskId}`);

    expect(res.statusCode).toBe(204);
  });

  test("DELETE should return 404 for invalid id", async () => {
    const res = await request(app).delete("/tasks/invalid-id");

    expect(res.statusCode).toBe(404);
  });

  test("GET /tasks/stats", async () => {
    const res = await request(app).get("/tasks/stats");

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("todo");
  });
});
