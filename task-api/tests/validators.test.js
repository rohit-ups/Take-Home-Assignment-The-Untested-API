const {
  validateCreateTask,
  validateUpdateTask,
} = require("../src/utils/validators");

describe("validators Unit Tests", () => {
  describe("validateCreateTask", () => {
    test("returns null for valid payload", () => {
      const err = validateCreateTask({
        title: "Build feature",
        priority: "high",
        status: "todo",
      });
      expect(err).toBeNull();
    });

    test("rejects missing or empty title", () => {
      expect(validateCreateTask({})).toContain("title is required");
      expect(validateCreateTask({ title: "   " })).toContain(
        "title is required",
      );
    });

    test("rejects invalid status", () => {
      const err = validateCreateTask({
        title: "Valid",
        status: "invalid_status",
      });
      expect(err).toContain("status must be one of");
    });

    test("rejects invalid priority", () => {
      const err = validateCreateTask({ title: "Valid", priority: "critical" });
      expect(err).toContain("priority must be one of");
    });

    test("rejects invalid ISO dueDate", () => {
      const err = validateCreateTask({
        title: "Valid",
        dueDate: "invalid-date",
      });
      expect(err).toContain("dueDate must be a valid ISO date string");
    });
  });

  describe("validateUpdateTask", () => {
    test("returns null for empty or valid partial update", () => {
      expect(validateUpdateTask({})).toBeNull();
      expect(validateUpdateTask({ status: "done" })).toBeNull();
    });

    test("rejects whitespace title on update", () => {
      expect(validateUpdateTask({ title: "   " })).toContain(
        "title must be a non-empty string",
      );
    });
  });
});
