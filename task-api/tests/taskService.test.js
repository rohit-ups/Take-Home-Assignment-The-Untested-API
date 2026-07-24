const taskService = require("../src/services/taskService");

describe("Task Service", () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe("create()", () => {
    test("should create a task with default values", () => {
      const task = taskService.create({
        title: "Learn Jest",
      });

      expect(task.id).toBeDefined();
      expect(task.title).toBe("Learn Jest");
      expect(task.status).toBe("todo");
      expect(task.priority).toBe("medium");
      expect(task.createdAt).toBeDefined();
      expect(task.completedAt).toBeNull();
    });

    test("should create task with custom values", () => {
      const task = taskService.create({
        title: "API",
        status: "in_progress",
        priority: "high",
      });

      expect(task.status).toBe("in_progress");
      expect(task.priority).toBe("high");
    });
  });

  describe("getAll()", () => {
    test("returns all tasks", () => {
      taskService.create({ title: "One" });
      taskService.create({ title: "Two" });

      expect(taskService.getAll()).toHaveLength(2);
    });
  });

  describe("findById()", () => {
    test("finds existing task", () => {
      const task = taskService.create({ title: "Test" });

      expect(taskService.findById(task.id)).toEqual(task);
    });

    test("returns undefined for missing task", () => {
      expect(taskService.findById("abc")).toBeUndefined();
    });
  });

  describe("getByStatus()", () => {
    test("filters by status", () => {
      taskService.create({ title: "A", status: "todo" });
      taskService.create({ title: "B", status: "done" });

      const tasks = taskService.getByStatus("done");

      expect(tasks).toHaveLength(1);
      expect(tasks[0].status).toBe("done");
    });
  });

  describe("update()", () => {
    test("updates task", () => {
      const task = taskService.create({ title: "Old" });

      const updated = taskService.update(task.id, {
        title: "New",
      });

      expect(updated.title).toBe("New");
    });

    test("returns null for invalid id", () => {
      expect(taskService.update("bad-id", {})).toBeNull();
    });
  });

  describe("remove()", () => {
    test("removes task", () => {
      const task = taskService.create({
        title: "Delete me",
      });

      expect(taskService.remove(task.id)).toBe(true);
      expect(taskService.getAll()).toHaveLength(0);
    });

    test("returns false for missing task", () => {
      expect(taskService.remove("bad")).toBe(false);
    });
  });

  describe("completeTask()", () => {
    test("marks task complete", () => {
      const task = taskService.create({
        title: "Finish",
      });

      const completed = taskService.completeTask(task.id);

      expect(completed.status).toBe("done");
      expect(completed.completedAt).not.toBeNull();
    });

    test("returns null for invalid id", () => {
      expect(taskService.completeTask("bad")).toBeNull();
    });
  });

  describe("getStats()", () => {
    test("counts tasks correctly", () => {
      taskService.create({
        title: "A",
        status: "todo",
      });

      taskService.create({
        title: "B",
        status: "done",
      });

      const stats = taskService.getStats();

      expect(stats.todo).toBe(1);
      expect(stats.done).toBe(1);
      expect(stats.in_progress).toBe(0);
    });
  });

  describe("getPaginated()", () => {
    test("returns first page", () => {
      taskService.create({ title: "1" });
      taskService.create({ title: "2" });
      taskService.create({ title: "3" });

      const tasks = taskService.getPaginated(1, 2);

      expect(tasks).toHaveLength(2);
    });
  });
    //pagination bug
    test("page 1 should return first two tasks", () => {
    taskService.create({ title: "A" });
    taskService.create({ title: "B" });
    taskService.create({ title: "C" });

    const tasks = taskService.getPaginated(1, 2);

    expect(tasks[0].title).toBe("A");
    expect(tasks[1].title).toBe("B");
    });
    //priority should not change when completing a task
    test("completing a task should not change priority", () => {
    const task = taskService.create({
        title: "API",
        priority: "high",
    });

    const completed = taskService.completeTask(task.id);

    expect(completed.priority).toBe("high");
    });
    describe("assignTask()", () => {

  test("assigns a user", () => {

    const task = taskService.create({
      title: "API",
    });

    const updated = taskService.assignTask(
      task.id,
      "Alice"
    );

    expect(updated.assignee).toBe("Alice");

  });

  test("returns null for invalid id", () => {

    expect(
      taskService.assignTask("bad-id", "Alice")
    ).toBeNull();

  });

});
    
});