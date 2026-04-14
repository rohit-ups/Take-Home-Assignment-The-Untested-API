/*
 * File Role:
 * This module centralizes pure validation rules for task payloads and list query params.
 * Keeping these checks outside route handlers makes request validation deterministic,
 * testable in isolation, and reusable across multiple endpoints.
 */

/*
 * Exported status vocabulary is reused by validation and tests so business rules
 * stay in sync across runtime behavior and contract verification.
 */
const VALID_STATUSES = ['todo', 'in_progress', 'done'];

/*
 * Exported priority vocabulary serves the same purpose as statuses: one source of truth
 * for API contract enforcement and stable test assertions.
 */
const VALID_PRIORITIES = ['low', 'medium', 'high'];

/**
 * WHY: Prevents inherited prototype keys from being treated as user input fields.
 * HOW: Uses Object.prototype.hasOwnProperty.call to safely check own enumerable keys.
 *
 * @param {object} obj - Candidate object that may contain a field.
 * @param {string} key - Field name to validate as explicitly provided.
 * @returns {boolean} True only when the key exists directly on the input object.
 * @behavior Shields validation logic from prototype pollution style edge cases.
 */
const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

/**
 * WHY: dueDate is optional and business logic permits explicit null to mean
 * "no deadline" while still rejecting malformed values.
 * HOW: First allows null, then requires a string, then checks parseability.
 * Both typeof and Date.parse checks are needed: non-strings are rejected early,
 * and malformed strings are rejected by parse validation.
 *
 * @param {unknown} value - Candidate due date value from request data.
 * @returns {boolean} True when value is null or a parseable ISO-like date string.
 * @behavior Accepts null intentionally for optional deadline semantics.
 */
const isValidOptionalIsoDate = (value) => {
  if (value === null) {
    return true;
  }

  if (typeof value !== 'string') {
    return false;
  }

  // Date.parse accepts ISO-8601 strings and rejects malformed date values.
  return !Number.isNaN(Date.parse(value));
};

/**
 * WHY: Pagination must reject zeros, negatives, and decimals to prevent ambiguous slices.
 * HOW: Requires integer type and a value greater than zero.
 *
 * @param {number} value - Numeric pagination candidate.
 * @returns {boolean} True when value is a positive integer.
 * @behavior Enforces stable paging semantics for all list endpoints.
 */
const isPositiveInteger = (value) => Number.isInteger(value) && value > 0;

/**
 * WHY: Create endpoint must reject incomplete or malformed payloads before writing data.
 * HOW: Validates required title and optional fields when clients provide them.
 *
 * @param {object} body - Incoming POST /tasks request body.
 * @returns {string|null} Validation error message or null when payload is accepted.
 * @behavior Fails fast so route handlers avoid persisting invalid task records.
 */
const validateCreateTask = (body) => {
  // Create requires title and enforces optional field shapes when present.
  if (!body.title || typeof body.title !== 'string' || body.title.trim() === '') {
    return 'title is required and must be a non-empty string';
  }
  if (hasOwn(body, 'description') && typeof body.description !== 'string') {
    return 'description must be a string';
  }
  if (body.status && !VALID_STATUSES.includes(body.status)) {
    return `status must be one of: ${VALID_STATUSES.join(', ')}`;
  }
  if (body.priority && !VALID_PRIORITIES.includes(body.priority)) {
    return `priority must be one of: ${VALID_PRIORITIES.join(', ')}`;
  }
  if (hasOwn(body, 'dueDate') && !isValidOptionalIsoDate(body.dueDate)) {
    return 'dueDate must be a valid ISO date string';
  }
  return null;
};

/**
 * WHY: Update endpoint allows partial edits but still protects contract correctness.
 * HOW: Rejects non-object/empty payloads, validates optional scalar types, and allows
 * null assignee to support unassigning through generic update semantics.
 *
 * @param {object} body - Incoming PUT /tasks/:id request body.
 * @returns {string|null} Validation error message or null when payload is accepted.
 * @behavior Allows null assignee and null dueDate in updates to support explicit clearing.
 */
const validateUpdateTask = (body) => {
  // Update rejects non-object payloads and no-op empty objects.
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return 'body must be an object';
  }
  if (Object.keys(body).length === 0) {
    return 'at least one field must be provided';
  }
  if (body.title !== undefined && (typeof body.title !== 'string' || body.title.trim() === '')) {
    return 'title must be a non-empty string';
  }
  if (body.description !== undefined && typeof body.description !== 'string') {
    return 'description must be a string';
  }
  if (body.status && !VALID_STATUSES.includes(body.status)) {
    return `status must be one of: ${VALID_STATUSES.join(', ')}`;
  }
  if (body.priority && !VALID_PRIORITIES.includes(body.priority)) {
    return `priority must be one of: ${VALID_PRIORITIES.join(', ')}`;
  }
  if (hasOwn(body, 'dueDate') && !isValidOptionalIsoDate(body.dueDate)) {
    return 'dueDate must be a valid ISO date string';
  }
  if (
    body.assignee !== undefined &&
    body.assignee !== null &&
    (typeof body.assignee !== 'string' || body.assignee.trim() === '')
  ) {
    return 'assignee must be a non-empty string when provided';
  }

  return null;
};

/**
 * WHY: Assignment endpoint has a stricter contract than generic update.
 * HOW: Requires a non-empty assignee string and does not permit null because this endpoint
 * represents assignment intent, not unassignment.
 *
 * @param {object} body - Incoming PATCH /tasks/:id/assign request body.
 * @returns {string|null} Validation error message or null when payload is accepted.
 * @behavior Rejects null/empty assignee to keep assignment operation explicit.
 */
const validateAssignTask = (body) => {
  // Assignment API intentionally allows only explicit non-empty assignee strings.
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return 'body must be an object';
  }
  if (typeof body.assignee !== 'string' || body.assignee.trim() === '') {
    return 'assignee is required and must be a non-empty string';
  }

  return null;
};

/**
 * WHY: Query validation ensures clients receive predictable errors for invalid filters
 * instead of silent coercion that can produce misleading datasets.
 * HOW: Validates status enum and pagination shape before route-layer data retrieval.
 *
 * @param {object} query - Incoming GET /tasks query object.
 * @returns {string|null} Validation error message or null when query is accepted.
 * @behavior Enforces bounded limit to prevent oversized in-memory response payloads.
 */
const validateListQuery = (query) => {
  // List validation keeps filtering/pagination semantics stable across endpoints.
  if (query.status !== undefined && !VALID_STATUSES.includes(query.status)) {
    return `status must be one of: ${VALID_STATUSES.join(', ')}`;
  }

  if (query.page !== undefined) {
    const page = Number(query.page);
    if (!isPositiveInteger(page)) {
      return 'page must be a positive integer';
    }
  }

  if (query.limit !== undefined) {
    const limit = Number(query.limit);
    if (!isPositiveInteger(limit)) {
      return 'limit must be a positive integer';
    }
    // Bound limit to avoid accidental oversized in-memory responses.
    if (limit > 100) {
      return 'limit must be less than or equal to 100';
    }
  }

  return null;
};

module.exports = {
  VALID_STATUSES,
  VALID_PRIORITIES,
  validateCreateTask,
  validateUpdateTask,
  validateAssignTask,
  validateListQuery,
};
