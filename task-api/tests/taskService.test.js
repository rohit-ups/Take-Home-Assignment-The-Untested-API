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
  });

  test("findById returns task by id", () => {
    const created = taskService.create({ title: "Find Me" });
    const found = taskService.findById(created.id);
    expect(found).toEqual(created);
  });

  test("getPaginated returns correct slice on 1-based page index", () => {
    for (let i = 1; i <= 15; i++) {
      taskService.create({ title: `Task ${i}` });
    }
    const page1 = taskService.getPaginated(1, 5);
    expect(page1.length).toBe(5);
    expect(page1[0].title).toBe("Task 1");
    expect(page1[4].title).toBe("Task 5");

    const page2 = taskService.getPaginated(2, 5);
    expect(page2.length).toBe(5);
    expect(page2[0].title).toBe("Task 6");
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

  test("completeTask preserves existing priority", () => {
    const created = taskService.create({
      title: "High Priority",
      priority: "high",
    });
    const completed = taskService.completeTask(created.id);
    expect(completed.status).toBe("done");
    expect(completed.priority).toBe("high");
    expect(completed.completedAt).not.toBeNull();
  });

  test("getStats calculates correct counts and overdue tasks", () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString();
    taskService.create({ title: "T1", status: "todo", dueDate: pastDate });
    taskService.create({ title: "T2", status: "in_progress" });
    taskService.create({ title: "T3", status: "done", dueDate: pastDate });

    const stats = taskService.getStats();
    expect(stats.todo).toBe(1);
    expect(stats.in_progress).toBe(1);
    expect(stats.done).toBe(1);
    expect(stats.overdue).toBe(1);
  });

  test("update modifies task fields and remove deletes task", () => {
    const created = taskService.create({ title: "Original" });
    const updated = taskService.update(created.id, { title: "Updated" });
    expect(updated.title).toBe("Updated");

    const removed = taskService.remove(created.id);
    expect(removed).toBe(true);
    expect(taskService.findById(created.id)).toBeUndefined();
  });
});
