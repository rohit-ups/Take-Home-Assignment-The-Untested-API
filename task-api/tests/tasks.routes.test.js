const request = require("supertest");
const app = require("../src/app");
const taskService = require("../src/services/taskService");

beforeEach(() => {
  taskService._reset();
});

describe("Task Routes", () => {
  test("POST /tasks creates a task", async () => {
    const res = await request(app)
      .post("/tasks")
      .send({
        title: "API Task",
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.title).toBe("API Task");
    expect(res.body.status).toBe("todo");
  });

  test("POST /tasks rejects empty title", async () => {
    const res = await request(app)
      .post("/tasks")
      .send({
        title: "",
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  test("GET /tasks returns all tasks", async () => {
    taskService.create({ title: "One" });
    taskService.create({ title: "Two" });

    const res = await request(app).get("/tasks");

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(2);
  });
  test("GET /tasks?status=todo filters tasks", async () => {
  taskService.create({ title: "Todo", status: "todo" });
  taskService.create({ title: "Done", status: "done" });

  const res = await request(app).get("/tasks?status=todo");

  expect(res.statusCode).toBe(200);
  expect(res.body).toHaveLength(1);
  expect(res.body[0].title).toBe("Todo");
});
test("PUT /tasks/:id updates a task", async () => {
  const task = taskService.create({ title: "Old" });

  const res = await request(app)
    .put(`/tasks/${task.id}`)
    .send({
      title: "New",
      priority: "high",
    });

  expect(res.statusCode).toBe(200);
  expect(res.body.title).toBe("New");
  expect(res.body.priority).toBe("high");
});
test("PUT returns 404 for missing task", async () => {
  const res = await request(app)
    .put("/tasks/123")
    .send({
      title: "Hello",
    });

  expect(res.statusCode).toBe(404);
});
test("DELETE removes a task", async () => {
  const task = taskService.create({ title: "Delete" });

  const res = await request(app).delete(`/tasks/${task.id}`);

  expect(res.statusCode).toBe(204);
});
test("PATCH /complete marks task done", async () => {
  const task = taskService.create({ title: "Finish" });

  const res = await request(app)
    .patch(`/tasks/${task.id}/complete`);

  expect(res.statusCode).toBe(200);
  expect(res.body.status).toBe("done");
});
test("GET /tasks/stats returns counts", async () => {
  taskService.create({ title: "A", status: "todo" });
  taskService.create({ title: "B", status: "done" });

  const res = await request(app).get("/tasks/stats");

  expect(res.statusCode).toBe(200);
  expect(res.body.todo).toBe(1);
  expect(res.body.done).toBe(1);
});
test("PATCH /assign assigns a task", async () => {
  const task = taskService.create({ title: "Backend API" });

  const res = await request(app)
    .patch(`/tasks/${task.id}/assign`)
    .send({
      assignee: "Nikhil",
    });

  expect(res.statusCode).toBe(200);
  expect(res.body.assignee).toBe("Nikhil");
});

test("PATCH /assign returns 400 for empty assignee", async () => {
  const task = taskService.create({ title: "Backend API" });

  const res = await request(app)
    .patch(`/tasks/${task.id}/assign`)
    .send({
      assignee: "",
    });

  expect(res.statusCode).toBe(400);
});

test("PATCH /assign returns 404 for missing task", async () => {
  const res = await request(app)
    .patch("/tasks/123/assign")
    .send({
      assignee: "Nikhil",
    });

  expect(res.statusCode).toBe(404);
});
});