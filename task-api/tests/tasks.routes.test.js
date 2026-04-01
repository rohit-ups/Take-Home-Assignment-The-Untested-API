const request = require("supertest");
const app = require("../src/app");
const taskService = require("../src/services/taskService");

describe("POST /tasks", () => {
  beforeEach(() => {
    taskService._reset();
  });

  test("should create task", async () => {
    const res = await request(app).post("/tasks").send({
      title: "API task",
    });

    expect(res.statusCode).toBe(201);

    expect(res.body.title).toBe("API task");
  });

  test("should fail without title", async () => {
    const res = await request(app).post("/tasks").send({});

    expect(res.statusCode).toBe(400);
  });
});

describe("GET /tasks", () => {
  beforeEach(() => {
    taskService._reset();
  });

  test("should return tasks when no query is provided", async () => {
    await request(app).post("/tasks").send({
      title: "Task 2",
    });

    await request(app).post("/tasks").send({
      title: "Task 2",
    });

    const res = await request(app).get("/tasks");

    expect(res.statusCode).toBe(200);

    expect(res.body.length).toBe(2);
  });

  test("should return empty array when no task exist", async () => {
    const res = await request(app).get("/tasks");

    expect(res.body.length).toBe(0);
  });

  test("should return empty array if status doesn't match", async () => {
    await request(app).post("/tasks").send({
      title: "Task",
    });

    const res = await request(app).get("/tasks?status=done");

    expect(res.body.length).toBe(0);
  });

  test("should filter tasks by status", async () => {
    await request(app).post("/tasks").send({
      title: "Task 1",
    });

    await request(app).post("/tasks").send({
      title: "Task 2",
    });

    const res = await request(app).get("/tasks?status=todo");

    expect(res.body.every(t=> t.status === "todo")).toBe(true);
  });

  test("should return paginated tasks", async () => {
    const taskData = { title: "Task" };

    const requests = Array.from({ length: 15 }, () =>
      request(app).post("/tasks").send(taskData),
    );

    await Promise.all(requests);

    const res = await request(app).get("/tasks?page=1&limit=10");

    expect(res.statusCode).toBe(200);

    expect(res.body.length).toBe(10);
  });

  test("should return second page", async () => {
    const taskData = { title: "Task" };

    const requests = Array.from({ length: 15 }, () =>
      request(app).post("/tasks").send(taskData),
    );

    await Promise.all(requests);

    const res = await request(app).get("/tasks?page=2&limit=10");

    expect(res.statusCode).toBe(200);

    expect(res.body.length).toBe(5);
  });
});
