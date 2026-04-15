const request = require("supertest");
const app = require("../../src/app");
const taskService = require("../../src/services/taskService");

beforeEach(() => {
  taskService._reset();
});

describe("Tasks API", () => {
  describe("GET /tasks", () => {
    it("returns all tasks", async () => {
      const task = taskService.create({ title: "List me" });

      const res = await request(app).get("/tasks");

      expect(res.status).toBe(200);
      expect(res.body).toEqual([task]);
    });

    it("filters by status", async () => {
      taskService.create({ title: "Todo", status: "todo" });
      const doneTask = taskService.create({ title: "Done", status: "done" });

      const res = await request(app).get("/tasks").query({ status: "done" });

      expect(res.status).toBe(200);
      expect(res.body).toEqual([doneTask]);
    });

    it("returns 400 for invalid status query", async () => {
      const res = await request(app).get("/tasks").query({ status: "invalid" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("invalid status query parameter");
    });

    it("paginates tasks correctly", async () => {
      const first = taskService.create({ title: "First" });
      taskService.create({ title: "Second" });

      const res = await request(app).get("/tasks").query({ page: 1, limit: 1 });

      expect(res.status).toBe(200);
      expect(res.body).toEqual([first]);
    });

    it("returns 400 for invalid pagination values", async () => {
      const res = await request(app)
        .get("/tasks")
        .query({ page: "zero", limit: "one" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("page and limit must be positive integers");
    });
  });

  describe("GET /tasks/stats", () => {
    it("returns statistics for tasks", async () => {
      taskService.create({ title: "Task 1", status: "todo" });
      taskService.create({ title: "Task 2", status: "done" });

      const res = await request(app).get("/tasks/stats");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        todo: 1,
        in_progress: 0,
        done: 1,
        overdue: 0,
      });
    });
  });

  describe("POST /tasks", () => {
    it("creates a task", async () => {
      const res = await request(app)
        .post("/tasks")
        .send({ title: "New task", description: "A task", priority: "low" });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe("New task");
      expect(res.body.priority).toBe("low");
      expect(res.body.assignee).toBeNull();
    });

    it("returns 400 for missing title", async () => {
      const res = await request(app)
        .post("/tasks")
        .send({ description: "no title" });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/title is required/);
    });
  });

  describe("PUT /tasks/:id", () => {
    it("updates a task", async () => {
      const task = taskService.create({ title: "Edit me" });
      const res = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ title: "Edited", assignee: "Jason" });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe("Edited");
      expect(res.body.assignee).toBe("Jason");
    });

    it("returns 404 when task does not exist", async () => {
      const res = await request(app)
        .put("/tasks/nonexistent")
        .send({ title: "Edited" });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Task not found");
    });

    it("returns 400 for invalid update data", async () => {
      const task = taskService.create({ title: "Edit me" });
      const res = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ title: "" });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/title must be a non-empty string/);
    });
  });

  describe("DELETE /tasks/:id", () => {
    it("deletes a task", async () => {
      const task = taskService.create({ title: "Remove me" });
      const res = await request(app).delete(`/tasks/${task.id}`);

      expect(res.status).toBe(204);
    });

    it("returns 404 when task not found", async () => {
      const res = await request(app).delete("/tasks/missing");

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Task not found");
    });
  });

  describe("PATCH /tasks/:id/complete", () => {
    it("marks a task complete", async () => {
      const task = taskService.create({ title: "Complete me" });
      const res = await request(app).patch(`/tasks/${task.id}/complete`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("done");
      expect(res.body.completedAt).toBeDefined();
    });

    it("returns 404 when task not found", async () => {
      const res = await request(app).patch("/tasks/missing/complete");

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Task not found");
    });
  });

  describe("PATCH /tasks/:id/assign", () => {
    it("assigns a task successfully", async () => {
      const task = taskService.create({ title: "Assign me" });
      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: "Sam" });

      expect(res.status).toBe(200);
      expect(res.body.assignee).toBe("Sam");
    });

    it("returns 400 for empty assignee", async () => {
      const task = taskService.create({ title: "Assign me" });
      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: "" });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/assignee is required/);
    });

    it("returns 404 when task not found", async () => {
      const res = await request(app)
        .patch("/tasks/does-not-exist/assign")
        .send({ assignee: "Sam" });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Task not found");
    });

    it("allows reassignment when assignee already exists", async () => {
      const task = taskService.create({
        title: "Reassign me",
        assignee: "Alex",
      });
      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: "Jordan" });

      expect(res.status).toBe(200);
      expect(res.body.assignee).toBe("Jordan");
    });
  });
});
