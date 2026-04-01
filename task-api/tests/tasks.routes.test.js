const request = require("supertest");
const app = require("../src/app");
const taskService = require("../src/services/taskService")

describe("POST /tasks", ()=> {
    
    beforeEach(()=>{
            taskService._reset();
        })

    test("should create task", async()=> {
        const res =
        await request(app)
            .post("/tasks")
            .send({
                title: "API task"
            })

            expect(res.body.title)
            .toBe("API task")
        
    })

    test("should fail without title", async()=> {
        const res = 
        await request(app)
            .post("/tasks")
            .send({})

        expect(res.statusCode)
        .toBe(400);
    })

    test("should return tasks when no query is provided", async()=> {

        await request(app)
            .post("/tasks")
            .send({
                title:"Task 2" 
            })

        await request(app)
            .post("/tasks")
            .send({
                title:"Task 2"
            }) 

        const res = 
        await request(app)
            .get("/tasks")

        expect(res.body.length)
        .toBe(2)
    })
})