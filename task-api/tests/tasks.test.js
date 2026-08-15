const request = require("supertest");
const app = require("../src/app");
const taskService = require("../src/services/taskService");

describe("Task API", () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe("GET /tasks", () => {
    test("returns all tasks", async () => {
      await request(app).post("/tasks").send({
        title: "Task 1",
      });

      await request(app).post("/tasks").send({
        title: "Task 2",
      });

      const response = await request(app).get("/tasks");

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
    });

    test("filters tasks by status", async () => {
      await request(app).post("/tasks").send({
        title: "Todo",
        status: "todo",
      });

      await request(app).post("/tasks").send({
        title: "Progress",
        status: "in_progress",
      });

      const response = await request(app).get("/tasks?status=todo");

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].status).toBe("todo");
    });

    test("supports pagination", async () => {
      for (let i = 1; i <= 15; i++) {
        await request(app)
          .post("/tasks")
          .send({
            title: `Task ${i}`,
          });
      }

      const response = await request(app).get("/tasks?page=1&limit=10");

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(10);
      expect(response.body[0].title).toBe("Task 1");
    });
  });

  describe("POST /tasks", () => {
    test("creates a task", async () => {
      const response = await request(app).post("/tasks").send({
        title: "Write tests",
        priority: "high",
      });

      expect(response.status).toBe(201);
      expect(response.body.title).toBe("Write tests");
      expect(response.body.priority).toBe("high");
      expect(response.body.id).toBeDefined();
    });

    test("rejects a missing title", async () => {
      const response = await request(app).post("/tasks").send({
        priority: "high",
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    test("rejects an invalid priority", async () => {
      const response = await request(app).post("/tasks").send({
        title: "Test",
        priority: "urgent",
      });

      expect(response.status).toBe(400);
    });

    test("rejects an invalid status", async () => {
      const response = await request(app).post("/tasks").send({
        title: "Test",
        status: "invalid",
      });

      expect(response.status).toBe(400);
    });
  });

  describe("PUT /tasks/:id", () => {
    test("updates a task", async () => {
      const created = await request(app).post("/tasks").send({
        title: "Old title",
      });

      const response = await request(app)
        .put(`/tasks/${created.body.id}`)
        .send({
          title: "New title",
        });

      expect(response.status).toBe(200);
      expect(response.body.title).toBe("New title");
    });

    test("returns 404 for a missing task", async () => {
      const response = await request(app).put("/tasks/invalid-id").send({
        title: "New title",
      });

      expect(response.status).toBe(404);
    });

    test("rejects an invalid title", async () => {
      const created = await request(app).post("/tasks").send({
        title: "Test",
      });

      const response = await request(app)
        .put(`/tasks/${created.body.id}`)
        .send({
          title: "",
        });

      expect(response.status).toBe(400);
    });
  });

  describe("DELETE /tasks/:id", () => {
    test("deletes an existing task", async () => {
      const created = await request(app).post("/tasks").send({
        title: "Delete me",
      });

      const response = await request(app).delete(`/tasks/${created.body.id}`);

      expect(response.status).toBe(204);

      const list = await request(app).get("/tasks");

      expect(list.body).toHaveLength(0);
    });

    test("returns 404 for a missing task", async () => {
      const response = await request(app).delete("/tasks/invalid-id");

      expect(response.status).toBe(404);
    });
  });

  describe("PATCH /tasks/:id/complete", () => {
    test("completes a task", async () => {
      const created = await request(app).post("/tasks").send({
        title: "Complete me",
        priority: "high",
      });

      const response = await request(app).patch(
        `/tasks/${created.body.id}/complete`,
      );

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("done");
      expect(response.body.completedAt).toBeDefined();

      // Priority should remain unchanged.
      expect(response.body.priority).toBe("high");
    });

    test("returns 404 for a missing task", async () => {
      const response = await request(app).patch("/tasks/invalid-id/complete");

      expect(response.status).toBe(404);
    });
  });

  describe("GET /tasks/stats", () => {
    test("returns task statistics", async () => {
      await request(app).post("/tasks").send({
        title: "Todo",
      });

      await request(app).post("/tasks").send({
        title: "Progress",
        status: "in_progress",
      });

      await request(app).post("/tasks").send({
        title: "Done",
        status: "done",
      });

      const response = await request(app).get("/tasks/stats");

      expect(response.status).toBe(200);
      expect(response.body.todo).toBe(1);
      expect(response.body.in_progress).toBe(1);
      expect(response.body.done).toBe(1);
      expect(response.body.overdue).toBe(0);
    });

    test("returns zero counts when there are no tasks", async () => {
      const response = await request(app).get("/tasks/stats");

      expect(response.status).toBe(200);
      expect(response.body.todo).toBe(0);
      expect(response.body.in_progress).toBe(0);
      expect(response.body.done).toBe(0);
      expect(response.body.overdue).toBe(0);
    });
  });

  describe("PATCH /tasks/:id/assign", () => {
    test("assigns a task to a user", async () => {
      const created = await request(app).post("/tasks").send({
        title: "Assign me",
      });

      const response = await request(app)
        .patch(`/tasks/${created.body.id}/assign`)
        .send({
          assignee: "Alice",
        });

      expect(response.status).toBe(200);
      expect(response.body.assignee).toBe("Alice");
    });

    test("rejects an empty assignee", async () => {
      const created = await request(app).post("/tasks").send({
        title: "Assign me",
      });

      const response = await request(app)
        .patch(`/tasks/${created.body.id}/assign`)
        .send({
          assignee: "",
        });

      expect(response.status).toBe(400);
    });

    test("rejects a non-string assignee", async () => {
      const created = await request(app).post("/tasks").send({
        title: "Assign me",
      });

      const response = await request(app)
        .patch(`/tasks/${created.body.id}/assign`)
        .send({
          assignee: 123,
        });

      expect(response.status).toBe(400);
    });

    test("returns 404 when task does not exist", async () => {
      const response = await request(app)
        .patch("/tasks/invalid-id/assign")
        .send({
          assignee: "Alice",
        });

      expect(response.status).toBe(404);
    });

    test("returns 409 when task is already assigned", async () => {
      const created = await request(app).post("/tasks").send({
        title: "Already assigned",
      });

      await request(app).patch(`/tasks/${created.body.id}/assign`).send({
        assignee: "Alice",
      });

      const response = await request(app)
        .patch(`/tasks/${created.body.id}/assign`)
        .send({
          assignee: "Bob",
        });

      expect(response.status).toBe(409);
    });
  });
});
