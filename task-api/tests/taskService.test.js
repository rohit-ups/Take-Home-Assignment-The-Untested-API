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

    test("should return undefined if task not found", () => {
      const task = taskService.findById("fake-id");

      expect(task).toBeUndefined();
    });

    test("should filter task by status", () => {
      taskService.create({
        title: "Task Done",
        status: "done",
      });

      const todoTask = taskService.create({
        title: "Task Todo",
      });

      const filterTasks = taskService.getByStatus("todo");

      expect(filterTasks.length).toBe(1);

      expect(filterTasks.every((t) => t.status === "todo")).toBe(true);

      expect(filterTasks[0].id).toBe(todoTask.id);
    });

    test("should not match partial status", () => {
      taskService.create({
        title: "Task Done",
      });

      const filterTasks = taskService.getByStatus("do");

      expect(filterTasks.length).toBe(0);
    });

    test("should paginate tasks", () => {
      for (let i = 0; i < 15; i++) {
        taskService.create({ title: "Task" + " " + (i + 1) });
      }

      const tasks = taskService.getPaginated(1, 10);

      expect(tasks.length).toBe(10);

      expect(tasks[0].title).toBe("Task 1");
    });

    test("should return second page", () => {
      for (let i = 0; i < 15; i++) {
        taskService.create({ title: "Task" + " " + (i + 1) });
      }

      const tasks = taskService.getPaginated(2, 10);

      expect(tasks.length).toBe(5);

      expect(tasks[0].title).toBe("Task 11");
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
        priority: "hight",
      });

      const completed = taskService.completeTask(task.id);

      expect(completed.id).toBe(task.id);

      expect(completed.title).toBe(task.title);

      expect(completed.priority).toBe(task.priority);

      expect(completed.status).toBe("done");

      expect(completed.completedAt).toBeTruthy();
    });

    test("should return null when marking complete missing task", () => {
      const result = taskService.completeTask("fake-id");

      expect(result).toBeNull();
    });
  });

  describe("Stats", () => {
    test("should return stats", () => {
      taskService.create({
        title: "Task Todo",
      });

      taskService.create({
        title: "Task InProgress",
        status: "in_progress",
      });

      taskService.create({
        title: "Task Done",
        status: "done",
      });

      taskService.create({
        title: "Over Due Task",
        dueDate: new Date(Date.now() - 1000).toISOString(),
      });

      const stats = taskService.getStats();

      expect(stats).toEqual({
        todo: 2,
        in_progress: 1,
        done: 1,
        overdue: 1,
      });
    });

    test("should return zero stats when no tasks", () => {
      const stats = taskService.getStats();

      expect(stats).toEqual({
        todo: 0,
        in_progress: 0,
        done: 0,
        overdue: 0,
      });
    });
  });

  describe("Assign", () => {
    test("should assign task", () => {
      const task = taskService.create({
        title: "Task",
      });

      const assignedTask = taskService.assignTask(task.id, "Ravinder");

      expect(assignedTask).toBeDefined();

      expect(assignedTask.assignee).toBe("Ravinder");

      expect(assignedTask.id).toBe(task.id);
    });

    test("should return null if task not found", () => {
      const result = taskService.assignTask("fake-id", "Ravinder");

      expect(result).toBeNull();
    });
  });
});
