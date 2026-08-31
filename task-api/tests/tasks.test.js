const request = require("supertest");
const app = require("../src/app");

const taskService = require("../src/services/taskService");

beforeEach(() => {
  taskService._reset();
});

describe("GET /tasks", () => {
    test("should return an empty array when there are no tasks", async () => {
      const response = await request(app)
        .get("/tasks");
  
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });
  });

  test("should return all tasks", async () => {
    taskService.create({
      title: "Task 1"
    });
  
    taskService.create({
      title: "Task 2"
    });
  
    const response = await request(app)
      .get("/tasks");
  
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(response.body[0].title).toBe("Task 1");
    expect(response.body[1].title).toBe("Task 2");
  });

  describe("GET /tasks?status=", () => {
    test("should return tasks matching the requested status", async () => {
      taskService.create({
        title: "Todo task",
        status: "todo"
      });
  
      taskService.create({
        title: "Done task",
        status: "done"
      });
  
      const response = await request(app)
        .get("/tasks?status=todo");
  
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].title).toBe("Todo task");
      expect(response.body[0].status).toBe("todo");
    });
  
    test("should return an empty array when no tasks match", async () => {
      taskService.create({
        title: "Todo task",
        status: "todo"
      });
  
      const response = await request(app)
        .get("/tasks?status=done");
  
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);

      test("should not match a partial status through the API", async () => {
        taskService.create({
          title: "In progress task",
          status: "in_progress"
        });
      
        const response = await request(app)
          .get("/tasks?status=progress");
      
        expect(response.status).toBe(200);
        expect(response.body).toEqual([]);
      });

      
    });
  });

  describe("GET /tasks?page=&limit=", () => {
    test("should return the requested page of tasks", async () => {
      taskService.create({ title: "Task 1" });
      taskService.create({ title: "Task 2" });
      taskService.create({ title: "Task 3" });
  
      const response = await request(app)
        .get("/tasks?page=1&limit=2");
  
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].title).toBe("Task 1");
      expect(response.body[1].title).toBe("Task 2");
    });
  
    test("should return an empty array when the requested page has no tasks", async () => {
      taskService.create({ title: "Task 1" });
  
      const response = await request(app)
        .get("/tasks?page=5&limit=2");
  
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });
  });

  describe("POST /tasks", () => {
    test("should create a new task", async () => {
      const response = await request(app)
        .post("/tasks")
        .send({
          title: "Write tests",
          description: "Complete the internship assignment",
          priority: "high"
        });
  
      expect(response.status).toBe(201);
      expect(response.body.title).toBe("Write tests");
      expect(response.body.description).toBe(
        "Complete the internship assignment"
      );
      expect(response.body.priority).toBe("high");
      expect(response.body.status).toBe("todo");
      expect(response.body.id).toBeDefined();
      expect(response.body.createdAt).toBeDefined();
    });
  
    test("should reject a task without a title", async () => {
      const response = await request(app)
        .post("/tasks")
        .send({
          priority: "high"
        });
  
      expect(response.status).toBe(400);
      expect(response.body.error).toBe(
        "title is required and must be a non-empty string"
      );
    });
  
    test("should reject an invalid priority", async () => {
      const response = await request(app)
        .post("/tasks")
        .send({
          title: "Invalid task",
          priority: "urgent"
        });
  
      expect(response.status).toBe(400);
      expect(response.body.error).toContain(
        "priority must be one of"
      );
    });
  });

  describe("PUT /tasks/:id", () => {
    test("should update an existing task", async () => {
      const createResponse = await request(app)
        .post("/tasks")
        .send({
          title: "Original title",
          priority: "low"
        });
  
      const taskId = createResponse.body.id;
  
      const response = await request(app)
        .put(`/tasks/${taskId}`)
        .send({
          title: "Updated title",
          priority: "high"
        });
  
      expect(response.status).toBe(200);
      expect(response.body.id).toBe(taskId);
      expect(response.body.title).toBe("Updated title");
      expect(response.body.priority).toBe("high");
      expect(response.body.status).toBe("todo");
    });
  
    test("should return 404 when the task does not exist", async () => {
      const response = await request(app)
        .put("/tasks/non-existent-id")
        .send({
          title: "Updated title"
        });
  
      expect(response.status).toBe(404);
      expect(response.body.error).toBe("Task not found");
    });
  
    test("should return 400 for an invalid update", async () => {
      const createResponse = await request(app)
        .post("/tasks")
        .send({
          title: "Original task"
        });
  
      const taskId = createResponse.body.id;
  
      const response = await request(app)
        .put(`/tasks/${taskId}`)
        .send({
          priority: "urgent"
        });
  
      expect(response.status).toBe(400);
      expect(response.body.error).toContain(
        "priority must be one of"
      );
    });
  });

  describe("DELETE /tasks/:id", () => {
    test("should delete an existing task", async () => {
      const createResponse = await request(app)
        .post("/tasks")
        .send({
          title: "Task to delete"
        });
  
      const taskId = createResponse.body.id;
  
      const response = await request(app)
        .delete(`/tasks/${taskId}`);
  
      expect(response.status).toBe(204);
  
      const getResponse = await request(app)
        .get("/tasks");
  
      expect(getResponse.body).toHaveLength(0);
    });
  
    test("should return 404 when the task does not exist", async () => {
      const response = await request(app)
        .delete("/tasks/non-existent-id");
  
      expect(response.status).toBe(404);
      expect(response.body.error).toBe("Task not found");
    });
  });

  describe("PATCH /tasks/:id/complete", () => {
    test("should mark an existing task as completed", async () => {
      const createResponse = await request(app)
        .post("/tasks")
        .send({
          title: "Complete this task",
          priority: "high"
        });
  
      const taskId = createResponse.body.id;
  
      const response = await request(app)
        .patch(`/tasks/${taskId}/complete`);
  
      expect(response.status).toBe(200);
      expect(response.body.id).toBe(taskId);
      expect(response.body.status).toBe("done");
      expect(response.body.completedAt).toBeDefined();
    });
  
    test("should return 404 when the task does not exist", async () => {
      const response = await request(app)
        .patch("/tasks/non-existent-id/complete");
  
      expect(response.status).toBe(404);
      expect(response.body.error).toBe("Task not found");
    });
  
    test("should preserve the task priority when completing it", async () => {
      const createResponse = await request(app)
        .post("/tasks")
        .send({
          title: "Important task",
          priority: "high"
        });
  
      const taskId = createResponse.body.id;
  
      const response = await request(app)
        .patch(`/tasks/${taskId}/complete`);
  
      expect(response.status).toBe(200);
      expect(response.body.priority).toBe("high");
    });
  });

  describe("GET /tasks/stats", () => {
    test("should return task statistics", async () => {
      taskService.create({
        title: "Todo task",
        status: "todo"
      });
  
      taskService.create({
        title: "In progress task",
        status: "in_progress"
      });
  
      taskService.create({
        title: "Done task",
        status: "done"
      });
  
      const response = await request(app)
        .get("/tasks/stats");
  
      expect(response.status).toBe(200);
      expect(response.body.todo).toBe(1);
      expect(response.body.in_progress).toBe(1);
      expect(response.body.done).toBe(1);
      expect(response.body.overdue).toBe(0);
    });
  
    test("should count an overdue unfinished task", async () => {
      taskService.create({
        title: "Overdue task",
        status: "todo",
        dueDate: "2020-01-01T00:00:00.000Z"
      });
  
      const response = await request(app)
        .get("/tasks/stats");
  
      expect(response.status).toBe(200);
      expect(response.body.overdue).toBe(1);
    });
  });

  describe("PATCH /tasks/:id/assign", () => {
    test("should assign a task to a user", async () => {
      const createResponse = await request(app)
        .post("/tasks")
        .send({
          title: "Task to assign"
        });
  
      const taskId = createResponse.body.id;
  
      const response = await request(app)
        .patch(`/tasks/${taskId}/assign`)
        .send({
          assignee: "Yash"
        });
  
      expect(response.status).toBe(200);
      expect(response.body.id).toBe(taskId);
      expect(response.body.assignee).toBe("Yash");
      expect(response.body.title).toBe("Task to assign");
    });
  
    test("should return 404 when the task does not exist", async () => {
      const response = await request(app)
        .patch("/tasks/non-existent-id/assign")
        .send({
          assignee: "Yash"
        });
  
      expect(response.status).toBe(404);
      expect(response.body.error).toBe("Task not found");
    });
  
    test("should reject a missing assignee", async () => {
      const createResponse = await request(app)
        .post("/tasks")
        .send({
          title: "Task to assign"
        });
  
      const taskId = createResponse.body.id;
  
      const response = await request(app)
        .patch(`/tasks/${taskId}/assign`)
        .send({});
  
      expect(response.status).toBe(400);
      expect(response.body.error).toBe(
        "assignee is required and must be a non-empty string"
      );
    });
  
    test("should reject an empty assignee", async () => {
      const createResponse = await request(app)
        .post("/tasks")
        .send({
          title: "Task to assign"
        });
  
      const taskId = createResponse.body.id;
  
      const response = await request(app)
        .patch(`/tasks/${taskId}/assign`)
        .send({
          assignee: "   "
        });
  
      expect(response.status).toBe(400);
      expect(response.body.error).toBe(
        "assignee is required and must be a non-empty string"
      );
    });
  
    test("should reject a non-string assignee", async () => {
      const createResponse = await request(app)
        .post("/tasks")
        .send({
          title: "Task to assign"
        });
  
      const taskId = createResponse.body.id;
  
      const response = await request(app)
        .patch(`/tasks/${taskId}/assign`)
        .send({
          assignee: 123
        });
  
      expect(response.status).toBe(400);
      expect(response.body.error).toBe(
        "assignee is required and must be a non-empty string"
      );
    });
  
    test("should reject assigning an already assigned task", async () => {
      const createResponse = await request(app)
        .post("/tasks")
        .send({
          title: "Already assigned task"
        });
  
      const taskId = createResponse.body.id;
  
      await request(app)
        .patch(`/tasks/${taskId}/assign`)
        .send({
          assignee: "Yash"
        });
  
      const response = await request(app)
        .patch(`/tasks/${taskId}/assign`)
        .send({
          assignee: "Rahul"
        });
  
      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Task is already assigned");
    });
  });