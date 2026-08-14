const taskService = require("../src/services/taskService");

describe("Task Service", () => {
  beforeEach(() => {
    taskService._reset();
  });

  test("creates a task with default values", () => {
    const task = taskService.create({ title: "Learn Jest" });

    expect(task.title).toBe("Learn Jest");
    expect(task.status).toBe("todo");
    expect(task.priority).toBe("medium");
    expect(task.description).toBe("");
    expect(task.completedAt).toBeNull();
    expect(task.id).toBeDefined();
    expect(task.createdAt).toBeDefined();
  });

  test("finds a task by id", () => {
    const task = taskService.create({ title: "Study DSA" });
    expect(taskService.findById(task.id)).toEqual(task);
  });

  test("returns undefined for unknown id", () => {
    expect(taskService.findById("abc")).toBeUndefined();
  });

  test("updates an existing task", () => {
    const task = taskService.create({ title: "Old Title" });

    const updated = taskService.update(task.id, {
      title: "New Title",
      priority: "high",
    });

    expect(updated.title).toBe("New Title");
    expect(updated.priority).toBe("high");
  });

  test("returns null when updating missing task", () => {
    expect(taskService.update("123", { title: "Nope" })).toBeNull();
  });

  test("removes a task", () => {
    const task = taskService.create({ title: "Delete me" });

    expect(taskService.remove(task.id)).toBe(true);
    expect(taskService.findById(task.id)).toBeUndefined();
  });

  test("returns false when deleting missing task", () => {
    expect(taskService.remove("123")).toBe(false);
  });

  test("marks task as completed", () => {
    const task = taskService.create({
      title: "Finish assignment",
      priority: "high",
    });

    const completed = taskService.completeTask(task.id);

    expect(completed.status).toBe("done");
    expect(completed.completedAt).toBeDefined();
    expect(completed.priority).toBe("medium");
  });
  test("returns first page correctly", () => {
  taskService.create({ title: "Task 1" });
  taskService.create({ title: "Task 2" });
  taskService.create({ title: "Task 3" });

  const page1 = taskService.getPaginated(1, 2);

  expect(page1).toHaveLength(2);
  expect(page1[0].title).toBe("Task 1");
  expect(page1[1].title).toBe("Task 2");
});
test("filters tasks by exact status only", () => {
  taskService.create({
    title: "Todo Task",
    status: "todo",
  });

  taskService.create({
    title: "Done Task",
    status: "done",
  });

  const result = taskService.getByStatus("tod");

  expect(result).toHaveLength(0);
});
});