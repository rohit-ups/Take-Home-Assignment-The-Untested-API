const {
  validateCreateTask,
  validateUpdateTask,
  validateAssignTask,
} = require("../src/utils/validators");

describe("validators Unit Tests", () => {
  describe("validateCreateTask", () => {
    test("returns null for valid payload", () => {
      const err = validateCreateTask({
        title: "Build feature",
        priority: "high",
        status: "todo",
        dueDate: new Date().toISOString(),
      });
      expect(err).toBeNull();
    });

    test("rejects missing or empty title", () => {
      expect(validateCreateTask({})).toContain("title is required");
      expect(validateCreateTask({ title: "   " })).toContain(
        "title is required",
      );
      expect(validateCreateTask({ title: 123 })).toContain("title is required");
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
      expect(
        validateUpdateTask({
          status: "done",
          priority: "low",
          dueDate: new Date().toISOString(),
        }),
      ).toBeNull();
    });

    test("rejects whitespace or non-string title on update", () => {
      expect(validateUpdateTask({ title: "   " })).toContain(
        "title must be a non-empty string",
      );
      expect(validateUpdateTask({ title: 123 })).toContain(
        "title must be a non-empty string",
      );
    });

    test("rejects invalid status on update", () => {
      const err = validateUpdateTask({ status: "invalid_status" });
      expect(err).toContain("status must be one of");
    });

    test("rejects invalid priority on update", () => {
      const err = validateUpdateTask({ priority: "critical" });
      expect(err).toContain("priority must be one of");
    });

    test("rejects invalid ISO dueDate on update", () => {
      const err = validateUpdateTask({ dueDate: "invalid-date" });
      expect(err).toContain("dueDate must be a valid ISO date string");
    });
  });

  describe("validateAssignTask", () => {
    test("returns null for valid assignee", () => {
      expect(validateAssignTask({ assignee: "Alice" })).toBeNull();
    });

    test("rejects null or non-object body", () => {
      expect(validateAssignTask(null)).toContain(
        "request body must be an object",
      );
      expect(validateAssignTask("string")).toContain(
        "request body must be an object",
      );
    });

    test("rejects missing, empty, or non-string assignee", () => {
      expect(validateAssignTask({})).toContain("assignee is required");
      expect(validateAssignTask({ assignee: "   " })).toContain(
        "assignee is required",
      );
      expect(validateAssignTask({ assignee: 123 })).toContain(
        "assignee is required",
      );
    });
  });
});
