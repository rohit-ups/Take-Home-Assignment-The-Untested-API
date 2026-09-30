const {
  validateCreateTask,
  validateUpdateTask,
  validateAssignTask,
} = require('../../src/utils/validators');

describe('Validators Unit Tests', () => {
  describe('validateCreateTask', () => {
    test('returns null for valid input with only required title', () => {
      const result = validateCreateTask({ title: 'Buy milk' });
      expect(result).toBeNull();
    });

    test('returns null for complete valid input', () => {
      const result = validateCreateTask({
        title: 'Complete assignment',
        description: 'Testing API endpoints',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2026-10-15T12:00:00.000Z',
      });
      expect(result).toBeNull();
    });

    test('fails if title is missing', () => {
      const result = validateCreateTask({});
      expect(result).toBe('title is required and must be a non-empty string');
    });

    test('fails if title is not a string', () => {
      const result = validateCreateTask({ title: 12345 });
      expect(result).toBe('title is required and must be a non-empty string');
    });

    test('fails if title is an empty or whitespace string', () => {
      const result = validateCreateTask({ title: '   ' });
      expect(result).toBe('title is required and must be a non-empty string');
    });

    test('fails if status is invalid', () => {
      const result = validateCreateTask({ title: 'Task', status: 'archived' });
      expect(result).toBe('status must be one of: todo, in_progress, done');
    });

    test('fails if priority is invalid', () => {
      const result = validateCreateTask({ title: 'Task', priority: 'urgent' });
      expect(result).toBe('priority must be one of: low, medium, high');
    });

    test('fails if dueDate is not a valid date string', () => {
      const result = validateCreateTask({ title: 'Task', dueDate: 'invalid-date' });
      expect(result).toBe('dueDate must be a valid ISO date string');
    });

    test('passes if dueDate is a valid ISO date string', () => {
      const result = validateCreateTask({ title: 'Task', dueDate: '2026-12-31' });
      expect(result).toBeNull();
    });
  });

  describe('validateUpdateTask', () => {
    test('returns null for empty update body', () => {
      const result = validateUpdateTask({});
      expect(result).toBeNull();
    });

    test('returns null for valid update with all fields', () => {
      const result = validateUpdateTask({
        title: 'Updated title',
        status: 'done',
        priority: 'low',
        dueDate: '2026-11-01T00:00:00.000Z',
      });
      expect(result).toBeNull();
    });

    test('fails if title is provided as non-string', () => {
      const result = validateUpdateTask({ title: 999 });
      expect(result).toBe('title must be a non-empty string');
    });

    test('fails if title is provided as empty string', () => {
      const result = validateUpdateTask({ title: '   ' });
      expect(result).toBe('title must be a non-empty string');
    });

    test('fails if status is invalid', () => {
      const result = validateUpdateTask({ status: 'completed' });
      expect(result).toBe('status must be one of: todo, in_progress, done');
    });

    test('fails if priority is invalid', () => {
      const result = validateUpdateTask({ priority: 'critical' });
      expect(result).toBe('priority must be one of: low, medium, high');
    });

    test('fails if dueDate is invalid', () => {
      const result = validateUpdateTask({ dueDate: 'not-a-date' });
      expect(result).toBe('dueDate must be a valid ISO date string');
    });
  });

  describe('validateAssignTask', () => {
    test('returns null for valid assignee name', () => {
      const result = validateAssignTask({ assignee: 'Alex Doe' });
      expect(result).toBeNull();
    });

    test('fails if body is null or undefined', () => {
      expect(validateAssignTask(null)).toBe('assignee is required and must be a non-empty string');
      expect(validateAssignTask(undefined)).toBe('assignee is required and must be a non-empty string');
    });

    test('fails if assignee field is missing', () => {
      const result = validateAssignTask({});
      expect(result).toBe('assignee is required and must be a non-empty string');
    });

    test('fails if assignee is not a string', () => {
      expect(validateAssignTask({ assignee: 12345 })).toBe('assignee is required and must be a non-empty string');
      expect(validateAssignTask({ assignee: true })).toBe('assignee is required and must be a non-empty string');
      expect(validateAssignTask({ assignee: {} })).toBe('assignee is required and must be a non-empty string');
    });

    test('fails if assignee is empty string or pure whitespace', () => {
      expect(validateAssignTask({ assignee: '' })).toBe('assignee is required and must be a non-empty string');
      expect(validateAssignTask({ assignee: '    ' })).toBe('assignee is required and must be a non-empty string');
    });
  });
});
