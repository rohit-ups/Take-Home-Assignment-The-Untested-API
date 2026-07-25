const VALID_STATUSES = ['todo', 'in_progress', 'done'];
const VALID_PRIORITIES = ['low', 'medium', 'high'];

/**
 * Validates request payload for task creation.
 * @param {Object} body - Request body
 * @returns {string|null} Error message if invalid, null if valid
 */
const validateCreateTask = (body) => {
  if (!body || typeof body.title !== 'string' || body.title.trim() === '') {
    return 'title is required and must be a non-empty string';
  }
  if (body.status !== undefined && !VALID_STATUSES.includes(body.status)) {
    return `status must be one of: ${VALID_STATUSES.join(', ')}`;
  }
  if (body.priority !== undefined && !VALID_PRIORITIES.includes(body.priority)) {
    return `priority must be one of: ${VALID_PRIORITIES.join(', ')}`;
  }
  if (body.dueDate !== undefined && body.dueDate !== null && (typeof body.dueDate !== 'string' || isNaN(Date.parse(body.dueDate)))) {
    return 'dueDate must be a valid ISO date string';
  }
  return null;
};

/**
 * Validates request payload for task updates.
 * @param {Object} body - Request body
 * @returns {string|null} Error message if invalid, null if valid
 */
const validateUpdateTask = (body) => {
  if (!body) {
    return 'Request body is required';
  }
  if (body.title !== undefined && (typeof body.title !== 'string' || body.title.trim() === '')) {
    return 'title must be a non-empty string';
  }
  if (body.status !== undefined && !VALID_STATUSES.includes(body.status)) {
    return `status must be one of: ${VALID_STATUSES.join(', ')}`;
  }
  if (body.priority !== undefined && !VALID_PRIORITIES.includes(body.priority)) {
    return `priority must be one of: ${VALID_PRIORITIES.join(', ')}`;
  }
  if (body.dueDate !== undefined && body.dueDate !== null && (typeof body.dueDate !== 'string' || isNaN(Date.parse(body.dueDate)))) {
    return 'dueDate must be a valid ISO date string';
  }
  return null;
};

/**
 * Validates request payload for task assignment.
 * @param {Object} body - Request body containing assignee
 * @returns {string|null} Error message if invalid, null if valid
 */
const validateAssignTask = (body) => {
  if (!body || typeof body.assignee !== 'string' || body.assignee.trim() === '') {
    return 'assignee is required and must be a non-empty string';
  }
  return null;
};

module.exports = {
  VALID_STATUSES,
  VALID_PRIORITIES,
  validateCreateTask,
  validateUpdateTask,
  validateAssignTask,
};

