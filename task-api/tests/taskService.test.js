// This is for unit testing

// I am directly testing:
// - getAll()
// - findById()
// - getByStatus()
// - getPaginated
// - getStats()
// - create()
// - update()
// - remove()
// - completeTask
// - reset

const taskService = require("../src/services/taskService")

describe("Task Service", () => {

    beforeEach(() => {
        //for _reset
        taskService._reset()
    })

    //for create task
    test("it will create a task", () => {
        const task = taskService.create({
            title: "Learn react"
        })

        expect(task).toHaveProperty("id")
        expect(task.title).toBe("Learn react")
        expect(task.status).toBe("todo")
        expect(task.priority).toBe("medium")
    })


    //for task get By Status
    test("it will return tasks by status", () => {
        taskService.create({
            title: "Task 1",
            status: "todo"
        })

        taskService.create({
            title: "Task 2",
            status: "done"
        })

        taskService.create({
            title: "Task 3",
            status: "todo"
        })

        const tasks = taskService.getByStatus("todo")

        expect(tasks).toHaveLength(2)
        expect(tasks[0].status).toBe("todo")
        expect(tasks[1].status).toBe("todo")
    })



    // for task pagination

    // We are testing 1-based pagination here.
    //
    // page 1 = first page
    // page 2 = second page
    //
    // Expected behavior:
    // page 1, limit 10 → Task 1 to Task 10
    // page 2, limit 10 → Task 11 to Task 15
    //
    // NOTE:
    // The current service implementation uses:
    // const offset = page * limit

    // That means the current implementation treats pagination as 0-based
    // Therefore, this test is expected to FAIL
    // The test helps us identify the pagination bug
    // We will fix the service implementation later

    test("it will return the first page of paginated tasks", () => {

        // Create 15 tasks
        for (let i = 1; i <= 15; i++) {
            taskService.create({
                title: `Task ${i}`
            })
        }

        // Request page 1 with 10 tasks per page
        // According to our expected API behavior
        // page 1 should return Task 1 to Task 10
        const tasks = taskService.getPaginated(1, 10)


        expect(tasks).toHaveLength(10)// First page should contain 10 tasks
        expect(tasks[0].title).toBe("Task 1")// First task should be Task 1
        expect(tasks[9].title).toBe("Task 10") // Last task should be Task 10
    })

    // Test page 2

    // page 2 with limit 10 should return:
    // Task 11, Task 12, Task 13, Task 14, Task 15
    // This test verifies that pagination moves to the next page correctly

    test("it will return the second page of paginated tasks", () => {

        // Create 15 tasks
        for (let i = 1; i <= 15; i++) {
            taskService.create({
                title: `Task ${i}`
            })
        }

        // Request page 2 with 10 tasks per page
        const tasks = taskService.getPaginated(2, 10)

        expect(tasks).toHaveLength(5)// Only 5 tasks are available on the second page
        expect(tasks[0].title).toBe("Task 11")  // First task on page 2 should be Task 11
        expect(tasks[4].title).toBe("Task 15")  // Last task on page 2 should be Task 15
    })






    // for get all task
    test("it will return all tasks", () => {
        taskService.create({
            title: "Task 1"
        })

        taskService.create({
            title: "Task 2"
        })

        const tasks = taskService.getAll()

        expect(tasks).toHaveLength(2)
    })


    //for task get by Id
    test("it will find a task by id", () => {
        const createdTask = taskService.create({
            title: "Learn Jest"
        })

        const task = taskService.findById(createdTask.id)

        expect(task).toBeDefined()
        expect(task.id).toBe(createdTask.id)
        expect(task.title).toBe("Learn Jest")
    })


    //for task not found
    test("it will return undefined when task does not exist", () => {
        const task = taskService.findById("does not exist")

        expect(task).toBeUndefined()
    })

    //for update task
    test("should update a task", () => {
        const createdTask = taskService.create({
            title: "Learn Jest"
        })

        const updatedTask = taskService.update(createdTask.id, {
            title: "Learn Jest Properly",
            priority: "high"
        })

        expect(updatedTask.title).toBe("Learn Jest Properly")
        expect(updatedTask.priority).toBe("high")
        expect(updatedTask.id).toBe(createdTask.id)
    })

    // for task not found while updating
    test("it will return null when updating a task that does not exist", () => {
        const result = taskService.update("does not exist", {
            title: "Something",
        })

        expect(result).toBeNull()
    })


    //for task remove
    test("it will remove a task", () => {
        const createdTask = taskService.create({
            title: "Delete me"
        })

        const result = taskService.remove(createdTask.id)

        expect(result).toBe(true)
        expect(taskService.findById(createdTask.id)).toBeUndefined()
    })


    //for task not found while removing
    test("it will return false when removing a task that does not exist", () => {
        const result = taskService.remove("does-not-exist")

        expect(result).toBe(false)
    })


    //for get all task status 
    test("it will return all tasks status", () => {
        taskService.create({
            title: "Task 1",
            status: "todo"
        })

        taskService.create({
            title: "Task 2",
            status: "in_progress"
        })

        taskService.create({
            title: "Task 3",
            status: "done"
        })

        taskService.create({
            title: "Task 4",
            status: "todo"
        })

        const stats = taskService.getStats()

        expect(stats.todo).toBe(2)
        expect(stats.in_progress).toBe(1)
        expect(stats.done).toBe(1)
        expect(stats.overdue).toBe(0)
    })


    //for get task overdue 
    test("it will count overdue tasks", () => {
        taskService.create({
            title: "Overdue task",
            status: "todo",
            dueDate: "2020-01-01T00:00:00.000Z"
        })

        taskService.create({
            title: "Completed task",
            status: "done",
            dueDate: "2020-01-01T00:00:00.000Z"
        })

        const stats = taskService.getStats()

        expect(stats.overdue).toBe(1)
    })

    //for complete task
    test("it will complete a task", () => {
        const createdTask = taskService.create({
            title: "Complete me",
            status: "in_progress",
            priority: "high"
        })

        const completedTask = taskService.completeTask(createdTask.id)

        expect(completedTask.status).toBe("done")
        expect(completedTask.completedAt).not.toBeNull()
        expect(completedTask.priority).toBe("medium")
    })


    //for completing task that does not exist
    test("it will return null when completing a task that does not exist", () => {
        const result = taskService.completeTask("does-not-exist")

        expect(result).toBeNull()
    })

    // for assign task
    test("it will assign a task", () => {
        const createdTask = taskService.create({
            title: "Learn Jest"
        })

        const assignedTask = taskService.assignTask(
            createdTask.id,
            "Gaurav"
        )

        expect(assignedTask.assignee).toBe("Gaurav")
        expect(assignedTask.id).toBe(createdTask.id)
    })

    // for assigning task that does not exist
    test("it will return null when assigning a task that does not exist", () => {
        const result = taskService.assignTask(
            "does-not-exist",
            "Gaurav"
        )

        expect(result).toBeNull()
    })

    // for already assigned task
    test("it will not assign a task that is already assigned", () => {
        const createdTask = taskService.create({
            title: "Learn Jest"
        })

        taskService.assignTask(createdTask.id, "Gaurav")

        const result = taskService.assignTask(
            createdTask.id,
            "UV"
        )

        expect(result.alreadyAssigned).toBe(true)
    })


    // for priority filter
    test("it will return tasks by priority", () => {
        taskService.create({
            title: "High task",
            priority: "high"
        })

        taskService.create({
            title: "Low task",
            priority: "low"
        })

        const tasks = taskService.getByPriority("high")

        expect(tasks).toHaveLength(1)
        expect(tasks[0].title).toBe("High task")
    })

     // for assignee filter
    test("it will return tasks by assignee", () => {
        const createdTask = taskService.create({
            title: "Assigned task"
        })

        taskService.assignTask(createdTask.id, "Gaurav")

        const tasks = taskService.getByAssignee("Gaurav")

        expect(tasks).toHaveLength(1)
        expect(tasks[0].assignee).toBe("Gaurav")
    })


    // for search
    test("it will search tasks by title", () => {
        taskService.create({
            title: "Learn React"
        })

        taskService.create({
            title: "Learn Node"
        })

        const tasks = taskService.searchTasks("react")

        expect(tasks).toHaveLength(1)
        expect(tasks[0].title).toBe("Learn React")
    })

      // for multiple filters
    test("it will filter tasks using multiple filters", () => {
        const task1 = taskService.create({
            title: "Learn React",
            status: "todo",
            priority: "high"
        })

        const task2 = taskService.create({
            title: "Learn Node",
            status: "todo",
            priority: "low"
        })

        taskService.assignTask(task1.id, "Gaurav")
        taskService.assignTask(task2.id, "UV")

        const tasks = taskService.filterTasks({
            status: "todo",
            priority: "high",
            assignee: "Gaurav",
            search: "react"
        })

        expect(tasks).toHaveLength(1)
        expect(tasks[0].title).toBe("Learn React")
    })
    
})