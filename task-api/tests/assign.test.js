const request = require("supertest");
const app = require("../src/app");
const taskService = require("../src/services/taskService");

beforeEach(() => taskService._reset());

describe("PATCH /tasks/:id/assign", () => {
  const make = async () =>
    (await request(app).post("/tasks").send({ title: "T" })).body;

  test("assigns and returns updated task", async () => {
    const t = await make();
    const res = await request(app)
      .patch(`/tasks/${t.id}/assign`)
      .send({ assignee: "Alice" });
    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe("Alice");
    expect(taskService.findById(t.id).assignee).toBe("Alice");
  });

  test("trims whitespace", async () => {
    const t = await make();
    const res = await request(app)
      .patch(`/tasks/${t.id}/assign`)
      .send({ assignee: "  Bob " });
    expect(res.body.assignee).toBe("Bob");
  });

  test("404 for unknown task", async () => {
    const res = await request(app)
      .patch("/tasks/nope/assign")
      .send({ assignee: "A" });
    expect(res.status).toBe(404);
  });

  test.each([
    [{}],
    [{ assignee: "" }],
    [{ assignee: "   " }],
    [{ assignee: 42 }],
    [{ assignee: null }],
  ])("rejects %j with 400", async (body) => {
    const t = await make();
    const res = await request(app).patch(`/tasks/${t.id}/assign`).send(body);
    expect(res.status).toBe(400);
  });

  test("reassigning overwrites the previous assignee", async () => {
    const t = await make();
    await request(app)
      .patch(`/tasks/${t.id}/assign`)
      .send({ assignee: "Alice" });
    const res = await request(app)
      .patch(`/tasks/${t.id}/assign`)
      .send({ assignee: "Bob" });
    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe("Bob");
  });
});
