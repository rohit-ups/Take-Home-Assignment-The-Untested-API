const taskService = require("../src/services/taskService");

describe("taskService Unit Tests", () => {
  beforeEach(() => {
    taskService._reset();
  });

  test("create adds task with correct fields and returns it", () => {
    const task = taskService.create({ title: "Test Task" });
    expect(task.id).toBeDefined();
    expect(task.title).toBe("Test Task");
    expect(task.status).toBe("todo");
    expect(task.priority).toBe("medium");
    expect(task.completedAt).toBeNull();
    expect(task.createdAt).toBeDefined();
    expect(task.assignee).toBeNull();
  });

  test("findById returns task by id and undefined for non-existent", () => {
    const created = taskService.create({ title: "Find Me" });
    expect(taskService.findById(created.id)).toEqual(created);
    expect(taskService.findById("unknown-id")).toBeUndefined();
  });

  test("getAll returns copy of all tasks", () => {
    taskService.create({ title: "Task 1" });
    expect(taskService.getAll().length).toBe(1);
  });

  test("getPaginated returns correct slice on 1-based page index with optional status filter", () => {
    for (let i = 1; i <= 15; i++) {
      taskService.create({
        title: `Task ${i}`,
        status: i % 2 === 0 ? "done" : "todo",
      });
    }
    const page1 = taskService.getPaginated(1, 5);
    expect(page1.length).toBe(5);

    const filtered = taskService.getPaginated(1, 5, "done");
    expect(filtered.length).toBe(5);
    expect(filtered.every((t) => t.status === "done")).toBe(true);
  });

  test("getByStatus performs strict status equality check", () => {
    taskService.create({ title: "T1", status: "todo" });
    taskService.create({ title: "T2", status: "done" });

    const todoTasks = taskService.getByStatus("todo");
    expect(todoTasks.length).toBe(1);
    expect(todoTasks[0].title).toBe("T1");

    const partialMatch = taskService.getByStatus("do");
    expect(partialMatch.length).toBe(0);
  });

  test("completeTask preserves existing priority and returns null for invalid id", () => {
    const created = taskService.create({
      title: "High Priority",
      priority: "high",
    });
    const completed = taskService.completeTask(created.id);
    expect(completed.status).toBe("done");
    expect(completed.priority).toBe("high");
    expect(completed.completedAt).not.toBeNull();

    expect(taskService.completeTask("invalid-id")).toBeNull();
  });

  test("assignTask updates assignee and returns null for invalid id", () => {
    const created = taskService.create({ title: "Assign Me" });
    const assigned = taskService.assignTask(created.id, "Alice");
    expect(assigned.assignee).toBe("Alice");

    expect(taskService.assignTask("invalid-id", "Alice")).toBeNull();
  });

  test("getStats calculates correct counts, overdue tasks, and ignores non-overdue/unknown status tasks", () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString();
    const futureDate = new Date(Date.now() + 86400000).toISOString();

    taskService.create({ title: "T1", status: "todo", dueDate: pastDate });
    taskService.create({
      title: "T2",
      status: "in_progress",
      dueDate: futureDate,
    });
    taskService.create({ title: "T3", status: "done", dueDate: pastDate });
    taskService.create({ title: "T4", status: "unknown_status" });

    const stats = taskService.getStats();
    expect(stats.todo).toBe(1);
    expect(stats.in_progress).toBe(1);
    expect(stats.done).toBe(1);
    expect(stats.overdue).toBe(1);
  });

  test("update and remove handle non-existent IDs gracefully", () => {
    expect(taskService.update("invalid-id", { title: "New" })).toBeNull();
    expect(taskService.remove("invalid-id")).toBe(false);

    const created = taskService.create({ title: "Original" });
    const updated = taskService.update(created.id, { title: "Updated" });
    expect(updated.title).toBe("Updated");

    expect(taskService.remove(created.id)).toBe(true);
  });
});
