const taskService = require("../../src/services/taskService");

beforeEach(() => {
  taskService._reset();
});

describe("Task Service - Unit Tests", () => {

  // CREATE
  describe("create()", () => {
    test("should create task with defaults", () => {
      const task = taskService.create({ title: "Test" });

      expect(task).toHaveProperty("id");
      expect(task.status).toBe("todo");
      expect(task.priority).toBe("medium");
    });
  });

  // PAGINATION
  describe("getPaginated()", () => {
    test("should return correct page", () => {
      for (let i = 1; i <= 15; i++) {
        taskService.create({ title: `Task ${i}` });
      }

      const result = taskService.getPaginated(1, 10);
      expect(result.length).toBe(10);
    });

    test("should return empty array for out-of-range page", () => {
      for (let i = 1; i <= 5; i++) {
        taskService.create({ title: `Task ${i}` });
      }

      const result = taskService.getPaginated(5, 10);
      expect(result).toEqual([]);
    });
  });

  // STATUS FILTER
  describe("getByStatus()", () => {
    test("should return tasks by status", () => {
      taskService.create({ title: "A", status: "todo" });
      taskService.create({ title: "B", status: "done" });

      const result = taskService.getByStatus("done");

      expect(result.length).toBe(1);
      expect(result[0].status).toBe("done");
    });
  });

  // UPDATE
  describe("update()", () => {
    test("should update existing task", () => {
      const task = taskService.create({ title: "Old" });

      const updated = taskService.update(task.id, { title: "New" });

      expect(updated.title).toBe("New");
    });

    test("should return null if task not found", () => {
      const result = taskService.update("invalid-id", { title: "X" });

      expect(result).toBeNull();
    });
  });

  // DELETE
  describe("remove()", () => {
    test("should delete task", () => {
      const task = taskService.create({ title: "Delete me" });

      const result = taskService.remove(task.id);

      expect(result).toBe(true);
    });

    test("should return false if task not found", () => {
      const result = taskService.remove("invalid-id");

      expect(result).toBe(false);
    });
  });

  // COMPLETE TASK
  describe("completeTask()", () => {
    test("should mark task as done without changing priority", () => {
      const task = taskService.create({
        title: "Test",
        priority: "high",
      });

      const updated = taskService.completeTask(task.id);

      expect(updated.status).toBe("done");
      expect(updated.priority).toBe("high");
      expect(updated.completedAt).not.toBeNull();
    });

    test("should return null if task not found", () => {
      const result = taskService.completeTask("invalid-id");
      expect(result).toBeNull();
    });
  });

  // STATS
  describe("getStats()", () => {
    test("should return correct stats", () => {
      taskService.create({ title: "A", status: "todo" });
      taskService.create({ title: "B", status: "done" });

      const stats = taskService.getStats();

      expect(stats.todo).toBe(1);
      expect(stats.done).toBe(1);
      expect(stats.in_progress).toBe(0);
    });
  });

});