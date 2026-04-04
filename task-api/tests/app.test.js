const request = require("supertest");

const app = require("../src/app");

describe("App Tests", () => {

  test("should return 500 when an internal error occurs", async () => {

    app.get("/error-test", (req, res, next) => {
      next(new Error("Test error"));
    });

    const res = await request(app).get("/error-test");

    expect(res.statusCode).toBe(500);


  });


  test("app should be defined and have listen function", () => {

    expect(app).toBeDefined();
    expect(typeof app.listen).toBe("function");

  });

});