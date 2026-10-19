const VALID_STATUSES = ['todo', 'in_progress', 'done'];
const VALID_PRIORITIES = ['low', 'medium', 'high'];
const TASK_FIELDS = ['title', 'description', 'status', 'priority', 'dueDate'];

const isObject = (body) => body !== null && typeof body === 'object' && !Array.isArray(body);
const isNonEmptyString = (value) => typeof value === 'string' && value.trim() !== '';

// Accept timezone-qualified ISO timestamps, not locale-dependent date strings.
const isISODate = (value) => {
  if (typeof value !== 'string') return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})T([01]\d|2[0-3]):([0-5]\d):([0-5]\d)(?:\.\d{1,3})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.exec(value);
  if (!match) return false;
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1]
    && !Number.isNaN(Date.parse(value));
};

const validateTask = (body, requireTitle) => {
  if (!isObject(body)) return 'body must be a JSON object';
  if (Object.keys(body).some((key) => !TASK_FIELDS.includes(key))) {
    return `only these fields may be supplied: ${TASK_FIELDS.join(', ')}`;
  }
  if ((requireTitle || body.title !== undefined) && !isNonEmptyString(body.title)) {
    return 'title is required and must be a non-empty string';
  }
  if (body.description !== undefined && typeof body.description !== 'string') {
    return 'description must be a string';
  }
  if (body.status !== undefined && !VALID_STATUSES.includes(body.status)) {
    return `status must be one of: ${VALID_STATUSES.join(', ')}`;
  }
  if (body.priority !== undefined && !VALID_PRIORITIES.includes(body.priority)) {
    return `priority must be one of: ${VALID_PRIORITIES.join(', ')}`;
  }
  if (body.dueDate !== undefined && body.dueDate !== null && !isISODate(body.dueDate)) {
    return 'dueDate must be a valid ISO timestamp with a timezone, or null';
  }
  return null;
};

const validateCreateTask = (body) => validateTask(body, true);
const validateUpdateTask = (body) => validateTask(body, false);

const validateListQuery = ({ status, page, limit }) => {
  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    return `status must be one of: ${VALID_STATUSES.join(', ')}`;
  }
  for (const [name, value] of [['page', page], ['limit', limit]]) {
    if (value !== undefined && (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)
      || !Number.isSafeInteger(Number(value)))) {
      return `${name} must be a positive integer`;
    }
  }
  if (!Number.isSafeInteger((Number(page ?? 1) - 1) * Number(limit ?? 10))) {
    return 'pagination offset is too large';
  }
  return null;
};

const validateAssignTask = (body) => {
  if (!isObject(body)) return 'body must be a JSON object';
  if (Object.keys(body).some((key) => key !== 'assignee')) return 'only assignee may be supplied';
  if (!isNonEmptyString(body.assignee)) return 'assignee must be a non-empty string';
  return null;
};

module.exports = { validateCreateTask, validateUpdateTask, validateListQuery, validateAssignTask };
