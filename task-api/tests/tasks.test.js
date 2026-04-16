const request = require("supertest");
const app = require("../src/app");
const taskService = require("../src/services/taskService");
const {
  validateAssignTask,
  validateCreateTask,
  validateUpdateTask,
} = require("../src/utils/validators");

const createSeedTask = (overrides = {}) => {
  const suffix = Math.random().toString(16).slice(2, 8);
  return taskService.create({
    title: `Task ${suffix}`,
    description: "Seed task",
    status: "todo",
    priority: "medium",
    dueDate: null,
    ...overrides,
  });
};

describe("UNIT TESTS (taskService.js directly)", () => {
  beforeEach(() => {
    taskService._reset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("_reset()", () => {
    test("clears all tasks from the in-memory store", () => {
      createSeedTask({ title: "First" });
      createSeedTask({ title: "Second" });

      taskService._reset();

      expect(taskService.getAll()).toEqual([]);
    });

    test("keeps the store empty when called on an already empty store", () => {
      taskService._reset();

      expect(taskService.getAll()).toEqual([]);
    });

    test("is idempotent when called multiple times", () => {
      createSeedTask({ title: "Only" });

      taskService._reset();
      taskService._reset();

      expect(taskService.getAll()).toEqual([]);
    });
  });

  describe("create()", () => {
    test("creates a task with default values when optional fields are omitted", () => {
      const task = taskService.create({ title: "Write tests" });

      expect(task).toMatchObject({
        title: "Write tests",
        description: "",
        status: "todo",
        priority: "medium",
        dueDate: null,
        completedAt: null,
      });
      expect(task.id).toEqual(expect.any(String));
      expect(task.createdAt).toEqual(expect.any(String));
      expect(Number.isNaN(Date.parse(task.createdAt))).toBe(false);
    });

    test("creates a task using explicitly provided fields", () => {
      const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const task = taskService.create({
        title: "Plan sprint",
        description: "Create sprint plan",
        status: "in_progress",
        priority: "high",
        dueDate,
      });

      expect(task).toMatchObject({
        title: "Plan sprint",
        description: "Create sprint plan",
        status: "in_progress",
        priority: "high",
        dueDate,
      });
    });

    test("generates unique ids for consecutive tasks", () => {
      const first = taskService.create({ title: "A" });
      const second = taskService.create({ title: "B" });

      expect(first.id).not.toBe(second.id);
    });
  });

  describe("getAll()", () => {
    test("returns all tasks in insertion order", () => {
      const first = createSeedTask({ title: "First" });
      const second = createSeedTask({ title: "Second" });

      const all = taskService.getAll();

      expect(all).toHaveLength(2);
      expect(all[0].id).toBe(first.id);
      expect(all[1].id).toBe(second.id);
    });

    test("returns an empty array when no tasks exist", () => {
      expect(taskService.getAll()).toEqual([]);
    });

    test("does not allow mutation of internal collection via returned array operations", () => {
      createSeedTask({ title: "Immutable list check" });

      const tasks = taskService.getAll();
      tasks.pop();

      expect(taskService.getAll()).toHaveLength(1);
    });
  });

  describe("findById()", () => {
    test("returns the task when id exists", () => {
      const task = createSeedTask({ title: "Find me" });

      const found = taskService.findById(task.id);

      expect(found).toBeDefined();
      expect(found.id).toBe(task.id);
    });

    test("returns undefined for a non-existent id", () => {
      expect(taskService.findById("missing-id")).toBeUndefined();
    });

    test("returns undefined when store is empty", () => {
      taskService._reset();

      expect(taskService.findById("any-id")).toBeUndefined();
    });
  });

  describe("getByStatus()", () => {
    test("returns tasks that exactly match a valid status", () => {
      createSeedTask({ title: "Todo task", status: "todo" });
      createSeedTask({ title: "Done task", status: "done" });

      const filtered = taskService.getByStatus("todo");

      expect(filtered).toHaveLength(1);
      expect(filtered[0].status).toBe("todo");
    });

    test("returns an empty array when no tasks match the status", () => {
      createSeedTask({ status: "done" });

      const filtered = taskService.getByStatus("in_progress");

      expect(filtered).toEqual([]);
    });

    // Known bug: status filtering uses substring matching (includes) instead of exact matching.
    test("does not match partial status fragments", () => {
      createSeedTask({ status: "todo" });
      createSeedTask({ status: "done" });

      const filtered = taskService.getByStatus("do");

      expect(filtered).toEqual([]);
    });
  });

  describe("getPaginated()", () => {
    test("returns an empty array when requesting beyond available pages", () => {
      createSeedTask({ title: "One" });
      createSeedTask({ title: "Two" });

      const page = taskService.getPaginated(10, 5);

      expect(page).toEqual([]);
    });

    test("returns all tasks for page 0 when limit exceeds total tasks", () => {
      createSeedTask({ title: "One" });
      createSeedTask({ title: "Two" });

      const page = taskService.getPaginated(0, 10);

      expect(page).toHaveLength(2);
    });

    // Known bug: offset is computed as page * limit, so page=1 skips the first page.
    test("returns the first page of tasks when page=1 and limit=2", () => {
      const created = [
        createSeedTask({ title: "T1" }),
        createSeedTask({ title: "T2" }),
        createSeedTask({ title: "T3" }),
      ];

      const page = taskService.getPaginated(1, 2);

      expect(page.map((t) => t.id)).toEqual([created[0].id, created[1].id]);
    });
  });

  describe("getStats()", () => {
    test("returns correct counts by status on happy path", () => {
      createSeedTask({ status: "todo" });
      createSeedTask({ status: "in_progress" });
      createSeedTask({ status: "done" });

      const stats = taskService.getStats();

      expect(stats).toEqual({
        todo: 1,
        in_progress: 1,
        done: 1,
        overdue: 0,
      });
    });

    test("returns zero counts when there are no tasks", () => {
      const stats = taskService.getStats();

      expect(stats).toEqual({
        todo: 0,
        in_progress: 0,
        done: 0,
        overdue: 0,
      });
    });

    test("counts overdue tasks only when dueDate is in the past and task is not done", () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      createSeedTask({ status: "todo", dueDate: pastDate });
      createSeedTask({ status: "done", dueDate: pastDate });

      const stats = taskService.getStats();

      expect(stats.overdue).toBe(1);
    });

    test("ignores unknown status values in count buckets", () => {
      createSeedTask({ status: "archived" });

      const stats = taskService.getStats();

      expect(stats.todo).toBe(0);
      expect(stats.in_progress).toBe(0);
      expect(stats.done).toBe(0);
    });
  });

  describe("update()", () => {
    test("updates provided fields and preserves unspecified fields", () => {
      const task = createSeedTask({
        title: "Original",
        description: "Original description",
        priority: "low",
      });

      const updated = taskService.update(task.id, { title: "Updated title" });

      expect(updated.title).toBe("Updated title");
      expect(updated.description).toBe("Original description");
      expect(updated.priority).toBe("low");
    });

    test("returns null for a non-existent id", () => {
      const result = taskService.update("missing-id", { title: "Nope" });

      expect(result).toBeNull();
    });

    // Known bug: update allows immutable/system fields like createdAt to be overwritten.
    test("does not allow createdAt to be overwritten by client updates", () => {
      const task = createSeedTask({ title: "Immutable field check" });
      const originalCreatedAt = task.createdAt;

      const updated = taskService.update(task.id, {
        createdAt: "2000-01-01T00:00:00.000Z",
      });

      expect(updated.createdAt).toBe(originalCreatedAt);
    });
  });

  describe("remove()", () => {
    test("removes an existing task and returns true", () => {
      const task = createSeedTask({ title: "Delete me" });

      const removed = taskService.remove(task.id);

      expect(removed).toBe(true);
      expect(taskService.findById(task.id)).toBeUndefined();
    });

    test("returns false when trying to remove a non-existent task", () => {
      expect(taskService.remove("missing-id")).toBe(false);
    });

    test("returns true on first removal and false on second removal for same id", () => {
      const task = createSeedTask({ title: "Remove twice" });

      const firstRemoval = taskService.remove(task.id);
      const secondRemoval = taskService.remove(task.id);

      expect(firstRemoval).toBe(true);
      expect(secondRemoval).toBe(false);
    });
  });

  describe("completeTask()", () => {
    test("marks a task as done and sets completedAt timestamp", () => {
      const task = createSeedTask({ status: "todo" });

      const completed = taskService.completeTask(task.id);

      expect(completed.status).toBe("done");
      expect(completed.completedAt).toEqual(expect.any(String));
      expect(Number.isNaN(Date.parse(completed.completedAt))).toBe(false);
    });

    test("returns null for a non-existent id", () => {
      expect(taskService.completeTask("missing-id")).toBeNull();
    });

    // Known bug: completing a task overwrites existing priority with medium.
    test("preserves existing priority when completing a task", () => {
      const task = createSeedTask({ priority: "high" });

      const completed = taskService.completeTask(task.id);

      expect(completed.priority).toBe("high");
    });

    // Known bug: re-completing a task rewrites completedAt instead of keeping first completion timestamp.
    test("does not change completedAt when task is already completed", () => {
      jest.useFakeTimers();
      const task = createSeedTask({ status: "todo" });

      jest.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
      const first = taskService.completeTask(task.id);

      jest.setSystemTime(new Date("2026-01-02T00:00:00.000Z"));
      const second = taskService.completeTask(task.id);

      expect(second.completedAt).toBe(first.completedAt);
    });
  });
});

describe("UNIT TESTS (validators.js directly)", () => {
  test("validateCreateTask rejects invalid status values", () => {
    const error = validateCreateTask({
      title: "Task",
      status: "pending",
    });

    expect(error).toBe("status must be one of: todo, in_progress, done");
  });

  test("validateUpdateTask rejects invalid dueDate values", () => {
    const error = validateUpdateTask({ dueDate: "not-a-date" });

    expect(error).toBe("dueDate must be a valid ISO date string");
  });

  test("validateUpdateTask rejects empty title values", () => {
    const error = validateUpdateTask({ title: "   " });

    expect(error).toBe("title must be a non-empty string");
  });

  test("validateUpdateTask rejects invalid status values", () => {
    const error = validateUpdateTask({ status: "pending" });

    expect(error).toBe("status must be one of: todo, in_progress, done");
  });

  test("validateUpdateTask rejects invalid priority values", () => {
    const error = validateUpdateTask({ priority: "urgent" });

    expect(error).toBe("priority must be one of: low, medium, high");
  });

  test("validateAssignTask rejects null body", () => {
    expect(validateAssignTask(null)).toBe("Request body is required");
  });

  test("validateAssignTask rejects undefined assignee", () => {
    expect(validateAssignTask({})).toBe("assignee is required");
  });

  test("validateAssignTask rejects non-string assignee", () => {
    expect(validateAssignTask({ assignee: 42 })).toBe(
      "assignee must be a string",
    );
  });

  test("validateAssignTask rejects empty string assignee", () => {
    expect(validateAssignTask({ assignee: "" })).toBe(
      "assignee cannot be empty or whitespace",
    );
  });

  test("validateAssignTask rejects whitespace-only assignee", () => {
    expect(validateAssignTask({ assignee: "   \t\n" })).toBe(
      "assignee cannot be empty or whitespace",
    );
  });

  test("validateAssignTask rejects assignee longer than 100 chars", () => {
    const tooLong = "a".repeat(101);

    expect(validateAssignTask({ assignee: tooLong })).toBe(
      "assignee name cannot exceed 100 characters",
    );
  });

  test("validateAssignTask returns null for a valid assignee", () => {
    expect(validateAssignTask({ assignee: "  Alice  " })).toBeNull();
  });
});

describe("UNIT TESTS (app bootstrap)", () => {
  test("startServer listens on provided port and logs startup message", () => {
    const listenSpy = jest
      .spyOn(app, "listen")
      .mockImplementation((port, callback) => {
        if (callback) callback();
        return { close: jest.fn() };
      });

    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    app.startServer(4321);

    expect(listenSpy).toHaveBeenCalledWith(4321, expect.any(Function));
    expect(logSpy).toHaveBeenCalledWith("Task API running on port 4321");

    logSpy.mockRestore();
    listenSpy.mockRestore();
  });
});

describe("INTEGRATION TESTS (API routes via Supertest)", () => {
  beforeEach(() => {
    taskService._reset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("GET /tasks", () => {
    test("returns all tasks on happy path", async () => {
      createSeedTask({ title: "A" });
      createSeedTask({ title: "B" });

      const response = await request(app).get("/tasks");

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
    });

    test("returns tasks filtered by status query", async () => {
      createSeedTask({ title: "Todo task", status: "todo" });
      createSeedTask({ title: "Done task", status: "done" });

      const response = await request(app)
        .get("/tasks")
        .query({ status: "todo" });

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].status).toBe("todo");
    });

    // Known bug: pagination branch uses incorrect offset and skips first page records.
    test("returns first page when using pagination query params", async () => {
      const created = [
        createSeedTask({ title: "T1" }),
        createSeedTask({ title: "T2" }),
        createSeedTask({ title: "T3" }),
      ];

      const response = await request(app)
        .get("/tasks")
        .query({ page: 1, limit: 2 });

      expect(response.status).toBe(200);
      expect(response.body.map((t) => t.id)).toEqual([
        created[0].id,
        created[1].id,
      ]);
    });

    // Known bug: invalid status values are not validated and currently return 200.
    test("returns 400 for invalid status filter value", async () => {
      const response = await request(app)
        .get("/tasks")
        .query({ status: "pending" });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    // Known bug: invalid page values are silently coerced instead of rejected.
    test("returns 400 for invalid page query value", async () => {
      const response = await request(app)
        .get("/tasks")
        .query({ page: "abc", limit: 10 });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    // Known bug: invalid limit values are silently coerced instead of rejected.
    test("returns 400 for invalid limit query value", async () => {
      const response = await request(app)
        .get("/tasks")
        .query({ page: 1, limit: 0 });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("POST /tasks", () => {
    test("creates a task on happy path", async () => {
      const response = await request(app)
        .post("/tasks")
        .send({ title: "Write tests", priority: "high" });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        title: "Write tests",
        priority: "high",
        status: "todo",
      });
      expect(response.body.id).toEqual(expect.any(String));
    });

    test("returns 400 when title is missing", async () => {
      const response = await request(app)
        .post("/tasks")
        .send({ priority: "high" });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    test("returns 400 when priority is invalid", async () => {
      const response = await request(app)
        .post("/tasks")
        .send({ title: "Task", priority: "urgent" });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/priority/i);
    });

    test("returns 400 when dueDate format is invalid", async () => {
      const response = await request(app)
        .post("/tasks")
        .send({ title: "Task", dueDate: "not-an-iso-date" });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/dueDate/i);
    });

    test("returns 500 when body is JSON null and validator throws", async () => {
      const response = await request(app)
        .post("/tasks")
        .set("Content-Type", "application/json")
        .send("null");

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: "Internal server error" });
    });
  });

  describe("PUT /tasks/:id", () => {
    test("updates a task on happy path", async () => {
      const task = createSeedTask({ title: "Before update", priority: "low" });

      const response = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ title: "After update", priority: "high" });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: task.id,
        title: "After update",
        priority: "high",
      });
    });

    test("returns 404 for non-existent task id", async () => {
      const response = await request(app)
        .put("/tasks/does-not-exist")
        .send({ title: "No task here" });

      expect(response.status).toBe(404);
      expect(response.body.error).toMatch(/not found/i);
    });

    test("returns 400 when update payload has invalid dueDate", async () => {
      const task = createSeedTask({ title: "Needs valid dueDate" });

      const response = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ dueDate: "not-a-date" });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/dueDate/i);
    });

    // Known bug: empty update payload is currently accepted instead of rejected.
    test("returns 400 when required update fields are missing", async () => {
      const task = createSeedTask({ title: "Needs update fields" });

      const response = await request(app).put(`/tasks/${task.id}`).send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("DELETE /tasks/:id", () => {
    test("deletes a task and returns 204 with no body", async () => {
      const task = createSeedTask({ title: "Delete me" });

      const response = await request(app).delete(`/tasks/${task.id}`);

      expect(response.status).toBe(204);
      expect(response.text).toBe("");
      expect(taskService.findById(task.id)).toBeUndefined();
    });

    test("returns 404 for non-existent task id", async () => {
      const response = await request(app).delete("/tasks/not-found-id");

      expect(response.status).toBe(404);
      expect(response.body.error).toMatch(/not found/i);
    });
  });

  describe("PATCH /tasks/:id/complete", () => {
    test("marks task complete on happy path", async () => {
      const task = createSeedTask({ status: "todo", priority: "high" });

      const response = await request(app).patch(`/tasks/${task.id}/complete`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("done");
      expect(response.body.completedAt).toEqual(expect.any(String));
      expect(Number.isNaN(Date.parse(response.body.completedAt))).toBe(false);
    });

    // Known bug: completing an already completed task rewrites completedAt.
    test("does not rewrite completedAt when task is already completed", async () => {
      const task = createSeedTask({ status: "todo" });

      const first = await request(app).patch(`/tasks/${task.id}/complete`);
      await new Promise((resolve) => setTimeout(resolve, 10));
      const second = await request(app).patch(`/tasks/${task.id}/complete`);

      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
      expect(second.body.completedAt).toBe(first.body.completedAt);
    });

    test("returns 404 for non-existent task id", async () => {
      const response = await request(app).patch("/tasks/not-found-id/complete");

      expect(response.status).toBe(404);
      expect(response.body.error).toMatch(/not found/i);
    });
  });

  describe("GET /tasks/stats", () => {
    test("returns status counts on happy path", async () => {
      createSeedTask({ status: "todo" });
      createSeedTask({ status: "in_progress" });
      createSeedTask({ status: "done" });

      const response = await request(app).get("/tasks/stats");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        todo: 1,
        in_progress: 1,
        done: 1,
        overdue: 0,
      });
    });

    test("includes overdue count when overdue tasks are present", async () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      createSeedTask({ status: "todo", dueDate: pastDate });
      createSeedTask({ status: "done", dueDate: pastDate });

      const response = await request(app).get("/tasks/stats");

      expect(response.status).toBe(200);
      expect(response.body.overdue).toBe(1);
    });
  });

  describe("PATCH /tasks/:id/assign", () => {
    // TDD: endpoint does not exist yet; these tests define required behavior first.
    test("assigns a task to a user on happy path", async () => {
      const task = createSeedTask({ title: "Assignable task" });

      const response = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: "Alice" });

      expect(response.status).toBe(200);
      expect(response.body.assignee).toBe("Alice");
      expect(response.body.id).toBe(task.id);
    });

    // TDD: validation behavior expected once endpoint is implemented.
    test("returns 400 when assignee is an empty string", async () => {
      const task = createSeedTask({ title: "Validation task" });

      const response = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: "" });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    test("returns 404 when assigning a non-existent task", async () => {
      const response = await request(app)
        .patch("/tasks/missing-id/assign")
        .send({ assignee: "Bob" });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error");
    });

    test("reassigns task when it is already assigned", async () => {
      const task = createSeedTask({ title: "Already assigned task" });
      taskService.update(task.id, { assignee: "Eve" });

      const response = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: "Mallory" });

      expect(response.status).toBe(200);
      expect(response.body.assignee).toBe("Mallory");
      expect(response.body.id).toBe(task.id);
    });
  });
});
