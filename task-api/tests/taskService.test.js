const taskService = require("../src/services/taskService");

describe("Task Service", () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe("Create", () => {
    test("should create task", () => {
      const task = taskService.create({
        title: "Test Task",
      });

      expect(task.title).toBe("Test Task");

      expect(task.status).toBe("todo");

      expect(task.id).toBeDefined();
    });
  });

  describe("Query", () => {
    test("should return all tasks", () => {
      taskService.create({
        title: "Task 1",
      });

      taskService.create({
        title: "Task 2",
      });

      const tasks = taskService.getAll();

      expect(tasks.length).toBe(2);
    });

    test("should return task by ID", () => {
      const newTask = taskService.create({ title: "Task" });

      const task = taskService.findById(newTask.id);

      expect(task).toBeDefined();

      expect(task.title).toBe(newTask.title);

      expect(task.id).toBe(newTask.id);
    });
  });

  describe("Update", () => {
    test("should update task", () => {
      const task = taskService.create({
        title: "Old",
      });

      const updated = taskService.update(task.id, { title: "New" });

      expect(updated.title).toBe("New");
    });

    test("should return null if task not found", () => {
      const result = taskService.update("fake-id", { title: "X" });

      expect(result).toBeNull();
    });
  });

  describe("Delete", () => {
    test("should delete task", () => {
      const task = taskService.create({
        title: "Delete",
      });

      const deleted = taskService.remove(task.id);

      expect(deleted).toBe(true);

      expect(taskService.getAll().length).toBe(0);
    });
  });

  describe("Complete", () => {
    test("should mark task complete", () => {
      const task = taskService.create({
        title: "Finish",
      });

      const completed = taskService.completeTask(task.id);

      expect(completed.status).toBe("done");

      expect(completed.completedAt).toBeDefined();
    });
  });

  describe("Stats", () => {});
});
