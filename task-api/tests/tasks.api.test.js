const request = require("supertest");
const app = require("../src/app");
const taskService = require("../src/services/taskService");

describe("Tasks API", () => {
  beforeEach(() => {
    taskService._reset();
  });

  //create post - happy path
  test("POST/ tasks should create a new task", async () => {
    const res = await request(app).post("/tasks").send({
      title: "Test Task",
      priority: "high",
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.title).toBe("Test Task");
  });
  // create post edge case invalid input - e1

  test("POST /tasks should return 400 for invalid input", async () => {
    const res = await request(app).post("/tasks").send({});

    expect(res.statusCode).toBe(400);
  });

  //missing title edge case - e2
  test("POST /tasks should return 400 if title is missing", async () => {
    const res = await request(app).post("/tasks").send({ priority: "high" });

    expect(res.statusCode).toBe(400);
  });

  //get tasks - h1

  test("GET /tasks should return all tasks", async () => {
    await request(app).post("/tasks").send({ title: "Task 1" });
    await request(app).post("/tasks").send({ title: "Task 2" });

    const res = await request(app).get("/tasks");

    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(2);
  });

  // get task - edge case - no tasks - e1
  test("GET /tasks should return empty array if no tasks", async () => {
    const res = await request(app).get("/tasks");

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([]);
  });

  // get task - ensure response format - e2

  test("GET /tasks should return task objects with id", async () => {
    await request(app).post("/tasks").send({ title: "Task 1" });

    const res = await request(app).get("/tasks");

    expect(res.body[0].id).toBeDefined();
  });

  // filter by status - success - happy 1

  test("GET /tasks?status=todo should return filtered tasks", async () => {
    await request(app).post("/tasks").send({
      title: "Task 1",
      status: "todo",
    });

    await request(app).post("/tasks").send({
      title: "Task 2",
      status: "done",
    });

    const res = await request(app).get("/tasks?status=todo");

    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].status).toBe("todo");
  });

  //status - not found - e1

  test("GET /tasks?status=invalid should return empty list", async () => {
    await request(app).post("/tasks").send({ title: "Task 1", status: "todo" });

    const res = await request(app).get("/tasks?status=invalid");

    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(0);
  });

  // no matching status e2

  test("GET /tasks?status=done should return empty if none match", async () => {
    await request(app).post("/tasks").send({ title: "Task 1", status: "todo" });

    const res = await request(app).get("/tasks?status=done");

    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(0);
  });

  //pagination - happy path

  test("GET /tasks pagination should return limited tasks", async () => {
    await request(app).post("/tasks").send({ title: "Task 1" });
    await request(app).post("/tasks").send({ title: "Task 2" });
    await request(app).post("/tasks").send({ title: "Task 3" });

    const res = await request(app).get("/tasks?page=1&limit=2");

    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBeLessThanOrEqual(2);
  });

  // pagination - edhge case - page too large - e1

  test("GET /tasks pagination should return empty if page exceeds data", async () => {
    await request(app).post("/tasks").send({ title: "Task 1" });

    const res = await request(app).get("/tasks?page=10&limit=5");

    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(0);
  });

  // pagination - invalid page - e-2
  test("GET /tasks pagination should handle invalid page number", async () => {
    const res = await request(app).get("/tasks?page=abc&limit=2");

    expect(res.statusCode).toBe(200);
  });

  //get stats - happy path

  test("GET /tasks/stats should return task statistics", async () => {
    await request(app).post("/tasks").send({
      title: "Task 1",
      status: "todo",
    });

    await request(app).post("/tasks").send({
      title: "Task 2",
      status: "done",
    });

    const res = await request(app).get("/tasks/stats");

    expect(res.statusCode).toBe(200);
    expect(res.body.todo).toBe(1);
    expect(res.body.done).toBe(1);
    expect(res.body.in_progress).toBe(0);
  });

  // edge case - no tasks- get stas - e1

  test("GET /tasks/stats should return zero counts when no tasks exist", async () => {
    const res = await request(app).get("/tasks/stats");

    expect(res.statusCode).toBe(200);
    expect(res.body.todo).toBe(0);
  });

  // overdue task - e2

  test("GET /tasks/stats should count overdue tasks", async () => {
    await request(app).post("/tasks").send({
      title: "Old Task",
      dueDate: "2020-01-01",
    });

    const res = await request(app).get("/tasks/stats");

    expect(res.body.overdue).toBeGreaterThanOrEqual(1);
  });

  //updtae a task

  test("PUT /tasks/:id should update task", async () => {
    const create = await request(app)
      .post("/tasks")
      .send({ title: "Old title" });

    const id = create.body.id;

    const res = await request(app)
      .put(`/tasks/${id}`)
      .send({ title: "Updated Title" });

    expect(res.statusCode).toBe(200);
    expect(res.body.title).toBe("Updated Title");
  });

  // validation error 400 - e1

  test("PUT /tasks/:id should return 400 for invalid update data", async () => {
    const create = await request(app)
      .post("/tasks")
      .send({ title: "Task to update" });

    const id = create.body.id;

    const res = await request(app)
      .put(`/tasks/${id}`)
      .send({ priority: "invalid" }); // invalid priority

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  // update invalid id - task not found - e2

  test("PUT /tasks/:id should return 404 if task not found", async () => {
    const res = await request(app)
      .put("/tasks/invalid-id")
      .send({ title: "Test" });

    expect(res.statusCode).toBe(404);
  });

  //successfull delete - happy

  test("DELETE /tasks/:id should delete task", async () => {
    const create = await request(app)
      .post("/tasks")
      .send({ title: "Delete Me" });

    const id = create.body.id;

    const res = await request(app).delete(`/tasks/${id}`);

    expect(res.statusCode).toBe(204);
  });

  //task not found - e1

  test("DELETE /tasks/:id should return 404 if task not found", async () => {
    const res = await request(app).delete("/tasks/invalid-id");

    expect(res.statusCode).toBe(404);
  });

  // delete already deleted data - e2

  test("DELETE /tasks/:id should fail if deleting twice", async () => {
    const create = await request(app).post("/tasks").send({ title: "Task" });

    await request(app).delete(`/tasks/${create.body.id}`);

    const res = await request(app).delete(`/tasks/${create.body.id}`);

    expect(res.statusCode).toBe(404);
  });

  //patch - complete task - happy path

  test("PATCH /tasks/:id/complete should mark task complete", async () => {
    const create = await request(app)
      .post("/tasks")
      .send({ title: "Finish Me" });

    const id = create.body.id;

    const res = await request(app).patch(`/tasks/${id}/complete`);

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("done");
  });

  // patch - task not found - e1

  test("PATCH /tasks/:id/complete should return 404 if task not found", async () => {
    const res = await request(app).patch("/tasks/invalid-id/complete");

    expect(res.statusCode).toBe(404);
  });

  // patch - complete already completed task

  test("PATCH /tasks/:id/complete should handle completing already completed task", async () => {
    const create = await request(app).post("/tasks").send({ title: "Task" });

    await request(app).patch(`/tasks/${create.body.id}/complete`);

    const res = await request(app).patch(`/tasks/${create.body.id}/complete`);

    expect(res.statusCode).toBe(200);
  });
});
