const request = require("supertest");

const app = require("../src/app");

describe("App Tests", () => {
  it("should return 500 when an internal error occurs", async () => {
    app.get("/test-error", (req, res, next) => {
      const err = new Error("Something went wrong");
      next(err);
    });

    const res = await request(app).get("/test-error");

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe("Internal server error");
  });

  it("should return 404 for unknown routes", async () => {
    const res = await request(app).get("/unknown-route");
    expect(res.statusCode).toBe(404);
  });

  test("app should be defined and have listen function", () => {
    expect(app).toBeDefined();
    expect(typeof app.listen).toBe("function");
  });
});
