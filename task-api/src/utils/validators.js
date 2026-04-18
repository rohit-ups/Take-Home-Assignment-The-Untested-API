const VALID_STATUSES = ['todo', 'in_progress', 'done'];
const VALID_PRIORITIES = ['low', 'medium', 'high'];

const validateCreateTask = (body) => {
  if (!body.title || typeof body.title !== 'string' || body.title.trim() === '') {
    return 'title is required and must be a non-empty string';
  }
  if (body.status && !VALID_STATUSES.includes(body.status)) {
    return `status must be one of: ${VALID_STATUSES.join(', ')}`;
  }
  if (body.priority && !VALID_PRIORITIES.includes(body.priority)) {
    return `priority must be one of: ${VALID_PRIORITIES.join(', ')}`;
  }
  if (body.dueDate && isNaN(Date.parse(body.dueDate))) {
    return 'dueDate must be a valid ISO date string';
  }
  return null;
};

const validateUpdateTask = (body) => {
  if (body.title !== undefined && (typeof body.title !== 'string' || body.title.trim() === '')) {
    return 'title must be a non-empty string';
  }
  if (body.status && !VALID_STATUSES.includes(body.status)) {
    return `status must be one of: ${VALID_STATUSES.join(', ')}`;
  }
  if (body.priority && !VALID_PRIORITIES.includes(body.priority)) {
    return `priority must be one of: ${VALID_PRIORITIES.join(', ')}`;
  }
  if (body.dueDate && isNaN(Date.parse(body.dueDate))) {
    return 'dueDate must be a valid ISO date string';
  }
  return null;
};

/**
 * Validates the request body for the PATCH /tasks/:id/assign endpoint.
 *
 * Rules:
 * - `assignee` must be present in the body
 * - `assignee` must be a string (not a number, boolean, etc.)
 * - `assignee` must not be empty or whitespace-only after trimming
 *
 * @param {object} body - The request body
 * @returns {string|null} Error message if invalid, null if valid
 */
const validateAssignTask = (body) => {
  if (body.assignee === undefined || body.assignee === null) {
    return 'assignee is required';
  }
  if (typeof body.assignee !== 'string') {
    return 'assignee must be a string';
  }
  if (body.assignee.trim() === '') {
    return 'assignee must be a non-empty string';
  }
  return null;
};

module.exports = { validateCreateTask, validateUpdateTask, validateAssignTask };
