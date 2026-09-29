const request = require("supertest");
const app = require("../src/app");
const taskService = require("../src/services/taskService");

describe("Task API Integration Tests", () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe("GET /tasks", () => {
    test("returns empty list initially", async () => {
      const res = await request(app).get("/tasks");
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    test("supports pagination parameters", async () => {
      for (let i = 1; i <= 5; i++) {
        taskService.create({ title: `Task ${i}` });
      }
      const res = await request(app).get("/tasks?page=1&limit=2");
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
      expect(res.body[0].title).toBe("Task 1");
    });
  });

  describe("POST /tasks", () => {
    test("creates task with valid data", async () => {
      const res = await request(app)
        .post("/tasks")
        .send({ title: "New Task", priority: "high" });
      expect(res.status).toBe(201);
      expect(res.body.title).toBe("New Task");
      expect(res.body.priority).toBe("high");
    });

    test("returns 400 for empty title", async () => {
      const res = await request(app).post("/tasks").send({ title: "   " });
      expect(res.status).toBe(400);
    });
  });

  describe("PUT /tasks/:id", () => {
    test("updates existing task", async () => {
      const task = taskService.create({ title: "Original Title" });
      const res = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ title: "Updated Title" });
      expect(res.status).toBe(200);
      expect(res.body.title).toBe("Updated Title");
    });

    test("returns 404 for non-existent task", async () => {
      const res = await request(app)
        .put("/tasks/invalid-id")
        .send({ title: "Updated" });
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /tasks/:id", () => {
    test("deletes existing task", async () => {
      const task = taskService.create({ title: "Delete Me" });
      const res = await request(app).delete(`/tasks/${task.id}`);
      expect(res.status).toBe(204);
    });

    test("returns 404 when deleting non-existent task", async () => {
      const res = await request(app).delete("/tasks/invalid-id");
      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /tasks/:id/complete", () => {
    test("marks task complete", async () => {
      const task = taskService.create({ title: "Complete Me" });
      const res = await request(app).patch(`/tasks/${task.id}/complete`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("done");
      expect(res.body.completedAt).not.toBeNull();
    });
  });

  describe("GET /tasks/stats", () => {
    test("returns task statistics", async () => {
      const res = await request(app).get("/tasks/stats");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("todo");
      expect(res.body).toHaveProperty("overdue");
    });
  });

  describe("PATCH /tasks/:id/assign", () => {
    test("assigns task successfully", async () => {
      const task = taskService.create({ title: "Assignee Test" });
      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: "Bob Smith" });

      expect(res.status).toBe(200);
      expect(res.body.assignee).toBe("Bob Smith");
    });

    test("returns 400 for empty or whitespace assignee", async () => {
      const task = taskService.create({ title: "Assignee Test" });
      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: "   " });

      expect(res.status).toBe(400);
    });

    test("returns 404 for non-existent task", async () => {
      const res = await request(app)
        .patch("/tasks/non-existent-id/assign")
        .send({ assignee: "Bob" });

      expect(res.status).toBe(404);
    });
  });
});
