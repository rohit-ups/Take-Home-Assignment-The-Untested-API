const taskService = require("../src/services/taskService");

describe("Task Service", () => {


         beforeEach(() => {
            taskService._reset();
        });

        test("should create a new task with default values", () => {

            const task = taskService.create({
                title: "Test Task"
            });

            expect(task.id).toBeDefined();
            expect(task.title).toBe("Test Task");
            expect(task.status).toBe("todo");
            expect(task.priority).toBe("medium");

        });


        test("should return all tasks", () => {

            taskService.create({ title: "Task 1"});
            taskService.create({ title: "Task 2"});

            const tasks = taskService.getAll();

            expect(tasks.length).toBe(2);
        });


        test("should find task by id", () => {

            const task = taskService.create({
                title: "Find Me"
            });

            const found = taskService.findById(task.id);

            expect(found).toBeDefined();
            expect(found.title).toBe("Find Me");

        });

        test("should return undefined if task id does not exist", () => {

        const found = taskService.findById("invalid-id");

        expect(found).toBeUndefined();

        });


        test("should update an exixting task", () => {

            const task = taskService.create({
                title: "Old Title"
            });

            const updated = taskService.update(task.id, {
                title: "New Title"
            });

            expect(updated.title).toBe("New Title");
        });

        test("should return null when updating non-existing task", ()=> {

            const updated = taskService.update("invalid-id", {
                        title: "Test"
            });

            expect(updated).toBeNull();
        });


        test("should remove an existing task", () => {

            const task = taskService.create({
                title: "Delete Me"
            });

            const result = taskService.remove(task.id);

            const tasks = taskService.getAll();

            expect(result).toBe(true);
            expect(tasks.length).toBe(0);
        });


        test("should return false when removing non-existing task", () => {

            const result = taskService.remove("invalid-id");

            expect(result).toBe(false);


        });


        test("should mark task as completed", () => {

            const task = taskService.create({
                title: "Finish this",
                priority: "high"
            });

            const completed = taskService.completeTask(task.id);

            expect(completed.status).toBe("done");
            expect(completed.completedAt).toBeDefined();
            expect(completed.priority).toBe("medium");
        });


        test("should return null when completing non-existing task", () => {

            const result = taskService.completeTask("invalid-id");

            expect(result).toBeNull();
        })



        test("should return correct task statistics", () => {

            taskService.create({
                title: "Task 1",
                status: "todo"
            });

            taskService.create({
                title: "Task 2",
                status: "done"
            });

            const stats = taskService.getStats();

            expect(stats.todo).toBe(1);
            expect(stats.done).toBe(1);
            expect(stats.in_progress).toBe(0);
        });


        test("should count overdue tasks", () => {

            const pastDate = new Date(Date.now() - 86400000).toISOString();

            taskService.create({
                title: "Late Task",
                status: "todo",
                dueDate: pastDate
            });

            const stats = taskService.getStats();

            expect(stats.overdue).toBe(1);
        });


        test("should return paginated tasks for first page", () => {

        taskService.create({ title: "Task 1" });
        taskService.create({ title: "Task 2" });
        taskService.create({ title: "Task 3" });

        const result = taskService.getPaginated(0, 2);

        expect(result.length).toBe(2);
        expect(result[0].title).toBe("Task 1");
        expect(result[1].title).toBe("Task 2");

        });


        test("should return paginated tasks for second page", () => {

        taskService.create({ title: "Task 1" });
        taskService.create({ title: "Task 2" });
        taskService.create({ title: "Task 3" });

        const result = taskService.getPaginated(1, 2);

        expect(result.length).toBe(1);
        expect(result[0].title).toBe("Task 3");

        });
    
});