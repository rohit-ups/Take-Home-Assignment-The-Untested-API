const taskService = require('../src/services/taskService');

describe("Task Service", () => {
  beforeEach(() => {
    taskService._reset();
  });

  it("should create a task with default values", () => {
    const task = taskService.create({ title: "Test task" });

    expect(task).toHaveProperty("id");
    expect(task.title).toBe("Test task");
    expect(task.status).toBe("todo");
    expect(task.priority).toBe("medium");
    expect(task.completedAt).toBeNull();
  });

  it("should return all created tasks", () => {
    taskService.create({ title: "Task 1" });
    taskService.create({ title: "Task 2" });

    const tasks = taskService.getAll();
    expect(tasks.length).toBe(2);
  });

  it("should return tasks for page 1 correctly", () => {
    taskService.create({ title: "Task 1" });

    const tasks = taskService.getPaginated(1, 10);
    expect(tasks.length).toBe(1);
  });

  it("should return empty array for non-existing page", () => {
    taskService.create({ title: "Task 1" });

    const tasks = taskService.getPaginated(2, 10);
    expect(tasks.length).toBe(0);
  });

  it("should find a task by id", () => {
    const created = taskService.create({ title: "Find me" });

    const found = taskService.findById(created.id);
    expect(found).toBeDefined();
    expect(found.title).toBe("Find me");
  });

  it("should return null for invalid id", () => {
    const found = taskService.findById("invalid-id");
    expect(found).toBeUndefined(); 
  });

  it("should delete a task", () => {
    const task = taskService.create({ title: "Delete me" });

    const result = taskService.remove(task.id);
    expect(result).toBe(true);
    expect(taskService.getAll().length).toBe(0);
  });

});