const request = require("supertest");
const app = require("../src/app");
const taskService = require("../src/services/taskService");

beforeEach(() => {
    taskService._reset();
});

describe("Task API", () => {

    test("GET /tasks should return empty array", async () => {
        const res = await request(app).get("/tasks");

        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual([]);
    });

    test("POST /tasks should create task", async () => {
        const res = await request(app)
            .post("/tasks")
            .send({
                title: "Learn Jest",
                priority: "high"
            });

        expect(res.statusCode).toBe(201);
        expect(res.body.title).toBe("Learn Jest");
    });

    test("POST /tasks should reject invalid body", async () => {
        const res = await request(app)
            .post("/tasks")
            .send({});

        expect(res.statusCode).toBe(400);
    });

    test("DELETE unknown task returns 404", async () => {
        const res = await request(app)
            .delete("/tasks/unknown-id");

        expect(res.statusCode).toBe(404);
    });

    test("GET /tasks?status=todo should filter tasks", async () => {
        await request(app).post("/tasks").send({ title: "Task 1", status: "todo" });
        await request(app).post("/tasks").send({ title: "Task 2", status: "done" });

        const res = await request(app).get("/tasks?status=todo");

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveLength(1);
        expect(res.body[0].status).toBe("todo");
    });

    test("GET /tasks?page=1&limit=1 should paginate", async () => {
        await request(app).post("/tasks").send({ title: "Task 1" });
        await request(app).post("/tasks").send({ title: "Task 2" });

        const res = await request(app).get("/tasks?page=1&limit=1");

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveLength(1);
    });

    test("GET /tasks/stats should return statistics", async () => {
        await request(app).post("/tasks").send({ title: "Task 1", status: "todo" });
        await request(app).post("/tasks").send({ title: "Task 2", status: "done" });

        const res = await request(app).get("/tasks/stats");

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty("todo");
        expect(res.body).toHaveProperty("done");
    });

    test("PUT /tasks/:id should update task", async () => {
        const create = await request(app)
            .post("/tasks")
            .send({ title: "Old Task" });

        const res = await request(app)
            .put(`/tasks/${create.body.id}`)
            .send({ title: "Updated Task" });

        expect(res.statusCode).toBe(200);
        expect(res.body.title).toBe("Updated Task");
    });

    test("PUT /tasks/:id should return 404", async () => {
        const res = await request(app)
            .put("/tasks/invalid-id")
            .send({ title: "Updated Task" });

        expect(res.statusCode).toBe(404);
    });

    test("PATCH /tasks/:id/complete should complete task", async () => {
        const create = await request(app)
            .post("/tasks")
            .send({ title: "Complete Me", priority: "high" });

        const res = await request(app)
            .patch(`/tasks/${create.body.id}/complete`);

        expect(res.statusCode).toBe(200);
        expect(res.body.status).toBe("done");
        expect(res.body.priority).toBe("high");
    });

    test("PATCH /tasks/:id/complete should return 404", async () => {
        const res = await request(app)
            .patch("/tasks/invalid-id/complete");

        expect(res.statusCode).toBe(404);
    });

});