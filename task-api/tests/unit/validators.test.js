const { validateCreateTask, validateUpdateTask, validateAssignTask } = require('../../src/utils/validators');

describe('validators utility', () => {
  describe('validateCreateTask', () => {
    test('returns null for valid payload with minimal required fields', () => {
      const result = validateCreateTask({ title: 'Read book' });
      expect(result).toBeNull();
    });

    test('returns null for valid payload with all fields', () => {
      const result = validateCreateTask({
        title: 'Read book',
        status: 'todo',
        priority: 'high',
        dueDate: '2026-12-31T23:59:59.000Z',
      });
      expect(result).toBeNull();
    });

    test('returns error when title is missing', () => {
      const result = validateCreateTask({});
      expect(result).toBe('title is required and must be a non-empty string');
    });

    test('returns error when title is not a string', () => {
      const result = validateCreateTask({ title: 12345 });
      expect(result).toBe('title is required and must be a non-empty string');
    });

    test('returns error when title is whitespace only', () => {
      const result = validateCreateTask({ title: '   ' });
      expect(result).toBe('title is required and must be a non-empty string');
    });

    test('returns error for invalid status', () => {
      const result = validateCreateTask({ title: 'Test', status: 'invalid_status' });
      expect(result).toBe('status must be one of: todo, in_progress, done');
    });

    test('returns error for invalid priority', () => {
      const result = validateCreateTask({ title: 'Test', priority: 'urgent' });
      expect(result).toBe('priority must be one of: low, medium, high');
    });

    test('returns error for invalid dueDate format', () => {
      const result = validateCreateTask({ title: 'Test', dueDate: 'invalid-date' });
      expect(result).toBe('dueDate must be a valid ISO date string');
    });
  });

  describe('validateUpdateTask', () => {
    test('returns null for empty update payload (no fields provided)', () => {
      const result = validateUpdateTask({});
      expect(result).toBeNull();
    });

    test('returns null for valid partial updates', () => {
      expect(validateUpdateTask({ title: 'New Title' })).toBeNull();
      expect(validateUpdateTask({ status: 'done' })).toBeNull();
      expect(validateUpdateTask({ priority: 'low' })).toBeNull();
      expect(validateUpdateTask({ dueDate: '2026-10-10' })).toBeNull();
    });

    test('returns error when title is empty string or whitespace', () => {
      expect(validateUpdateTask({ title: '' })).toBe('title must be a non-empty string');
      expect(validateUpdateTask({ title: '   ' })).toBe('title must be a non-empty string');
    });

    test('returns error when title is not a string', () => {
      const result = validateUpdateTask({ title: 123 });
      expect(result).toBe('title must be a non-empty string');
    });

    test('returns error for invalid status', () => {
      const result = validateUpdateTask({ status: 'completed' });
      expect(result).toBe('status must be one of: todo, in_progress, done');
    });

    test('returns error for invalid priority', () => {
      const result = validateUpdateTask({ priority: 'extreme' });
      expect(result).toBe('priority must be one of: low, medium, high');
    });

    test('returns error for invalid dueDate', () => {
      const result = validateUpdateTask({ dueDate: 'not-a-date' });
      expect(result).toBe('dueDate must be a valid ISO date string');
    });
  });

  describe('validateAssignTask', () => {
    test('returns null for valid assignee string', () => {
      const result = validateAssignTask({ assignee: 'Alice' });
      expect(result).toBeNull();
    });

    test('returns error when assignee is missing', () => {
      const result = validateAssignTask({});
      expect(result).toBe('assignee is required and must be a non-empty string');
    });

    test('returns error when assignee is not a string', () => {
      const result = validateAssignTask({ assignee: 12345 });
      expect(result).toBe('assignee is required and must be a non-empty string');
    });

    test('returns error when assignee is empty string or whitespace only', () => {
      expect(validateAssignTask({ assignee: '' })).toBe('assignee is required and must be a non-empty string');
      expect(validateAssignTask({ assignee: '   ' })).toBe('assignee is required and must be a non-empty string');
    });
  });
});
