const request = require("supertest");
const app = require("../src/app");

describe("POST /tasks", ()=> {
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
})