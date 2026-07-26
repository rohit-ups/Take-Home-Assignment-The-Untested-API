const taskService = require("../src/services/taskService");

beforeEach(() => {
  taskService._reset();
});

describe("Task Service", () => {
  test("should create a task", () => {
    const task = taskService.create({
      title: "Learn Jest",
      priority: "high",
    });

    expect(task.title).toBe("Learn Jest");
    expect(task.priority).toBe("high");
    expect(task.id).toBeDefined();
  });

  test("should return all tasks", () => {
    taskService.create({ title: "Task 1" });
    taskService.create({ title: "Task 2" });

    expect(taskService.getAll()).toHaveLength(2);
  });

  test("should remove a task", () => {
    const task = taskService.create({ title: "Delete me" });

    expect(taskService.remove(task.id)).toBe(true);
    expect(taskService.getAll()).toHaveLength(0);
  });

  test("should return first page correctly", () => {
    for (let i = 1; i <= 15; i++) {
      taskService.create({ title: `Task ${i}` });
    }

    const page1 = taskService.getPaginated(1, 10);

    expect(page1).toHaveLength(10);
    expect(page1[0].title).toBe("Task 1");
  });

  test("should match exact status only", () => {
    taskService.create({
      title: "Done Task",
      status: "done",
    });

    const result = taskService.getByStatus("do");

    expect(result).toHaveLength(0);
  });

  test("should keep priority when completing task", () => {
    const task = taskService.create({
      title: "Important Task",
      priority: "high",
    });

    const completed = taskService.completeTask(task.id);

    expect(completed.status).toBe("done");
    expect(completed.priority).toBe("high");
  });
});