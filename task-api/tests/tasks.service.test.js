const service = require("../src/services/taskService");

beforeEach(() => service._reset());

describe("taskService", () => {
  test("create() sets default values", () => {
    const task = service.create({ title: "Test" });

    expect(task).toMatchObject({
      title: "Test",
      status: "todo",
      priority: "medium",
      description: "",
      dueDate: null,
      completedAt: null,
    });
  });

  test("findById() returns correct task", () => {
    const task = service.create({ title: "Find me" });

    const found = service.findById(task.id);

    expect(found.id).toBe(task.id);
  });

  test("getAll() returns all tasks", () => {
    service.create({ title: "A" });
    service.create({ title: "B" });

    const tasks = service.getAll();

    expect(tasks).toHaveLength(2);
  });

  test("getByStatus() filters exact match only", () => {
    service.create({ title: "A", status: "todo" });
    service.create({ title: "B", status: "done" });

    const result = service.getByStatus("done");

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("B");
  });

  test("getPaginated() returns correct slice", () => {
    for (let i = 1; i <= 5; i++) {
      service.create({ title: `T${i}` });
    }

    const page1 = service.getPaginated(1, 2);
    const page3 = service.getPaginated(3, 2);

    expect(page1.map(t => t.title)).toEqual(["T1", "T2"]);
    expect(page3.map(t => t.title)).toEqual(["T5"]);
  });

  test("update() modifies existing task", () => {
    const task = service.create({ title: "Old" });

    const updated = service.update(task.id, { title: "New" });

    expect(updated.title).toBe("New");
  });

  test("update() returns null if task not found", () => {
    const result = service.update("invalid-id", { title: "x" });

    expect(result).toBeNull();
  });

  test("remove() deletes task", () => {
    const task = service.create({ title: "Delete me" });

    const removed = service.remove(task.id);

    expect(removed).toBe(true);
    expect(service.getAll()).toHaveLength(0);
  });

  test("completeTask() marks task as done", () => {
    const task = service.create({ title: "Complete me" });

    const updated = service.completeTask(task.id);

    expect(updated.status).toBe("done");
    expect(updated.completedAt).not.toBeNull();
  });

  test("getStats() returns correct counts", () => {
    service.create({ title: "A", status: "todo", dueDate: "2000-01-01T00:00:00Z" });
    service.create({ title: "B", status: "in_progress" });

    const t = service.create({ title: "C" });
    service.completeTask(t.id);

    const stats = service.getStats();

    expect(stats).toEqual({
      todo: 1,
      in_progress: 1,
      done: 1,
      overdue: 1,
    });
  });
});