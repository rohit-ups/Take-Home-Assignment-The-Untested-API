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

  test("should fail task with invalid priority", async () => {
    const res = await request(app).post("/tasks").send({
      title: "Task",
      priority: "Invalid",
    });

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

    expect(res.body.every((t) => t.status === "todo")).toBe(true);
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

  test("should use defaults for invalid pagination", async () => {
    const taskData = { title: "Task" };

    const requests = Array.from({ length: 12 }, () =>
      request(app).post("/posts").send(taskData),
    );

    await Promise.all(requests);

    const res = await request(app).get("/posts?page=abc&limit=xyz");

    expect(res.body.length).toBe(10);
  });
});

describe("PUT /tasks/:id", () => {
  beforeEach(() => {
    taskService._reset();
  });

  test("should update task", async () => {
    const newTaskRes = await request(app).post("/tasks").send({
      title: "Old",
    });

    const updatedTaskRes = await request(app)
      .put(`/tasks/${newTaskRes.body.id}`)
      .send({ title: "New" });

    expect(updatedTaskRes.statusCode).toBe(200);

    expect(updatedTaskRes.body.title).toBe("New");

    expect(updatedTaskRes.body.id).toBe(newTaskRes.body.id);
  });

  test("should return 404 when updating missing task", async () => {
    const res = await request(app).put("/tasks/fake-id").send({
      title: "New",
    });

    expect(res.statusCode).toBe(404);

    expect(res.body.error).toBe("Task not found");
  });

  test("should fail with invalid title", async () => {
    const newTaskRes = await request(app).post("/tasks").send({
      title: "Old",
    });

    const updatedTaskRes = await request(app)
      .put(`/tasks/${newTaskRes.body.id}`)
      .send({ title: "" });

    expect(updatedTaskRes.statusCode).toBe(400);
  });

  test("should delete the task", async () => {
    const newTaskRes = await request(app).post("/tasks").send({
      title: "Task 1",
    });

    const deleteTaskRes = await request(app).delete(
      `/tasks/${newTaskRes.body.id}`,
    );

    const allTasksRes = await request(app).get("/tasks");

    expect(deleteTaskRes.statusCode).toBe(204);

    expect(allTasksRes.body.length).toBe(0);

    expect(
      allTasksRes.body.find((t) => t.id === newTaskRes.body.id),
    ).toBeUndefined();
  });

  test("should return 404 when deleting missing task", async () => {
    const res = await request(app).delete("/tasks/fake-id");

    expect(res.statusCode).toBe(404);

    expect(res.body.error).toBe("Task not found");
  });
});

describe("PATCH /tasks/:id/complete", () => {
  beforeEach(() => {
    taskService._reset();
  });

  test("should complete task", async () => {
    const taskRes = await request(app).post("/tasks").send({
      title: "Task",
    });

    const completedTaskRes = await request(app).patch(
      `/tasks/${taskRes.body.id}/complete`,
    );

    expect(completedTaskRes.statusCode).toBe(200);

    expect(completedTaskRes.body.status).toBe("done");

    expect(completedTaskRes.body.id).toBe(taskRes.body.id);

    expect(completedTaskRes.body.priority).toBe(taskRes.priority);

    expect(completedTaskRes.body.completedAt).toBeTruthy();
  });

  test("should return 404 when marking complete missing task", async () => {
    const res = await request(app).patch("/tasks/fake-id/complete");

    expect(res.statusCode).toBe(404);

    expect(res.body.error).toBe("Task not found");
  });
});

describe("GET /tasks/stats", () => {
  beforeEach(() => {
    taskService._reset();
  });

  test("should return stats", async () => {
    const todoTaskRes = request(app).post("/tasks").send({
      title: "Task Todo",
    });

    const inProgressTaskRes = request(app).post("/tasks").send({
      title: "Task InProgress",
      status: "in_progress",
    });
    const doneTaskRes = request(app).post("/tasks").send({
      title: "Task Done",
      status: "done",
    });

    const overdueTaskRes = request(app)
      .post("/tasks")
      .send({
        title: "Task OverDue",
        dueDate: new Date(Date.now() - 1000).toISOString(),
      });

    await Promise.all([
      todoTaskRes,
      inProgressTaskRes,
      doneTaskRes,
      overdueTaskRes,
    ]);

    const statsRes = await request(app).get("/tasks/stats");

    expect(statsRes.statusCode).toBe(200);

    expect(statsRes.body).toEqual({
      todo: 2,
      in_progress: 1,
      done: 1,
      overdue: 1,
    });
  });

  test("should return zero stats when no tasks", async () => {
    const statsRes = await request(app).get("/tasks/stats");

    expect(statsRes.statusCode).toBe(200);
    expect(statsRes.body).toEqual({
      todo: 0,
      in_progress: 0,
      done: 0,
      overdue: 0,
    });
  });
});
