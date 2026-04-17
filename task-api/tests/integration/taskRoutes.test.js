const request = require("supertest");
const app = require("../../src/app");
const taskService = require("../../src/services/taskService");

beforeEach(() => {
  taskService._reset();
});

describe("Task Routes - Integration", () => {

  // CREATE
  test("POST /tasks", async () => {
    const res = await request(app)
      .post("/tasks")
      .send({ title: "Test API" });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("id");
  });

  // INVALID CREATE
  test("POST /tasks invalid", async () => {
    const res = await request(app)
      .post("/tasks")
      .send({});

    expect(res.statusCode).toBe(400);
  });

  // PAGINATION
  test("GET /tasks pagination", async () => {
    for (let i = 1; i <= 15; i++) {
      await request(app).post("/tasks").send({ title: `Task ${i}` });
    }

    const res = await request(app).get("/tasks?page=1&limit=10");

    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(10);
  });

  // COMPLETE TASK
  test("PATCH /tasks/:id/complete", async () => {
    const createRes = await request(app)
      .post("/tasks")
      .send({ title: "Complete me", priority: "high" });

    const id = createRes.body.id;

    const res = await request(app).patch(`/tasks/${id}/complete`);

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("done");
    expect(res.body.priority).toBe("high");
  });

  // STATS
  test("GET /tasks/stats", async () => {
    await request(app).post("/tasks").send({ title: "A" });

    const res = await request(app).get("/tasks/stats");

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("todo");
  });

  // ✅ UPDATE SUCCESS
  test("PUT /tasks/:id should update task", async () => {
    const createRes = await request(app)
      .post("/tasks")
      .send({ title: "Old" });

    const id = createRes.body.id;

    const res = await request(app)
      .put(`/tasks/${id}`)
      .send({ title: "Updated" });

    expect(res.statusCode).toBe(200);
    expect(res.body.title).toBe("Updated");
  });

  // ❌ UPDATE NOT FOUND
  test("PUT /tasks/:id should return 404 if not found", async () => {
    const res = await request(app)
      .put("/tasks/invalid-id")
      .send({ title: "X" });

    expect(res.statusCode).toBe(404);
  });

  // ✅ DELETE SUCCESS
  test("DELETE /tasks/:id should delete task", async () => {
    const createRes = await request(app)
      .post("/tasks")
      .send({ title: "Delete me" });

    const id = createRes.body.id;

    const res = await request(app).delete(`/tasks/${id}`);

    expect(res.statusCode).toBe(204);
  });

  // ❌ DELETE NOT FOUND
  test("DELETE /tasks/:id should return 404 if not found", async () => {
    const res = await request(app).delete("/tasks/invalid-id");

    expect(res.statusCode).toBe(404);
  });

});