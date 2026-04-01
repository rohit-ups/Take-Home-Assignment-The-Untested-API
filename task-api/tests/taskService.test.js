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

})