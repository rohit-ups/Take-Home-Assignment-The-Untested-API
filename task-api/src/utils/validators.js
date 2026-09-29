const VALID_STATUSES = ['todo', 'in_progress', 'done'];
const VALID_PRIORITIES = ['low', 'medium', 'high'];

// Optional fields are checked whenever they are present (!== undefined), not
// only when truthy: a truthiness check let null and "" skip validation (#4).
// dueDate is the exception, because null is its documented "no due date" value.

const validateCreateTask = (body) => {
  if (!body.title || typeof body.title !== 'string' || body.title.trim() === '') {
    return 'title is required and must be a non-empty string';
  }
  if (body.status !== undefined && !VALID_STATUSES.includes(body.status)) {
    return `status must be one of: ${VALID_STATUSES.join(', ')}`;
  }
  if (body.priority !== undefined && !VALID_PRIORITIES.includes(body.priority)) {
    return `priority must be one of: ${VALID_PRIORITIES.join(', ')}`;
  }
  if (body.dueDate !== undefined && body.dueDate !== null && isNaN(Date.parse(body.dueDate))) {
    return 'dueDate must be a valid ISO date string';
  }
  return null;
};

const validateUpdateTask = (body) => {
  if (body.title !== undefined && (typeof body.title !== 'string' || body.title.trim() === '')) {
    return 'title must be a non-empty string';
  }
  if (body.status !== undefined && !VALID_STATUSES.includes(body.status)) {
    return `status must be one of: ${VALID_STATUSES.join(', ')}`;
  }
  if (body.priority !== undefined && !VALID_PRIORITIES.includes(body.priority)) {
    return `priority must be one of: ${VALID_PRIORITIES.join(', ')}`;
  }
  if (body.dueDate !== undefined && body.dueDate !== null && isNaN(Date.parse(body.dueDate))) {
    return 'dueDate must be a valid ISO date string';
  }
  return null;
};

const MAX_ASSIGNEE_LENGTH = 100;

// assignee is a person's name, or null to unassign the task.
const validateAssignTask = (body) => {
  if (body.assignee === undefined) {
    return 'assignee is required (a name, or null to unassign)';
  }
  if (body.assignee === null) {
    return null;
  }
  if (typeof body.assignee !== 'string' || body.assignee.trim() === '') {
    return 'assignee must be a non-empty string, or null to unassign';
  }
  if (body.assignee.trim().length > MAX_ASSIGNEE_LENGTH) {
    return `assignee must be at most ${MAX_ASSIGNEE_LENGTH} characters`;
  }
  return null;
};

module.exports = { validateCreateTask, validateUpdateTask, validateAssignTask };
