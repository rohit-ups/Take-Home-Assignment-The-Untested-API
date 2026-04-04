const taskService = require("../src/services/taskService");

describe("taskService.create", () => {
  beforeEach(() => {
    taskService._reset(); // clear tasks before each test
  });

  it("should create a task with required fields only", () => {
    const task = taskService.create({ title: "Test Task" });

    expect(task.id).toBeDefined();
    expect(task.title).toBe("Test Task");
    expect(task.description).toBe(""); // default
    expect(task.status).toBe("todo");   // default
    expect(task.priority).toBe("medium"); // default
    expect(task.dueDate).toBeNull();
    expect(task.completedAt).toBeNull();
    expect(task.createdAt).toBeDefined();
  });

  it("should create a task with all provided fields", () => {
    const task = taskService.create({
      title: "Another Task",
      description: "This is a description",
      status: "in_progress",
      priority: "high",
      dueDate: "2026-04-10",
    });

    expect(task.title).toBe("Another Task");
    expect(task.description).toBe("This is a description");
    expect(task.status).toBe("in_progress");
    expect(task.priority).toBe("high");
    expect(task.dueDate).toBe("2026-04-10");
  });

  it("should assign unique ids for multiple tasks", () => {
    const task1 = taskService.create({ title: "Task 1" });
    const task2 = taskService.create({ title: "Task 2" });

    expect(task1.id).not.toBe(task2.id);
  });

  it("should handle null or undefined status and priority by using defaults", () => {
    const task = taskService.create({ title: "Task", status: null, priority: undefined });
    expect(task.status).toBe(null); // This is where we can detect a bug
    expect(task.priority).toBe(undefined); // Another edge case
  });

  it("should fail if title is missing (optional, if you want to catch this bug)", () => {
    expect(() => taskService.create({})).toThrow(); 
    // Current code does not throw — this test will fail and catch bug
  });
});


describe("taskService.update", () => {
  beforeEach(() => {
    taskService._reset();
  });

  it("should update valid fields of a task", () => {
    const task = taskService.create({ title: "Task 1" });
    const updated = taskService.update(task.id, { title: "Updated Task" });
    expect(updated.title).toBe("Updated Task");
  });

  it("should return null if task id does not exist", () => {
    const result = taskService.update("invalid-id", { title: "Test" });
    expect(result).toBeNull();
  });

  // Edge case: unknown fields
  it("should ignore unknown fields", () => {
    const task = taskService.create({ title: "Task 2" });
    const updated = taskService.update(task.id, { foo: "bar" });
    expect(updated.foo).toBeUndefined(); // This will currently fail and reveal a bug
  });

  // Edge case: prevent id override
  it("should not allow id to be changed", () => {
    const task = taskService.create({ title: "Task 3" });
    const updated = taskService.update(task.id, { id: "newId" });
    expect(updated.id).toBe(task.id); // This will fail in current implementation
  });

  // Edge case: null or undefined values
  it("should handle null values appropriately", () => {
    const task = taskService.create({ title: "Task 4" });
    const updated = taskService.update(task.id, { title: null });
    expect(updated.title).not.toBeNull(); // Currently fails, reveals bug
  });
});


describe("taskService.remove", () => {
  beforeEach(() => {
    taskService._reset();
  });

  it("should remove a task by id (happy path)", () => {
    const task = taskService.create({ title: "Task 1" });
    const result = taskService.remove(task.id);
    expect(result).toBe(true);
    expect(taskService.findById(task.id)).toBeUndefined();
  });

  it("should return false if task id does not exist", () => {
    const result = taskService.remove("non-existing-id");
    expect(result).toBe(false);
  });

  // Edge case: removing the same task twice
  it("should return false when trying to delete an already deleted task", () => {
    const task = taskService.create({ title: "Task 2" });
    taskService.remove(task.id); // first delete
    const secondDelete = taskService.remove(task.id); // second delete
    expect(secondDelete).toBe(false); // <-- currently works, no bug here
  });

  // Edge case: removing a null or undefined id
  it("should return false when id is null or undefined", () => {
    expect(taskService.remove(null)).toBe(false);
    expect(taskService.remove(undefined)).toBe(false);
  });
});


describe("taskService.completeTask", () => {
  beforeEach(() => {
    taskService._reset();
  });

  it("should mark a task as completed (happy path)", () => {
    const task = taskService.create({ title: "Task 1", priority: "high" });
    const completed = taskService.completeTask(task.id);

    expect(completed.status).toBe("done");
    expect(completed.completedAt).not.toBeNull();
    expect(completed.id).toBe(task.id);
    // BUG: priority is overwritten
    expect(completed.priority).toBe("high"); // This will fail and reveal the bug
  });

  it("should return null if task does not exist", () => {
    const result = taskService.completeTask("non-existent-id");
    expect(result).toBeNull();
  });

  it("should not overwrite original priority if already set", () => {
    const task = taskService.create({ title: "Task 2", priority: "low" });
    const updated = taskService.completeTask(task.id);
    expect(updated.priority).toBe("low"); // <-- will fail, current code sets 'medium'
  });
});



