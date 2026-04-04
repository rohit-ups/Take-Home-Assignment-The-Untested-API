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

const validateAssignTask = (body) => {
  // assignee field must be present
  if (body.assignee === undefined) {
    return 'assignee is required';
  }

  // must be a string type
  if (typeof body.assignee !== 'string') {
    return 'assignee must be a string';
  }

  // must not be empty or whitespace only
  if (body.assignee.trim() === '') {
    return 'assignee must be a non-empty string';
  }

  // must not be a meaningless placeholder value
  const invalidValues = ['null', 'undefined', 'none'];
  if (invalidValues.includes(body.assignee.trim().toLowerCase())) {
    return 'assignee must be a valid name';
  }

  // reasonable length cap
  if (body.assignee.trim().length > 100) {
    return 'assignee name must be under 100 characters';
  }

  return null;
};

module.exports = { validateCreateTask, validateUpdateTask, validateAssignTask };