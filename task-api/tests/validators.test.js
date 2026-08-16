// This is for unit testing the task validators
//
// We are directly testing:
// - validateCreateTask()
// - validateUpdateTask()
// - validateAssignTask()


const {
    validateCreateTask,
    validateUpdateTask,
    validateAssignTask
} = require("../src/utils/validators")


describe("Task Validators", () => {

   
    // validateCreateTask

    // This is for unit testing the create task validator
    // We are directly testing:
    // - valid task data
    // - missing title
    // - empty title
    // - whitespace title
    // - invalid status
    // - invalid priority
    // - invalid dueDate

    describe("validateCreateTask", () => {

        test("should accept valid create task data", () => {
            expect(validateCreateTask({
                title: "Learn Jest",
                status: "todo",
                priority: "high",
                dueDate: "2026-08-20T00:00:00.000Z"
            })).toBeNull()
        })

        test("should reject missing title", () => {
            expect(validateCreateTask({})).toBe(
                "title is required and must be a non-empty string"
            )
        })

        test("should reject empty title", () => {
            expect(validateCreateTask({
                title: ""
            })).toBe(
                "title is required and must be a non-empty string"
            )
        })

        test("should reject whitespace title", () => {
            expect(validateCreateTask({
                title: "   "
            })).toBe(
                "title is required and must be a non-empty string"
            )
        })

        test("should reject invalid status", () => {
            expect(validateCreateTask({
                title: "Test",
                status: "invalid"
            })).toBe(
                "status must be one of: todo, in_progress, done"
            )
        })

        test("should reject invalid priority", () => {
            expect(validateCreateTask({
                title: "Test",
                priority: "invalid"
            })).toBe(
                "priority must be one of: low, medium, high"
            )
        })

        test("should reject invalid dueDate", () => {
            expect(validateCreateTask({
                title: "Test",
                dueDate: "invalid-date"
            })).toBe(
                "dueDate must be a valid ISO date string"
            )
        })
    })


    // validateUpdateTask

    // This is for unit testing the update task validator
    // We are directly testing:
    // - valid update data
    // - update without title
    // - empty title
    // - invalid status
    // - invalid priority
    // - invalid dueDate

    describe("validateUpdateTask", () => {

        test("should accept valid update data", () => {
            expect(validateUpdateTask({
                title: "Updated Task",
                status: "done",
                priority: "high",
                dueDate: "2026-08-20T00:00:00.000Z"
            })).toBeNull()
        })

        test("should accept update without title", () => {
            expect(validateUpdateTask({
                priority: "high"
            })).toBeNull()
        })

        test("should reject empty update title", () => {
            expect(validateUpdateTask({
                title: ""
            })).toBe(
                "title must be a non-empty string"
            )
        })

        test("should reject invalid update status", () => {
            expect(validateUpdateTask({
                status: "invalid"
            })).toBe(
                "status must be one of: todo, in_progress, done"
            )
        })

        test("should reject invalid update priority", () => {
            expect(validateUpdateTask({
                priority: "invalid"
            })).toBe(
                "priority must be one of: low, medium, high"
            )
        })

        test("should reject invalid update dueDate", () => {
            expect(validateUpdateTask({
                dueDate: "invalid-date"
            })).toBe(
                "dueDate must be a valid ISO date string"
            )
        })
    })

    // validateAssignTask
   
    // This is for unit testing the assign task validator
    // We are directly testing:
    // - valid assignee
    // - empty assignee
    // - whitespace assignee
    // - non-string assignee

    describe("validateAssignTask", () => {

        test("should accept a valid assignee", () => {
            expect(validateAssignTask("Gaurav")).toBeNull()
        })

        test("should reject an empty assignee", () => {
            expect(validateAssignTask("")).toBe(
                "assignee is required and must be a non-empty string"
            )
        })

        test("should reject whitespace assignee", () => {
            expect(validateAssignTask("   ")).toBe(
                "assignee is required and must be a non-empty string"
            )
        })

        test("should reject non-string assignee", () => {
            expect(validateAssignTask(123)).toBe(
                "assignee is required and must be a non-empty string"
            )
        })
    })
})