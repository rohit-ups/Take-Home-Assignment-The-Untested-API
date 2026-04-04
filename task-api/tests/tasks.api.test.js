const request = require("supertest");
const app = require("../src/app");
const taskService = require("../src/services/taskService");

describe("GET /tasks/stats", () => {
  beforeEach(() => {
    taskService._reset();
  });

  it("should return correct stats for an empty task list", async () => {
    const res = await request(app).get("/tasks/stats");
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ todo: 0, in_progress: 0, done: 0, overdue: 0 });
  });

  it("should count tasks correctly and overdue", async () => {
    const now = new Date();
    const past = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(); // yesterday
    const future = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(); // tomorrow

    taskService.create({ title: "Task 1", status: "todo", dueDate: past }); // overdue
    taskService.create({ title: "Task 2", status: "todo", dueDate: future }); // not overdue
    taskService.create({ title: "Task 3", status: "done" }); // done, should not count as overdue

    const res = await request(app).get("/tasks/stats");
    expect(res.statusCode).toBe(200);
    expect(res.body.todo).toBe(2);
    expect(res.body.in_progress).toBe(0);
    expect(res.body.done).toBe(1);
    expect(res.body.overdue).toBe(1); // only Task 1 is overdue
  });
});


describe("GET /tasks", () => {
  beforeEach(() => {
    taskService._reset();
  });

  it("should return only exact status matches", async () => {
    const t1 = taskService.create({ title: "Task 1", status: "todo" });
    const t2 = taskService.create({ title: "Task 2", status: "done" });

    const res = await request(app).get("/tasks").query({ status: "do" }); // partial
    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(0); // This will fail due to includes bug
  });

  it("should paginate tasks correctly (1-based page query)", async () => {
    const t1 = taskService.create({ title: "Task 1" });
    const t2 = taskService.create({ title: "Task 2" });
    const t3 = taskService.create({ title: "Task 3" });

    const res = await request(app).get("/tasks").query({ page: 1, limit: 2 });
    expect(res.statusCode).toBe(200);
    expect(res.body.map(t => t.id)).toEqual([t1.id, t2.id]); 
    // This will fail because getPaginated is 0-based, current route gives wrong tasks
  });

  it("should return all tasks if no query is provided", async () => {
    const t1 = taskService.create({ title: "Task 1" });
    const t2 = taskService.create({ title: "Task 2" });

    const res = await request(app).get("/tasks");
    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(2);
  });
});




