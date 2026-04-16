const VALID_STATUSES = ["todo", "in_progress", "done"];
const VALID_PRIORITIES = ["low", "medium", "high"];

const validateCreateTask = (body) => {
  if (
    !body.title ||
    typeof body.title !== "string" ||
    body.title.trim() === ""
  ) {
    return "title is required and must be a non-empty string";
  }
  if (body.status && !VALID_STATUSES.includes(body.status)) {
    return `status must be one of: ${VALID_STATUSES.join(", ")}`;
  }
  if (body.priority && !VALID_PRIORITIES.includes(body.priority)) {
    return `priority must be one of: ${VALID_PRIORITIES.join(", ")}`;
  }
  if (body.dueDate && isNaN(Date.parse(body.dueDate))) {
    return "dueDate must be a valid ISO date string";
  }
  return null;
};

const validateUpdateTask = (body) => {
  if (
    body.title !== undefined &&
    (typeof body.title !== "string" || body.title.trim() === "")
  ) {
    return "title must be a non-empty string";
  }
  if (body.status && !VALID_STATUSES.includes(body.status)) {
    return `status must be one of: ${VALID_STATUSES.join(", ")}`;
  }
  if (body.priority && !VALID_PRIORITIES.includes(body.priority)) {
    return `priority must be one of: ${VALID_PRIORITIES.join(", ")}`;
  }
  if (body.dueDate && isNaN(Date.parse(body.dueDate))) {
    return "dueDate must be a valid ISO date string";
  }
  return null;
};

/*
 * validateAssignTask: validates the body for PATCH /tasks/:id/assign.
 * Rejects null, non-string, empty, whitespace-only, and excessively long names.
 * The 100-char limit is a reasonable guard against unbounded input.
 */
const validateAssignTask = (body) => {
  if (body === null || body === undefined) {
    return "Request body is required";
  }
  if (body.assignee === undefined) {
    return "assignee is required";
  }
  if (typeof body.assignee !== "string") {
    return "assignee must be a string";
  }
  if (body.assignee.trim() === "") {
    return "assignee cannot be empty or whitespace";
  }
  if (body.assignee.trim().length > 100) {
    return "assignee name cannot exceed 100 characters";
  }
  return null;
};

module.exports = { validateCreateTask, validateUpdateTask, validateAssignTask };
