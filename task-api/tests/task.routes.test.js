const request = require("supertest");
const app = require("../src/app");
const taskService = require("../src/services/taskService");

describe("Task API", () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe("POST /tasks", () => {
    test("should create a task", async () => {
      const res = await request(app)
        .post("/tasks")
        .send({
          title: "Learn Jest",
          priority: "high",
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.title).toBe("Learn Jest");
      expect(res.body.priority).toBe("high");
      expect(res.body.id).toBeDefined();
    });

    test("should reject empty title", async () => {
      const res = await request(app)
        .post("/tasks")
        .send({
          title: "",
        });

      expect(res.statusCode).toBe(400);
    });

    test("should reject invalid priority", async () => {
      const res = await request(app)
        .post("/tasks")
        .send({
          title: "Task",
          priority: "urgent",
        });

      expect(res.statusCode).toBe(400);
    });
  });

  describe("GET /tasks", () => {
    test("returns all tasks", async () => {
      taskService.create({ title: "Task 1" });
      taskService.create({ title: "Task 2" });

      const res = await request(app).get("/tasks");

      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBe(2);
    });

    test("filters by status", async () => {
      taskService.create({
        title: "Todo",
        status: "todo",
      });

      taskService.create({
        title: "Done",
        status: "done",
      });

      const res = await request(app)
        .get("/tasks")
        .query({
          status: "done",
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].status).toBe("done");
    });
  });

  describe("PUT /tasks/:id", () => {
    test("updates a task", async () => {
      const task = taskService.create({
        title: "Old",
      });

      const res = await request(app)
        .put(`/tasks/${task.id}`)
        .send({
          title: "New",
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.title).toBe("New");
    });

    test("returns 404", async () => {
      const res = await request(app)
        .put("/tasks/123")
        .send({
          title: "New",
        });

      expect(res.statusCode).toBe(404);
    });
  });

  describe("DELETE /tasks/:id", () => {
    test("deletes task", async () => {
      const task = taskService.create({
        title: "Delete",
      });

      const res = await request(app)
        .delete(`/tasks/${task.id}`);

      expect(res.statusCode).toBe(204);
    });

    test("returns 404", async () => {
      const res = await request(app)
        .delete("/tasks/unknown");

      expect(res.statusCode).toBe(404);
    });
  });

  describe("PATCH /tasks/:id/complete", () => {
    test("completes task", async () => {
      const task = taskService.create({
        title: "Complete",
      });

      const res = await request(app)
        .patch(`/tasks/${task.id}/complete`);

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe("done");
      expect(res.body.completedAt).toBeDefined();
    });

    test("returns 404", async () => {
      const res = await request(app)
        .patch("/tasks/abc/complete");

      expect(res.statusCode).toBe(404);
    });
  });

  describe("GET /tasks/stats", () => {
    test("returns statistics", async () => {
      taskService.create({
        title: "Todo",
        status: "todo",
      });

      taskService.create({
        title: "Done",
        status: "done",
      });

      const res = await request(app)
        .get("/tasks/stats");

      expect(res.statusCode).toBe(200);
      expect(res.body.todo).toBe(1);
      expect(res.body.done).toBe(1);
    });
  });
    //pagination bug
    test("GET /tasks?page=1&limit=2 returns first page", async () => {
    taskService.create({ title: "A" });
    taskService.create({ title: "B" });
    taskService.create({ title: "C" });

    const res = await request(app)
        .get("/tasks?page=1&limit=2");

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].title).toBe("A");
    });
    //priority bug
    test("complete endpoint should preserve priority", async () => {
    const task = taskService.create({
        title: "Important",
        priority: "high",
    });

    const res = await request(app)
        .patch(`/tasks/${task.id}/complete`);

    expect(res.body.priority).toBe("high");
    });
    describe("PATCH /tasks/:id/assign", () => {

    test("assigns a task", async () => {

        const task = taskService.create({
        title: "Build API",
        });

        const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({
            assignee: "Alice",
        });

        expect(res.statusCode).toBe(200);
        expect(res.body.assignee).toBe("Alice");

    });

    test("returns 404 for missing task", async () => {

        const res = await request(app)
        .patch("/tasks/123/assign")
        .send({
            assignee: "Alice",
        });

        expect(res.statusCode).toBe(404);

    });

    test("rejects empty assignee", async () => {

        const task = taskService.create({
        title: "Task",
        });

        const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({
            assignee: "",
        });

        expect(res.statusCode).toBe(400);

    });

    });
    test("rejects invalid status", async () => {
  const res = await request(app)
    .post("/tasks")
    .send({
      title: "Test",
      status: "invalid",
    });

  expect(res.statusCode).toBe(400);
});
    test("rejects invalid dueDate", async () => {
  const res = await request(app)
    .post("/tasks")
    .send({
      title: "Test",
      dueDate: "not-a-date",
    });

  expect(res.statusCode).toBe(400);
});
test("updates dueDate successfully", async () => {
  const task = taskService.create({ title: "Task" });

  const res = await request(app)
    .put(`/tasks/${task.id}`)
    .send({
      dueDate: "2026-12-31T00:00:00.000Z",
    });

  expect(res.statusCode).toBe(200);
});
});