describe("POST /tasks", () => {
  beforeEach(() => {
    taskService._reset(); // clear tasks before each test
  });

  it("should create a task successfully with all required fields", async () => {
    const res = await request(app)
      .post("/tasks")
      .send({ title: "New Task", description: "Test task" });

    expect(res.statusCode).toBe(201);
    expect(res.body.title).toBe("New Task");
    expect(res.body.description).toBe("Test task");
    expect(res.body.status).toBe("todo"); // default applied
    expect(res.body.priority).toBe("medium"); // default applied
    expect(res.body.id).toBeDefined();
    expect(res.body.createdAt).toBeDefined();
    expect(res.body.completedAt).toBeNull();
  });

  it("should fail if title is missing", async () => {
    const res = await request(app).post("/tasks").send({ description: "No title" });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it("should apply defaults for null/undefined status and priority", async () => {
    const res = await request(app)
      .post("/tasks")
      .send({ title: "Task 2", status: null, priority: undefined });

    expect(res.statusCode).toBe(201);
    // BUG detection: if taskService.create overwrites null/undefined with default
    expect(res.body.status).toBe(null);      // This will fail if service applies default incorrectly
    expect(res.body.priority).toBe(undefined); // Same here
  });
});


describe("PUT /tasks/:id", () => {
  beforeEach(() => {
    taskService._reset(); // clear tasks before each test
  });

  it("should update a task successfully", async () => {
    const task = taskService.create({ title: "Task 1", priority: "high" });

    const res = await request(app)
      .put(`/tasks/${task.id}`)
      .send({ title: "Updated Task", priority: "low" });

    expect(res.statusCode).toBe(200);
    expect(res.body.title).toBe("Updated Task");
    expect(res.body.priority).toBe("low");
    expect(res.body.id).toBe(task.id); // ensure ID is not changed
  });

  it("should return 404 for non-existent task", async () => {
    const res = await request(app).put("/tasks/nonexistent-id").send({ title: "Test" });
    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe("Task not found");
  });

  it("should return 400 for invalid update fields", async () => {
    const task = taskService.create({ title: "Task 2" });

    const res = await request(app).put(`/tasks/${task.id}`).send({ status: "invalid_status" });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it("should not allow id override (bug detection)", async () => {
    const task = taskService.create({ title: "Task 3" });

    const res = await request(app).put(`/tasks/${task.id}`).send({ id: "newId" });

    // BUG: taskService.update currently allows id to change
    expect(res.body.id).toBe(task.id); // This will fail, revealing the bug
  });

  it("should handle null values in updates correctly (bug detection)", async () => {
    const task = taskService.create({ title: "Task 4" });

    const res = await request(app).put(`/tasks/${task.id}`).send({ title: null });

    // BUG: taskService.update currently overwrites title with null
    expect(res.body.title).not.toBeNull(); // This will fail, revealing the bug
  });
});

describe("DELETE /tasks/:id", () => {
  beforeEach(() => {
    taskService._reset(); // clear tasks before each test
  });

  it("should delete a task successfully", async () => {
    const task = taskService.create({ title: "Task 1" });

    const res = await request(app).delete(`/tasks/${task.id}`);
    expect(res.statusCode).toBe(204);

    // Verify task is actually removed
    const allTasks = taskService.getAll();
    expect(allTasks.find(t => t.id === task.id)).toBeUndefined();
  });

  it("should return 404 for non-existent task", async () => {
    const res = await request(app).delete("/tasks/nonexistent-id");
    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe("Task not found");
  });
});


describe("PATCH /tasks/:id/complete", () => {
  beforeEach(() => {
    taskService._reset(); // clear tasks before each test
  });

  it("should mark a task as completed without changing its original priority", async () => {
    const task = taskService.create({ title: "Important Task", priority: "high" });

    const res = await request(app).patch(`/tasks/${task.id}/complete`);
    expect(res.statusCode).toBe(200);

    // Status should be done
    expect(res.body.status).toBe("done");

    // Priority should NOT be overwritten (this currently fails due to bug)
    expect(res.body.priority).toBe("high"); // <-- this will reveal the bug

    // completedAt should be set
    expect(res.body.completedAt).not.toBeNull();
  });

  it("should return 404 for non-existent task", async () => {
    const res = await request(app).patch("/tasks/nonexistent-id/complete");
    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe("Task not found");
  });
});



describe("PATCH /tasks/:id/assign", () => {

  let task;

  // Create a fresh task before each test
  beforeEach(() => {
    task = taskService.create({ title: "Test Task" });
  });

  it("should assign a task successfully", async () => {
    const res = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: "Alice" });

    expect(res.statusCode).toBe(200);
    expect(res.body.assignee).toBe("Alice");
  });

  it("should return 404 if task does not exist", async () => {
    const res = await request(app)
      .patch(`/tasks/nonexistent-id/assign`)
      .send({ assignee: "Bob" });

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe("Task not found");
  });

  it("should return 400 if assignee is empty string", async () => {
    const res = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: "" });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Assignee name must be a non-empty string");
  });

  it("should return 400 if assignee is missing", async () => {
    const res = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({});

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Assignee name must be a non-empty string");
  });

  it("should return 400 if task is already assigned", async () => {
    // First assignment
    await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: "Charlie" });

    // Second assignment attempt
    const res = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: "David" });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Task is already assigned");
  });

});