describe("taskService.getPaginated edge cases", () => {
  beforeEach(() => taskService._reset());

  it("should return first tasks for page = 1 (1-based expected)", () => {
    const t1 = taskService.create({ title: "Task 1" });
    const t2 = taskService.create({ title: "Task 2" });
    const t3 = taskService.create({ title: "Task 3" });

    // If someone expects page 1 to be the first 2 tasks
    const result = taskService.getPaginated(1, 2); 
    // Current function returns tasks 3 (0-based page), which will fail the test
    expect(result.map(t => t.id)).toEqual([t1.id, t2.id]);
  });

  it("should return empty array for negative page numbers", () => {
    const t1 = taskService.create({ title: "Task 1" });
    const result = taskService.getPaginated(-1, 1);
    expect(result).toEqual([]); // should fail gracefully
  });
});



describe("taskService.getStats", () => {

  beforeEach(() => {
    taskService._reset(); // clear tasks before each test
  });

  it("should correctly count tasks by status and overdue tasks (happy path)", () => {
    const t1 = taskService.create({ title: "Task 1", status: "todo", dueDate: "2000-01-01" }); // overdue
    const t2 = taskService.create({ title: "Task 2", status: "in_progress" });
    const t3 = taskService.create({ title: "Task 3", status: "done" });
    const stats = taskService.getStats();

    expect(stats).toEqual({
      todo: 1,
      in_progress: 1,
      done: 1,
      overdue: 1, // t1 is overdue
    });
  });

  it("should ignore tasks with unknown status but still count overdue correctly", () => {
    const t1 = taskService.create({ title: "Task 1", status: "unknown", dueDate: "2000-01-01" });
    const t2 = taskService.create({ title: "Task 2", status: "todo", dueDate: "3000-01-01" });
    const stats = taskService.getStats();

    expect(stats.todo).toBe(1);
    expect(stats.in_progress).toBe(0);
    expect(stats.done).toBe(0);
    expect(stats.overdue).toBe(1); // t1 is overdue
  });

  it("should handle tasks with invalid dueDate gracefully", () => {
    const t1 = taskService.create({ title: "Task 1", status: "todo", dueDate: "invalid-date" });
    const stats = taskService.getStats();

    // Invalid dates should not crash; overdue should remain 0
    expect(stats.overdue).toBe(0);
  });

});



describe("taskService.getByStatus", () => {
  beforeEach(() => {
    taskService._reset(); // Reset tasks before each test
  });

  it("should only return tasks with exact status", () => {
    const t1 = taskService.create({ title: "Task 1", status: "todo" });
    const t2 = taskService.create({ title: "Task 2", status: "in_progress" });
    const t3 = taskService.create({ title: "Task 3", status: "done" });

    // Edge case: partial match that should NOT return any task
    const result = taskService.getByStatus("do"); // "do" is part of "todo" and "done"
    expect(result.length).toBe(0); // Fails in current code → reveals bug

    // Happy path: exact match
    const todoTasks = taskService.getByStatus("todo");
    expect(todoTasks.map(t => t.id)).toEqual([t1.id]);
  });
});



describe("taskService.findById", () => {
  beforeEach(() => {
    taskService._reset(); // Reset tasks array before each test
  });

  it("should return the correct task for a valid id", () => {
    const task = taskService.create({ title: "Test Task" });
    const found = taskService.findById(task.id);
    expect(found).toEqual(task);
  });

  it("should return undefined for a non-existent id", () => {
    const result = taskService.findById("invalid-id");
    expect(result).toBeUndefined();
  });
});


describe("taskService.getAll", () => {
  beforeEach(() => taskService._reset());

  it("should return all tasks in a new array reference", () => {
    const t1 = taskService.create({ title: "Task 1" });
    const t2 = taskService.create({ title: "Task 2" });

    const allTasks1 = taskService.getAll();
    const allTasks2 = taskService.getAll();

    // Check the array reference is different (new array each call)
    expect(allTasks1).not.toBe(allTasks2);

    // Check data is correct
    expect(allTasks1).toEqual([t1, t2]);
    expect(allTasks2).toEqual([t1, t2]);

    // Modifying returned array should not affect internal tasks (observable via another getAll)
    allTasks1.pop();
    const allTasks3 = taskService.getAll();
    expect(allTasks3.length).toBe(2); // still contains both tasks
  });
});