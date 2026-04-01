const taskService = require("../src/services/taskService");

describe("Task Service", ()=> {
    beforeEach(()=>{
        taskService._reset();
    })

    test("should create task", ()=> {
        const task = taskService.create({
            title: "Test Task"
        })

        expect(task.title)
        .toBe("Test Task")

        expect(task.status)
        .toBe("todo")

        expect(task.id)
        .toBeDefined()
    })

    test("should return all tasks", ()=> {
         taskService.create({
            title: "Task 1"
         })

         taskService.create({
            title: "Task 2"
         })
    
        const tasks = taskService.getAll()

        expect(tasks.length)
        .toBe(2)
    })

    test("should update task", ()=> {
        const task = taskService.create({
            title: "Old"
        })

        const updated = taskService.update(
            task.id, 
            {title: "New"}
        )

        expect(updated.title)
        .toBe("New")
    })

})