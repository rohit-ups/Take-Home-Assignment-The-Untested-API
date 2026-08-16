const {
    validateCreateTask,
    validateUpdateTask
  } = require("../src/utils/validators");


  describe("validateCreateTask", () => {
    test("should accept a valid task", () => {
      const error = validateCreateTask({
        title: "Learn Jest",
        status: "todo",
        priority: "high"
      });
  
      expect(error).toBeNull();
    });
  
    test("should reject a missing title", () => {
      const error = validateCreateTask({
        priority: "high"
      });
  
      expect(error).toBe("title is required and must be a non-empty string");
    });
  
    test("should reject an invalid status", () => {
      const error = validateCreateTask({
        title: "Test",
        status: "completed"
      });
  
      expect(error).toContain("status must be one of");
    });
  
    test("should reject an invalid priority", () => {
      const error = validateCreateTask({
        title: "Test",
        priority: "urgent"
      });
  
      expect(error).toContain("priority must be one of");
    });
  });

  describe("validateUpdateTask", () => {
    test("should accept a valid partial update", () => {
      const error = validateUpdateTask({
        priority: "high"
      });
  
      expect(error).toBeNull();
    });
  
    test("should reject an empty title", () => {
      const error = validateUpdateTask({
        title: "   "
      });
  
      expect(error).toBe("title must be a non-empty string");
    });
  
    test("should reject an invalid status", () => {
      const error = validateUpdateTask({
        status: "completed"
      });
  
      expect(error).toContain("status must be one of");
    });
  });