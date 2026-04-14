/*
 * File Role:
 * This test suite validates the pure functions in src/utils/validators.js.
 * The goal is to lock API input-contract behavior so route handlers can trust
 * validator outcomes before delegating work to services.
 */

const {
  validateCreateTask,
  validateUpdateTask,
  validateAssignTask,
  validateListQuery,
  VALID_STATUSES,
  VALID_PRIORITIES,
} = require('../src/utils/validators');

/**
 * @param {void} _unused - No direct inputs; test data is defined per case.
 * @returns {void}
 * @behavior Groups all validator contract tests so any rule drift is immediately visible.
 */
describe('validators', () => {
  /**
   * @param {void} _unused - No direct inputs.
   * @returns {void}
   * @behavior Verifies exported enums stay aligned with business vocabulary used by routes and tests.
   */
  test('exports supported statuses and priorities', () => {
    expect(VALID_STATUSES).toEqual(['todo', 'in_progress', 'done']);
    expect(VALID_PRIORITIES).toEqual(['low', 'medium', 'high']);
  });

  /**
   * @param {void} _unused - No direct inputs.
   * @returns {void}
   * @behavior Covers create-payload validation rules that protect POST /tasks.
   */
  describe('validateCreateTask', () => {
    /**
     * @param {void} _unused - No direct inputs.
     * @returns {void}
     * @behavior Confirms valid create payloads are accepted and return null errors.
     */
    test('accepts a valid payload', () => {
      expect(
        validateCreateTask({
          title: 'Ship feature',
          description: 'Implement assign endpoint',
          status: 'todo',
          priority: 'high',
          dueDate: '2030-01-01T00:00:00.000Z',
        })
      ).toBeNull();
    });

    /**
     * @param {void} _unused - No direct inputs.
     * @returns {void}
     * @behavior Ensures title remains a strict required field for creation.
     */
    test('rejects missing or empty title', () => {
      expect(validateCreateTask({})).toBe('title is required and must be a non-empty string');
      expect(validateCreateTask({ title: '   ' })).toBe('title is required and must be a non-empty string');
    });

    /**
     * @param {void} _unused - No direct inputs.
     * @returns {void}
     * @behavior Guards against non-string description values that would break response consistency.
     */
    test('rejects non-string description', () => {
      expect(validateCreateTask({ title: 'A', description: 123 })).toBe('description must be a string');
    });

    /**
     * @param {void} _unused - No direct inputs.
     * @returns {void}
     * @behavior Verifies enum enforcement for status and priority categories.
     */
    test('rejects invalid status and priority', () => {
      expect(validateCreateTask({ title: 'A', status: 'invalid' })).toBe(
        'status must be one of: todo, in_progress, done'
      );
      expect(validateCreateTask({ title: 'A', priority: 'urgent' })).toBe(
        'priority must be one of: low, medium, high'
      );
    });

    /**
     * @param {void} _unused - No direct inputs.
     * @returns {void}
     * @behavior Documents optional-date behavior: null allowed, malformed values rejected.
     */
    test('validates dueDate variants', () => {
      expect(validateCreateTask({ title: 'A', dueDate: null })).toBeNull();
      expect(validateCreateTask({ title: 'A', dueDate: {} })).toBe('dueDate must be a valid ISO date string');
      expect(validateCreateTask({ title: 'A', dueDate: 'invalid-date' })).toBe(
        'dueDate must be a valid ISO date string'
      );
    });
  });

  /**
   * @param {void} _unused - No direct inputs.
   * @returns {void}
   * @behavior Covers update-payload rules used by PUT /tasks/:id.
   */
  describe('validateUpdateTask', () => {
    /**
     * @param {void} _unused - No direct inputs.
     * @returns {void}
     * @behavior Prevents non-object or empty update bodies from becoming silent no-op writes.
     */
    test('rejects invalid body shapes', () => {
      expect(validateUpdateTask(null)).toBe('body must be an object');
      expect(validateUpdateTask([])).toBe('body must be an object');
      expect(validateUpdateTask({})).toBe('at least one field must be provided');
    });

    /**
     * @param {void} _unused - No direct inputs.
     * @returns {void}
     * @behavior Ensures scalar field type checks remain strict for partial updates.
     */
    test('rejects invalid scalar fields', () => {
      expect(validateUpdateTask({ title: '' })).toBe('title must be a non-empty string');
      expect(validateUpdateTask({ description: 123 })).toBe('description must be a string');
      expect(validateUpdateTask({ status: 'x' })).toBe('status must be one of: todo, in_progress, done');
      expect(validateUpdateTask({ priority: 'x' })).toBe('priority must be one of: low, medium, high');
      expect(validateUpdateTask({ dueDate: 'bad-date' })).toBe('dueDate must be a valid ISO date string');
      expect(validateUpdateTask({ assignee: '' })).toBe('assignee must be a non-empty string when provided');
    });

    /**
     * @param {void} _unused - No direct inputs.
     * @returns {void}
     * @behavior Captures explicit-clearing semantics: update allows null assignee and null dueDate.
     */
    test('allows null assignee and valid updates', () => {
      expect(validateUpdateTask({ assignee: null })).toBeNull();
      expect(
        validateUpdateTask({
          title: 'Updated',
          description: 'Better details',
          status: 'in_progress',
          priority: 'medium',
          dueDate: null,
          assignee: 'Alice',
        })
      ).toBeNull();
    });
  });

  /**
   * @param {void} _unused - No direct inputs.
   * @returns {void}
   * @behavior Covers assign-specific validation rules for PATCH /tasks/:id/assign.
   */
  describe('validateAssignTask', () => {
    /**
     * @param {void} _unused - No direct inputs.
     * @returns {void}
     * @behavior Verifies assign endpoint remains strict and does not allow null/empty assignee intent.
     */
    test('rejects invalid assignment payloads', () => {
      expect(validateAssignTask(null)).toBe('body must be an object');
      expect(validateAssignTask({ assignee: '   ' })).toBe('assignee is required and must be a non-empty string');
    });

    /**
     * @param {void} _unused - No direct inputs.
     * @returns {void}
     * @behavior Confirms happy-path assign payloads are accepted.
     */
    test('accepts valid assignment payload', () => {
      expect(validateAssignTask({ assignee: 'Alice' })).toBeNull();
    });
  });

  /**
   * @param {void} _unused - No direct inputs.
   * @returns {void}
   * @behavior Covers list query validation used before GET /tasks filtering/pagination flow.
   */
  describe('validateListQuery', () => {
    /**
     * @param {void} _unused - No direct inputs.
     * @returns {void}
     * @behavior Ensures route layer returns deterministic 400 responses for malformed queries.
     */
    test('rejects invalid query values', () => {
      expect(validateListQuery({ status: 'bad' })).toBe('status must be one of: todo, in_progress, done');
      expect(validateListQuery({ page: '0' })).toBe('page must be a positive integer');
      expect(validateListQuery({ page: '1.5' })).toBe('page must be a positive integer');
      expect(validateListQuery({ limit: '0' })).toBe('limit must be a positive integer');
      expect(validateListQuery({ limit: '101' })).toBe('limit must be less than or equal to 100');
    });

    /**
     * @param {void} _unused - No direct inputs.
     * @returns {void}
     * @behavior Confirms accepted query combinations stay backwards-compatible.
     */
    test('accepts valid query values', () => {
      expect(validateListQuery({})).toBeNull();
      expect(validateListQuery({ status: 'todo', page: '1', limit: '100' })).toBeNull();
    });
  });
});
