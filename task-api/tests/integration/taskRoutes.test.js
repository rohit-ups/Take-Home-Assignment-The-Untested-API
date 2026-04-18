const request = require("supertest");
const app = require("../../src/app");
const taskService = require("../../src/services/taskService");

// Reset in-memory store before each test to ensure isolation
beforeEach(() => {
  taskService._reset();
});

describe("Task Routes - Integration", () => {

  /**
   * CREATE TASK
   * Verifies that a valid request creates a new task successfully
   */
  test("POST /tasks", async () => {
    const res = await request(app)
      .post("/tasks")
      .send({ title: "Test API" });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("id");
  });

  /**
   * INVALID CREATE
   * Ensures validation rejects missing required fields
   */
  test("POST /tasks invalid", async () => {
    const res = await request(app)
      .post("/tasks")
      .send({});

    expect(res.statusCode).toBe(400);
  });

  /**
   * PAGINATION
   * Confirms correct pagination behavior (page 1 returns first N tasks)
   */
  test("GET /tasks pagination", async () => {
    for (let i = 1; i <= 15; i++) {
      await request(app).post("/tasks").send({ title: `Task ${i}` });
    }

    const res = await request(app).get("/tasks?page=1&limit=10");

    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(10);
  });

  /**
   * COMPLETE TASK
   * Verifies task completion updates status and preserves priority
   */
  test("PATCH /tasks/:id/complete", async () => {
    const createRes = await request(app)
      .post("/tasks")
      .send({ title: "Complete me", priority: "high" });

    const id = createRes.body.id;

    const res = await request(app).patch(`/tasks/${id}/complete`);

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("done");
    expect(res.body.priority).toBe("high"); // ensures bug fix
  });

  /**
   * STATS
   * Validates aggregated counts are returned correctly
   */
  test("GET /tasks/stats", async () => {
    await request(app).post("/tasks").send({ title: "A" });

    const res = await request(app).get("/tasks/stats");

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("todo");
  });

  /**
   * UPDATE SUCCESS
   * Confirms existing task can be updated
   */
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

  /**
   * UPDATE NOT FOUND
   * Ensures API returns 404 for non-existent task
   */
  test("PUT /tasks/:id should return 404 if not found", async () => {
    const res = await request(app)
      .put("/tasks/invalid-id")
      .send({ title: "X" });

    expect(res.statusCode).toBe(404);
  });

  /**
   * DELETE SUCCESS
   * Verifies task deletion returns 204 and removes resource
   */
  test("DELETE /tasks/:id should delete task", async () => {
    const createRes = await request(app)
      .post("/tasks")
      .send({ title: "Delete me" });

    const id = createRes.body.id;

    const res = await request(app).delete(`/tasks/${id}`);

    expect(res.statusCode).toBe(204);
  });

  /**
   * DELETE NOT FOUND
   * Ensures deleting non-existent task returns 404
   */
  test("DELETE /tasks/:id should return 404 if not found", async () => {
    const res = await request(app).delete("/tasks/invalid-id");

    expect(res.statusCode).toBe(404);
  });

  /**
 * ASSIGN TASK
 * Verifies task can be assigned to a user
 */
test("PATCH /tasks/:id/assign should assign task", async () => {
  const createRes = await request(app)
    .post("/tasks")
    .send({ title: "Assign Test" });

  const id = createRes.body.id;

  const res = await request(app)
    .patch(`/tasks/${id}/assign`)
    .send({ assignee: "Krish" });

  expect(res.statusCode).toBe(200);
  expect(res.body.assignee).toBe("Krish");
});
});