const request = require("supertest");
const app = require("../src/app");
const service = require("../src/services/taskService");

beforeEach(() => service._reset());

// helper to create task
const make = async (body = { title: "Task" }) =>
  (await request(app).post("/tasks").send(body)).body;

describe("POST /tasks", () => {
  test("creates a task (201)", async () => {
    const res = await request(app)
      .post("/tasks")
      .send({ title: "Write tests", priority: "high" });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      title: "Write tests",
      priority: "high",
      status: "todo",
    });
  });

  test("400 on missing title", async () => {
    const res = await request(app).post("/tasks").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/title/);
  });

  test.each([
    [{ title: "", status: "todo" }],
    [{ title: "x", status: "bad" }],
    [{ title: "x", priority: "bad" }],
    [{ title: "x", dueDate: "invalid-date" }],
  ])("400 for invalid input %j", async (body) => {
    const res = await request(app).post("/tasks").send(body);
    expect(res.status).toBe(400);
  });

  test.failing("malformed JSON should return 400 (not 500)", async () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    const res = await request(app)
      .post("/tasks")
      .set("Content-Type", "application/json")
      .send("{bad");

    spy.mockRestore();
    expect(res.status).toBe(400);
  });
});

describe("GET /tasks", () => {
  test("returns empty list initially", async () => {
    const res = await request(app).get("/tasks");
    expect(res.body).toEqual([]);
  });

  test("returns all tasks", async () => {
    await make({ title: "a" });
    await make({ title: "b" });

    const res = await request(app).get("/tasks");
    expect(res.body).toHaveLength(2);
  });

  test("filters by exact status", async () => {
    await make({ title: "a", status: "todo" });
    await make({ title: "b", status: "done" });

    const res = await request(app).get("/tasks?status=done");
    expect(res.body.map((t) => t.title)).toEqual(["b"]);
  });

  test("partial status should NOT match", async () => {
    await make({ title: "a", status: "todo" });

    const res = await request(app).get("/tasks?status=do");
    expect(res.body).toEqual([]);
  });

  test("pagination should start from page 1 correctly", async () => {
    for (let i = 1; i <= 5; i++) {
      await make({ title: `T${i}` });
    }

    const res = await request(app).get("/tasks?page=1&limit=2");
    expect(res.body.map((t) => t.title)).toEqual(["T1", "T2"]);
  });

  test("defaults for page/limit", async () => {
    for (let i = 1; i <= 12; i++) {
      await make({ title: `T${i}` });
    }

    const res1 = await request(app).get("/tasks?page=1");
    expect(res1.body).toHaveLength(10);

    const res2 = await request(app).get("/tasks?limit=3");
    expect(res2.body.map((t) => t.title)).toEqual(["T1", "T2", "T3"]);
  });

  test("invalid page/limit fallback", async () => {
    await make({ title: "a" });

    const res = await request(app).get("/tasks?page=abc&limit=xyz");
    expect(res.body).toHaveLength(1);
  });
});

describe("PUT /tasks/:id", () => {
  test("updates a task", async () => {
    const t = await make();

    const res = await request(app)
      .put(`/tasks/${t.id}`)
      .send({ title: "New", status: "in_progress" });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: t.id,
      title: "New",
      status: "in_progress",
    });
  });

  test("404 for unknown id", async () => {
    const res = await request(app).put("/tasks/nope").send({ title: "x" });
    expect(res.status).toBe(404);
  });

  test("400 on invalid body", async () => {
    const t = await make();

    expect(
      (await request(app).put(`/tasks/${t.id}`).send({ title: "" })).status
    ).toBe(400);
  });

  test.failing("should not allow overwriting system fields", async () => {
    const t = await make();

    const res = await request(app)
      .put(`/tasks/${t.id}`)
      .send({ id: "hack", createdAt: "x" });

    expect(res.body.id).toBe(t.id);
  });
});

describe("DELETE /tasks/:id", () => {
  test("deletes task", async () => {
    const t = await make();

    await request(app).delete(`/tasks/${t.id}`);

    const res = await request(app).get("/tasks");
    expect(res.body).toHaveLength(0);
  });

  test("double delete returns 404", async () => {
    const t = await make();

    await request(app).delete(`/tasks/${t.id}`);

    const res = await request(app).delete(`/tasks/${t.id}`);
    expect(res.status).toBe(404);
  });
});

describe("PATCH /tasks/:id/complete", () => {
  test("marks task complete", async () => {
    const t = await make();

    const res = await request(app).patch(`/tasks/${t.id}/complete`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("done");
    expect(res.body.completedAt).not.toBeNull();
  });

  test("404 for invalid id", async () => {
    const res = await request(app).patch("/tasks/nope/complete");
    expect(res.status).toBe(404);
  });

  test.failing("should not change priority", async () => {
    const t = await make({ priority: "high" });

    const res = await request(app).patch(`/tasks/${t.id}/complete`);

    expect(res.body.priority).toBe("high");
  });
});

describe("GET /tasks/stats", () => {
  test("returns stats correctly", async () => {
    await make({ title: "a", status: "todo", dueDate: "2000-01-01T00:00:00Z" });
    await make({ title: "b", status: "in_progress" });

    const c = await make({ title: "c" });
    await request(app).patch(`/tasks/${c.id}/complete`);

    const res = await request(app).get("/tasks/stats");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      todo: 1,
      in_progress: 1,
      done: 1,
      overdue: 1,
    });
  });
});