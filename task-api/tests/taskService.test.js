const taskService = require("../src/services/taskService");

describe("taskService.create", () => {
  beforeEach(() => {
    taskService._reset();
  });

  test("should create a task with default values", () => {
    const task = taskService.create({
      title: "Learn Jest"
    });

    expect(task.title).toBe("Learn Jest");
    expect(task.description).toBe("");
    expect(task.status).toBe("todo");
    expect(task.priority).toBe("medium");
    expect(task.dueDate).toBeNull();
    expect(task.completedAt).toBeNull();
    expect(task.id).toBeDefined();
    expect(task.createdAt).toBeDefined();
  });
});

describe("taskService.getAll", () => {
    beforeEach(() => {
      taskService._reset();
    });
  
    test("should return all tasks", () => {
      taskService.create({ title: "Task 1" });
      taskService.create({ title: "Task 2" });
  
      const tasks = taskService.getAll();
  
      expect(tasks).toHaveLength(2);
      expect(tasks[0].title).toBe("Task 1");
      expect(tasks[1].title).toBe("Task 2");
    });
  
    test("should return an empty array when there are no tasks", () => {
      const tasks = taskService.getAll();
  
      expect(tasks).toEqual([]);
    });
  });

  describe("taskService.findById", () => {
    beforeEach(() => {
      taskService._reset();
    });
  
    test("should find a task by its ID", () => {
      const createdTask = taskService.create({
        title: "Find me"
      });
  
      const task = taskService.findById(createdTask.id);
  
      expect(task).toBeDefined();
      expect(task.id).toBe(createdTask.id);
      expect(task.title).toBe("Find me");
    });
  
    test("should return undefined when the task does not exist", () => {
      const task = taskService.findById("non-existent-id");
  
      expect(task).toBeUndefined();
    });
  });

  describe("taskService.getByStatus", () => {
    beforeEach(() => {
      taskService._reset();
    });
  
    test("should return tasks matching the given status", () => {
      taskService.create({
        title: "Task 1",
        status: "todo"
      });
  
      taskService.create({
        title: "Task 2",
        status: "done"
      });
  
      taskService.create({
        title: "Task 3",
        status: "todo"
      });
  
      const tasks = taskService.getByStatus("todo");
  
      expect(tasks).toHaveLength(2);
      expect(tasks[0].title).toBe("Task 1");
      expect(tasks[1].title).toBe("Task 3");
    });
  
    test("should return an empty array when no tasks match", () => {
      taskService.create({
        title: "Task 1",
        status: "todo"
      });
  
      const tasks = taskService.getByStatus("done");
  
      expect(tasks).toEqual([]);
    });
    test("should not match a partial status", () => {
        taskService.create({
          title: "In progress task",
          status: "in_progress"
        });
      
        const tasks = taskService.getByStatus("progress");
      
        expect(tasks).toHaveLength(0);
  });
});

describe("taskService.getPaginated", () => {
    beforeEach(() => {
      taskService._reset();
    });
  
    test("should return the first page of tasks", () => {
      taskService.create({ title: "Task 1" });
      taskService.create({ title: "Task 2" });
      taskService.create({ title: "Task 3" });
  
      const tasks = taskService.getPaginated(1, 2);
  
      expect(tasks).toHaveLength(2);
      expect(tasks[0].title).toBe("Task 1");
      expect(tasks[1].title).toBe("Task 2");
    });
  
    test("should return an empty array when the page is beyond the available tasks", () => {
      taskService.create({ title: "Task 1" });
  
      const tasks = taskService.getPaginated(5, 2);
  
      expect(tasks).toEqual([]);
    });
  });

  describe("taskService.getStats", () => {
    beforeEach(() => {
      taskService._reset();
    });
  
    test("should return zero counts when there are no tasks", () => {
      const stats = taskService.getStats();
  
      expect(stats).toEqual({
        todo: 0,
        in_progress: 0,
        done: 0,
        overdue: 0
      });
    });
  
    test("should count tasks by status", () => {
      taskService.create({
        title: "Task 1",
        status: "todo"
      });
  
      taskService.create({
        title: "Task 2",
        status: "todo"
      });
  
      taskService.create({
        title: "Task 3",
        status: "in_progress"
      });
  
      taskService.create({
        title: "Task 4",
        status: "done"
      });
  
      const stats = taskService.getStats();
  
      expect(stats.todo).toBe(2);
      expect(stats.in_progress).toBe(1);
      expect(stats.done).toBe(1);
      expect(stats.overdue).toBe(0);
    });
  
    test("should count an unfinished task with a past due date as overdue", () => {
      taskService.create({
        title: "Overdue task",
        status: "todo",
        dueDate: "2020-01-01T00:00:00.000Z"
      });
  
      const stats = taskService.getStats();
  
      expect(stats.overdue).toBe(1);
    });
  
    test("should not count a completed task as overdue", () => {
      taskService.create({
        title: "Completed task",
        status: "done",
        dueDate: "2020-01-01T00:00:00.000Z"
      });
  
      const stats = taskService.getStats();
  
      expect(stats.overdue).toBe(0);
    });
  });

  describe("taskService.update", () => {
    beforeEach(() => {
      taskService._reset();
    });
  
    test("should update an existing task", () => {
      const task = taskService.create({
        title: "Original title",
        priority: "low"
      });
  
      const updated = taskService.update(task.id, {
        title: "Updated title",
        priority: "high"
      });
  
      expect(updated.title).toBe("Updated title");
      expect(updated.priority).toBe("high");
      expect(updated.status).toBe("todo");
    });
  
    test("should return null when the task does not exist", () => {
      const updated = taskService.update("non-existent-id", {
        title: "Updated"
      });
  
      expect(updated).toBeNull();
    });
  });

  describe("taskService.remove", () => {
    beforeEach(() => {
      taskService._reset();
    });
  
    test("should remove an existing task", () => {
      const task = taskService.create({
        title: "Delete me"
      });
  
      const result = taskService.remove(task.id);
  
      expect(result).toBe(true);
      expect(taskService.findById(task.id)).toBeUndefined();
    });
  
    test("should return false when the task does not exist", () => {
      const result = taskService.remove("non-existent-id");
  
      expect(result).toBe(false);
    });
  });

  describe("taskService.completeTask", () => {
    beforeEach(() => {
      taskService._reset();
    });
  
    test("should mark a task as completed", () => {
      const task = taskService.create({
        title: "Complete me",
        priority: "high"
      });
  
      const completed = taskService.completeTask(task.id);
  
      expect(completed.status).toBe("done");
      expect(completed.completedAt).toBeDefined();
    });
  
    test("should return null when the task does not exist", () => {
      const result = taskService.completeTask("non-existent-id");
  
      expect(result).toBeNull();
    });
  
    test("should preserve the task priority when completing it", () => {
      const task = taskService.create({
        title: "Important task",
        priority: "high"
      });
  
      const completed = taskService.completeTask(task.id);
  
      expect(completed.priority).toBe("high");
    });
  });