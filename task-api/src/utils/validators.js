const VALID_STATUSES = ['todo', 'in_progress', 'done'];
const VALID_PRIORITIES = ['low', 'medium', 'high'];
const EDITABLE_FIELDS = ['title', 'description', 'status', 'priority', 'dueDate'];

const isObjectBody = (body) =>
  body !== null && typeof body === 'object' && !Array.isArray(body);
const hasOwn = (body, key) => Object.prototype.hasOwnProperty.call(body, key);

// Accept calendar dates or timestamps with an explicit timezone.
const isValidDueDate = (value) => {
  if (value === null) return true;
  if (typeof value !== 'string') return false;
  const iso = /^\d{4}-\d{2}-\d{2}(?:T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d))?$/;
  if (!iso.test(value) || Number.isNaN(Date.parse(value))) return false;
  const calendarDate = value.slice(0, 10);
  const parsedDate = new Date(calendarDate + 'T00:00:00.000Z');
  return !Number.isNaN(parsedDate.getTime()) &&
    parsedDate.toISOString().slice(0, 10) === calendarDate;
};

const validateTaskBody = (body, requireTitle) => {
  if (!isObjectBody(body)) return 'request body must be an object';
  if (Object.keys(body).some(key => !EDITABLE_FIELDS.includes(key))) {
    return 'request contains unsupported fields';
  }
  if ((requireTitle || hasOwn(body, 'title')) &&
      (typeof body.title !== 'string' || body.title.trim() === '')) {
    return 'title must be a non-empty string';
  }
  if (hasOwn(body, 'description') && typeof body.description !== 'string') {
    return 'description must be a string';
  }
  if (hasOwn(body, 'status') && !VALID_STATUSES.includes(body.status)) {
    return 'status must be one of: ' + VALID_STATUSES.join(', ');
  }
  if (hasOwn(body, 'priority') && !VALID_PRIORITIES.includes(body.priority)) {
    return 'priority must be one of: ' + VALID_PRIORITIES.join(', ');
  }
  if (hasOwn(body, 'dueDate') && !isValidDueDate(body.dueDate)) {
    return 'dueDate must be a valid ISO date string or null';
  }
  return null;
};

const validateCreateTask = (body) => validateTaskBody(body, true);
const validateUpdateTask = (body) => validateTaskBody(body, false);

const validateAssignTask = (body) => {
  if (!isObjectBody(body)) return 'request body must be an object';
  if (Object.keys(body).some(key => key !== 'assignee')) {
    return 'request contains unsupported fields';
  }
  if (typeof body.assignee !== 'string' || body.assignee.trim() === '') {
    return 'assignee must be a non-empty string';
  }
  return null;
};

module.exports = { VALID_STATUSES, validateCreateTask, validateUpdateTask, validateAssignTask };
