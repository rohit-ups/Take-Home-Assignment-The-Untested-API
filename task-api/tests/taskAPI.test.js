//this is for API test for /tasks endpoint

// I am directly testing the API endpoints:
// - GET /tasks
// - GET /tasks?status=todo
// - GET /tasks?page=1&limit=10
// - POST /tasks
// - PUT /tasks/:id
// - DELETE /tasks/:id
// - PATCH /tasks/:id/complete
// - GET /tasks/stats


const request = require("supertest")
const app = require("../src/app")
const taskService = require("../src/services/taskService")

beforeEach(() => {
    taskService._reset()
})

describe("Task API", () => {

    //for get all tesks
    test("GET /tasks should return all tasks", async () => {
        const response = await request(app)
            .get("/tasks")

        // console.log(response.status)
        // console.log(response.body)

        expect(response.status).toBe(200)
        expect(response.body).toEqual([])
    })


    //for create task
    test("POST /tasks should create a task", async () => {
        const response = await request(app)
            .post("/tasks")
            .send({
                title: "learn react",
                description: "write API tests",
                priority: "high"
            })

        //  console.log(response.status)
        // console.log(response.body)

        expect(response.status).toBe(201)
        expect(response.body).toHaveProperty("id")
        expect(response.body.title).toBe("learn react")
        expect(response.body.description).toBe("write API tests")
        expect(response.body.priority).toBe("high")
    })


    // for create task without title
    test("POST /tasks should reject task without title", async () => {
        const response = await request(app)
            .post("/tasks")
            .send({
                description: "Task without title",
                priority: "high"
            })

        // console.log(response.status)
        // console.log(response.body)

        expect(response.status).toBe(400)
        expect(response.body.error).toBe("title is required and must be a non-empty string")
    })


    //for get tasks by status
    test("GET /tasks?status=todo should return tasks by status", async () => {


        //create task for check because in tasks array is empty
        const createResponse = await request(app)
            .post("/tasks")
            .send({
                title: "Todo task",
                status: "todo"
            })

        //now get tasks with todo status
        const response = await request(app)
            .get("/tasks?status=todo")

        // console.log(response.status)
        // console.log(response.body)


        expect(response.status).toBe(200)
        expect(response.body.length).toBeGreaterThan(0)

        response.body.forEach((task) => {
            expect(task.status).toBe("todo")
        })
    })


    //for get paginated tasks

    // for paginated tasks
    //
    // Pagination is 1-based:
    // page 1 = Task 1 to Task 10
    // page 2 = Task 11 to Task 15
    //
    // The current service implementation has a pagination bug.
    // These tests are expected to FAIL until the service is fixed.

    // page 1
    test("GET /tasks?page=1&limit=10 should return first page", async () => {

        // Create 15 tasks
        for (let i = 1; i <= 15; i++) {
            await request(app)
                .post("/tasks")
                .send({
                    title: `Task ${i}`
                })
        }

        const response = await request(app)
            .get("/tasks?page=1&limit=10")

        expect(response.status).toBe(200)

        // Page 1 should contain Task 1 to Task 10
        expect(response.body).toHaveLength(10)
        expect(response.body[0].title).toBe("Task 1")
        expect(response.body[9].title).toBe("Task 10")
    })


    // page 2
    test("GET /tasks?page=2&limit=10 should return second page", async () => {

        // Create 15 tasks
        for (let i = 1; i <= 15; i++) {
            await request(app)
                .post("/tasks")
                .send({
                    title: `Task ${i}`
                })
        }

        const response = await request(app)
            .get("/tasks?page=2&limit=10")

        expect(response.status).toBe(200)

        // Page 2 should contain Task 11 to Task 15
        expect(response.body).toHaveLength(5)
        expect(response.body[0].title).toBe("Task 11")
        expect(response.body[4].title).toBe("Task 15")
    })


    // for update task
    test("PUT /tasks/:id should update a task", async () => {

        // it will create a task
        const createResponse = await request(app)
            .post("/tasks")
            .send({
                title: "Learn React",
                priority: "medium"
            })

        const taskId = createResponse.body.id

        // update the task
        const response = await request(app)
            .put(`/tasks/${taskId}`)
            .send({
                title: "Learn React Properly",
                priority: "high"
            })

        // console.log(response.status)
        // console.log(response.body)

        expect(response.status).toBe(200)
        expect(response.body.id).toBe(taskId)
        expect(response.body.title).toBe("Learn React Properly")
        expect(response.body.priority).toBe("high")
    })

    // for update task that does not exist
    test("PUT /tasks/:id should return 404 when task does not exist", async () => {

        const response = await request(app)
            .put("/tasks/does-not-exist")
            .send({
                title: "Updated task"
            })

        // console.log(response.status)
        // console.log(response.body)

        expect(response.status).toBe(404)
        expect(response.body.error).toBe("Task not found")
    })

    // for delete task
    test("DELETE /tasks/:id should delete a task", async () => {

        // first create a task
        const createResponse = await request(app)
            .post("/tasks")
            .send({
                title: "Delete this task"
            })

        const taskId = createResponse.body.id

        // delete the task
        const response = await request(app)
            .delete(`/tasks/${taskId}`)

        // console.log(response.status)

        expect(response.status).toBe(204)
    })

    // for delete task that does not exist
    test("DELETE /tasks/:id should return 404 when task does not exist", async () => {

        const response = await request(app)
            .delete("/tasks/does-not-exist")

        // console.log(response.status)
        // console.log(response.body)

        expect(response.status).toBe(404)
        expect(response.body.error).toBe("Task not found")
    })


    // for complete the task
    test("PATCH /tasks/:id/complete should mark task as complete", async () => {

        // it will create a task
        const createResponse = await request(app)
            .post("/tasks")
            .send({
                title: "Task to complete"
            })

        const taskId = createResponse.body.id

        // Complete the task
        const response = await request(app).patch(`/tasks/${taskId}/complete`)

        // console.log(response.status)
        // console.log(response.body)

        expect(response.status).toBe(200)
        expect(response.body.id).toBe(taskId)
        expect(response.body.status).toBe("done")
        expect(response.body.completedAt).not.toBeNull()
    })

    //for task not found while completing
    test("PATCH /tasks/:id/complete should return 404 for non-existing task", async () => {

        const response = await request(app).patch("/tasks/non-existing-id/complete")

        // console.log(response.status)
        // console.log(response.body)

        expect(response.status).toBe(404)
        expect(response.body.error).toBe("Task not found")
    })


    //for title is empty
    test("POST /tasks should reject empty title", async () => {

        const response = await request(app)
            .post("/tasks")
            .send({
                title: ""
            })

        // console.log(response.status)
        // console.log(response.body)

        expect(response.status).toBe(400)
        expect(response.body.error).toBe(
            "title is required and must be a non-empty string"
        )
    })

    //for invalid priority
    test("POST /tasks should reject invalid priority", async () => {

        const response = await request(app)
            .post("/tasks")
            .send({
                title: "Test task",
                priority: "urgent"
            })

        // console.log(response.status)
        // console.log(response.body)

        expect(response.status).toBe(400)
    })

    // for get all tasks statuses
    test("GET /tasks/stats should return task statistics", async () => {
        const response = await request(app)
            .get("/tasks/stats")

        // console.log(response.status)
        // console.log(response.body)

        expect(response.status).toBe(200)

        expect(response.body).toHaveProperty("todo")
        expect(response.body).toHaveProperty("in_progress")
        expect(response.body).toHaveProperty("done")
        expect(response.body).toHaveProperty("overdue")
    })


    //for correct task statistics
    test("GET /tasks/stats should return correct task statistics", async () => {

        await request(app)
            .post("/tasks")
            .send({
                title: "Todo task",
                status: "todo"
            })

        await request(app)
            .post("/tasks")
            .send({
                title: "In progress task",
                status: "in_progress"
            })

        const doneResponse = await request(app)
            .post("/tasks")
            .send({
                title: "Done task"
            })

        await request(app)
            .patch(`/tasks/${doneResponse.body.id}/complete`)

        const response = await request(app)
            .get("/tasks/stats")

        expect(response.status).toBe(200)

        expect(response.body.todo).toBe(1)
        expect(response.body.in_progress).toBe(1)
        expect(response.body.done).toBe(1)
        expect(response.body.overdue).toBe(0)
    })


    //for invalide update
    test("PUT /tasks/:id should reject invalid priority", async () => {

        const createResponse = await request(app)
            .post("/tasks")
            .send({
                title: "Test update"
            })

        const taskId = createResponse.body.id

        const response = await request(app)
            .put(`/tasks/${taskId}`)
            .send({
                priority: "urgent"
            })

        // console.log(response.status)
        // console.log(response.body)

        expect(response.status).toBe(400)
    })

    //for after deleting get the same task
    test("DELETE /tasks/:id should remove the task", async () => {

        const createResponse = await request(app)
            .post("/tasks")
            .send({
                title: "Delete this task"
            })

        const taskId = createResponse.body.id

        const deleteResponse = await request(app)
            .delete(`/tasks/${taskId}`)

        // console.log(deleteResponse.status)

        expect(deleteResponse.status).toBe(204)

        const getResponse = await request(app)
            .get("/tasks")

        const deletedTask = getResponse.body.find(
            task => task.id === taskId
        )

        expect(deletedTask).toBeUndefined()
    })

    //for assign an assigned task
    test("it will assign an unassigned task", async () => {
        const createResponse = await request(app)
            .post("/tasks")
            .send({
                title: "Task to assign"
            })

        const taskId = createResponse.body.id

        const response = await request(app)
            .patch(`/tasks/${taskId}/assign`)
            .send({
                assignee: "Gaurav"
            })

        expect(response.status).toBe(200)
        expect(response.body.assignee).toBe("Gaurav")
    })

    //for assignee is not found
    test("it will return 400 when assignee is missing", async () => {
        const createResponse = await request(app)
            .post("/tasks")
            .send({
                title: "Task to assign"
            })

        const taskId = createResponse.body.id

        const response = await request(app)
            .patch(`/tasks/${taskId}/assign`)
            .send({})

        expect(response.status).toBe(400)
        expect(response.body.error).toBe("assignee is required and must be a non-empty string")
    })

    //for assignee is empty
    test("it will return 400 when assignee is empty", async () => {
        const createResponse = await request(app)
            .post("/tasks")
            .send({
                title: "Task to assign"
            })

        const taskId = createResponse.body.id

        const response = await request(app)
            .patch(`/tasks/${taskId}/assign`)
            .send({
                assignee: "   "
            })

        expect(response.status).toBe(400)
    })

    //for task doesn't exit while assignment
    test("it will return 404 when task does not exist", async () => {
        const response = await request(app)
            .patch("/tasks/non-existing-id/assign")
            .send({
                assignee: "Gaurav"
            })

        expect(response.status).toBe(404)
        expect(response.body.error).toBe("Task not found")
    })

    //for task is already assign
    test("it will return 409 when task is already assigned", async () => {
        const createResponse = await request(app)
            .post("/tasks")
            .send({
                title: "Task to assign"
            })

        const taskId = createResponse.body.id

        // First assignment
        await request(app)
            .patch(`/tasks/${taskId}/assign`)
            .send({
                assignee: "Gaurav"
            })

        // Try to assign the same task again
        const response = await request(app)
            .patch(`/tasks/${taskId}/assign`)
            .send({
                assignee: "UV"
            })

        expect(response.status).toBe(409)
        expect(response.body.error).toBe("Task is already assigned")
    })


    //for task by id
    test("GET /tasks/:id should return a task", async () => {
        const createResponse = await request(app)
            .post("/tasks")
            .send({
                title: "Learn Node.js"
            })

        const id = createResponse.body.id

        const response = await request(app).get(`/tasks/${id}`)

        expect(response.status).toBe(200)
        expect(response.body.id).toBe(id)
        expect(response.body.title).toBe("Learn Node.js")
    })

    // for task by id when task does not exist
    test("GET /tasks/:id should return 404 when task does not exist", async () => {
        const response = await request(app)
            .get("/tasks/non-existing-id")

        expect(response.status).toBe(404)
        expect(response.body.error).toBe("Task not found")
    })


    // for priority filtering
    test("GET /tasks?priority=high should return high priority tasks", async () => {
        await request(app)
            .post("/tasks")
            .send({
                title: "High priority task",
                priority: "high"
            })

        const response = await request(app)
            .get("/tasks?priority=high")

        expect(response.status).toBe(200)
        expect(response.body).toHaveLength(1)
        expect(response.body[0].priority).toBe("high")
    })

    // Test filtering tasks by assignee
    test("GET /tasks?assignee=Gaurav should return assigned tasks", async () => {
        const createResponse = await request(app)
            .post("/tasks")
            .send({
                title: "Assigned task"
            })

        await request(app)
            .patch(`/tasks/${createResponse.body.id}/assign`)
            .send({
                assignee: "Gaurav"
            })

        const response = await request(app).get("/tasks?assignee=Gaurav")

        expect(response.status).toBe(200)
        expect(response.body).toHaveLength(1)
        expect(response.body[0].assignee).toBe("Gaurav")
    })


    // for searching tasks by title
    test("GET /tasks?search=login should return matching tasks", async () => {
        await request(app)
            .post("/tasks")
            .send({
                title: "Fix login page"
            })

        await request(app)
            .post("/tasks")
            .send({
                title: "Create dashboard"
            })

        const response = await request(app)
            .get("/tasks?search=login")

        expect(response.status).toBe(200)
        expect(response.body).toHaveLength(1)
        expect(response.body[0].title).toBe("Fix login page")
    })


    //for insensitive case while seraching
    test("GET /tasks?search=LOGIN should be case insensitive", async () => {
    await request(app)
        .post("/tasks")
        .send({
            title: "Fix login page"
        })

    const response = await request(app)
        .get("/tasks?search=LOGIN")

    expect(response.status).toBe(200)
    expect(response.body).toHaveLength(1)
    expect(response.body[0].title).toBe("Fix login page")
})


//for filter by priority and assignee
test("it will filter tasks by priority and assignee", () => {
    taskService.create({
        title: "High Gaurav task",
        priority: "high"
    })

    taskService.assignTask(
        taskService.getAll()[0].id,
        "Gaurav"
    )

    taskService.create({
        title: "Low Gaurav task",
        priority: "low"
    })

    taskService.assignTask(
        taskService.getAll()[1].id,
        "Gaurav"
    )

    taskService.create({
        title: "High UV task",
        priority: "high"
    })

    taskService.assignTask(
        taskService.getAll()[2].id,
        "UV"
    )

    const tasks = taskService.filterTasks({
        priority: "high",
        assignee: "Gaurav"
    })

    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toBe("High Gaurav task")
})

    // for combined priority and assignee filtering
    test("GET /tasks?priority=high&assignee=Gaurav should return matching tasks", async () => {
        const task1 = await request(app)
            .post("/tasks")
            .send({
                title: "High Gaurav task",
                priority: "high"
            })

        await request(app)
            .patch(`/tasks/${task1.body.id}/assign`)
            .send({
                assignee: "Gaurav"
            })

        const task2 = await request(app)
            .post("/tasks")
            .send({
                title: "High UV task",
                priority: "high"
            })

        await request(app)
            .patch(`/tasks/${task2.body.id}/assign`)
            .send({
                assignee: "UV"
            })

        const response = await request(app)
            .get("/tasks?priority=high&assignee=Gaurav")

        expect(response.status).toBe(200)
        expect(response.body).toHaveLength(1)
        expect(response.body[0].title).toBe("High Gaurav task")
        expect(response.body[0].priority).toBe("high")
        expect(response.body[0].assignee).toBe("Gaurav")
    })

})