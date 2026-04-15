const taskService = require("../../src/services/taskService");

describe("taskService", () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe("create", () => {
    it("creates a task with defaults", () => {
      const task = taskService.create({ title: "Test task" });

      expect(task).toMatchObject({
        title: "Test task",
        description: "",
        status: "todo",
        priority: "medium",
        dueDate: null,
        assignee: null,
      });
      expect(task.id).toBeDefined();
      expect(task.createdAt).toBeDefined();
      expect(task.completedAt).toBeNull();
    });

    it("accepts valid optional fields", () => {
      const dueDate = new Date(Date.now() + 86400000).toISOString();
      const task = taskService.create({
        title: "Assigned task",
        description: "details",
        status: "in_progress",
        priority: "high",
        dueDate,
        assignee: "Alice",
      });

      expect(task).toMatchObject({
        title: "Assigned task",
        description: "details",
        status: "in_progress",
        priority: "high",
        dueDate,
        assignee: "Alice",
      });
    });
  });

  describe("update", () => {
    it("updates an existing task", () => {
      const task = taskService.create({ title: "Original" });
      const updated = taskService.update(task.id, {
        title: "Updated",
        priority: "high",
      });

      expect(updated).toMatchObject({ title: "Updated", priority: "high" });
      expect(updated.createdAt).toBe(task.createdAt);
    });

    it("returns null for non-existent task", () => {
      expect(taskService.update("missing-id", { title: "Nope" })).toBeNull();
    });
  });

  describe("remove", () => {
    it("removes a task by id", () => {
      const task = taskService.create({ title: "Delete me" });
      expect(taskService.remove(task.id)).toBe(true);
      expect(taskService.findById(task.id)).toBeUndefined();
    });

    it("returns false when task does not exist", () => {
      expect(taskService.remove("missing-id")).toBe(false);
    });
  });

  describe("getByStatus", () => {
    it("filters tasks by exact status", () => {
      const todo = taskService.create({ title: "Todo task" });
      const done = taskService.create({ title: "Done task", status: "done" });

      const result = taskService.getByStatus("todo");

      expect(result).toEqual([todo]);
      expect(result).not.toContain(done);
    });
  });

  describe("getPaginated", () => {
    it("returns the correct page of tasks", () => {
      const first = taskService.create({ title: "First" });
      const second = taskService.create({ title: "Second" });
      const third = taskService.create({ title: "Third" });

      // Expected: page 1 starts at offset 0, page 2 starts at offset limit.
      const page1 = taskService.getPaginated(1, 2);
      const page2 = taskService.getPaginated(2, 2);

      expect(page1).toEqual([first, second]);
      expect(page2).toEqual([third]);
    });

    it("returns an empty array for out-of-range pages", () => {
      taskService.create({ title: "Only task" });
      const page = taskService.getPaginated(2, 2);

      expect(page).toEqual([]);
    });
  });

  describe("getStats", () => {
    it("counts tasks by status and overdue tasks", () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString();
      const futureDate = new Date(Date.now() + 86400000).toISOString();

      taskService.create({ title: "Todo overdue", dueDate: pastDate });
      taskService.create({
        title: "In progress",
        status: "in_progress",
        dueDate: futureDate,
      });
      taskService.create({
        title: "Done task",
        status: "done",
        dueDate: pastDate,
      });

      expect(taskService.getStats()).toEqual({
        todo: 1,
        in_progress: 1,
        done: 1,
        overdue: 1,
      });
    });
  });

  describe("completeTask", () => {
    it("marks a task as done and sets completedAt", () => {
      const task = taskService.create({
        title: "Complete me",
        priority: "high",
      });
      const completed = taskService.completeTask(task.id);

      expect(completed).toMatchObject({ status: "done" });
      expect(completed.completedAt).toBeDefined();
      expect(completed.priority).toBe("medium");
    });

    it("returns null when completing a missing task", () => {
      expect(taskService.completeTask("bad-id")).toBeNull();
    });
  });

  describe("assignTask", () => {
    it("assigns an assignee to a task", () => {
      const task = taskService.create({ title: "Assign me" });
      const assigned = taskService.assignTask(task.id, "Dana");

      expect(assigned).toMatchObject({ assignee: "Dana" });
      expect(taskService.findById(task.id).assignee).toBe("Dana");
    });

    it("allows reassignment of an existing task", () => {
      const task = taskService.create({
        title: "Reassign me",
        assignee: "Bob",
      });
      const reassigned = taskService.assignTask(task.id, "Carol");

      expect(reassigned.assignee).toBe("Carol");
    });

    it("returns null for missing tasks", () => {
      expect(taskService.assignTask("missing-id", "Dana")).toBeNull();
    });
  });
});
