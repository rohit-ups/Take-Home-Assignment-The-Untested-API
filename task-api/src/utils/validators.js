const VALID_STATUSES = ['todo', 'in_progress', 'done'];
const VALID_PRIORITIES = ['low', 'medium', 'high'];
const PROTECTED_UPDATE_FIELDS = ['id', 'createdAt', 'completedAt'];
const MUTABLE_UPDATE_FIELDS = ['title', 'description', 'status', 'priority', 'dueDate'];
const VALID_ASSIGN_FIELDS = ['assignee'];

const isValidFutureDueDate = (dueDate) => {
  const parsedDate = Date.parse(dueDate);
  if (isNaN(parsedDate)) {
    return false;
  }

  return parsedDate > Date.now();
};

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
  if (body.dueDate !== undefined) {
    if (!isValidFutureDueDate(body.dueDate)) {
      return 'dueDate must be a valid ISO date string in the future';
    }
  }
  return null;
};

const validateUpdateTask = (body) => {
  const protectedField = PROTECTED_UPDATE_FIELDS.find((field) => body[field] !== undefined);
  if (protectedField) {
    return `${protectedField} cannot be updated`;
  }

  const invalidField = Object.keys(body).find(
    (field) => !MUTABLE_UPDATE_FIELDS.includes(field) && !PROTECTED_UPDATE_FIELDS.includes(field)
  );
  if (invalidField) {
    return `${invalidField} is not a valid task field`;
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
  if (body.dueDate !== undefined) {
    if (!isValidFutureDueDate(body.dueDate)) {
      return 'dueDate must be a valid ISO date string in the future';
    }
  }
  return null;
};

const validateAssignTask = (body) => {
  const invalidField = Object.keys(body).find((field) => !VALID_ASSIGN_FIELDS.includes(field));
  if (invalidField) {
    return `${invalidField} is not a valid task field`;
  }

  if (body.assignee === undefined) {
    return 'assignee is required';
  }

  if (typeof body.assignee !== 'string' || body.assignee.trim() === '') {
    return 'assignee must be a non-empty string';
  }

  return null;
};

module.exports = { validateCreateTask, validateUpdateTask, validateAssignTask };
