const { validateCreateTask, validateUpdateTask, validateAssignTask } = require('../../src/utils/validators');

describe('validators', () => {
  describe('validateCreateTask', () => {
    test('returns null for valid payload', () => {
      const result = validateCreateTask({
        title: 'Test Task',
        description: 'Description',
        status: 'todo',
        priority: 'high',
        dueDate: '2026-12-31T23:59:59Z',
      });
      expect(result).toBeNull();
    });

    test('returns error when title is missing', () => {
      const result = validateCreateTask({});
      expect(result).toBe('title is required and must be a non-empty string');
    });

    test('returns error when title is empty string or only whitespace', () => {
      const result = validateCreateTask({ title: '   ' });
      expect(result).toBe('title is required and must be a non-empty string');
    });

    test('returns error when title is not a string', () => {
      const result = validateCreateTask({ title: 123 });
      expect(result).toBe('title is required and must be a non-empty string');
    });

    test('returns error for invalid status', () => {
      const result = validateCreateTask({ title: 'Task', status: 'invalid_status' });
      expect(result).toBe('status must be one of: todo, in_progress, done');
    });

    test('returns error for invalid priority', () => {
      const result = validateCreateTask({ title: 'Task', priority: 'urgent' });
      expect(result).toBe('priority must be one of: low, medium, high');
    });

    test('returns error for invalid dueDate format', () => {
      const result = validateCreateTask({ title: 'Task', dueDate: 'invalid-date-string' });
      expect(result).toBe('dueDate must be a valid ISO date string');
    });
  });

  describe('validateUpdateTask', () => {
    test('returns null for valid update payload', () => {
      const result = validateUpdateTask({
        title: 'Updated Title',
        status: 'in_progress',
        priority: 'low',
        dueDate: '2026-10-10T10:00:00Z',
      });
      expect(result).toBeNull();
    });

    test('returns error when title is empty string', () => {
      const result = validateUpdateTask({ title: '' });
      expect(result).toBe('title must be a non-empty string');
    });

    test('returns error when title is non-string', () => {
      const result = validateUpdateTask({ title: 456 });
      expect(result).toBe('title must be a non-empty string');
    });

    test('returns error for invalid status on update', () => {
      const result = validateUpdateTask({ status: 'completed' });
      expect(result).toBe('status must be one of: todo, in_progress, done');
    });

    test('returns error for invalid priority on update', () => {
      const result = validateUpdateTask({ priority: 'super-high' });
      expect(result).toBe('priority must be one of: low, medium, high');
    });

    test('returns error for invalid dueDate on update', () => {
      const result = validateUpdateTask({ dueDate: 'not-a-date' });
      expect(result).toBe('dueDate must be a valid ISO date string');
    });
  });

  describe('validateAssignTask', () => {
    test('returns null for valid assignee', () => {
      const result = validateAssignTask({ assignee: 'Alice Johnson' });
      expect(result).toBeNull();
    });

    test('returns error when body or assignee is missing', () => {
      expect(validateAssignTask(null)).toBe('assignee is required and must be a non-empty string');
      expect(validateAssignTask({})).toBe('assignee is required and must be a non-empty string');
    });

    test('returns error when assignee is empty string or whitespace', () => {
      expect(validateAssignTask({ assignee: '' })).toBe('assignee is required and must be a non-empty string');
      expect(validateAssignTask({ assignee: '   ' })).toBe('assignee is required and must be a non-empty string');
    });

    test('returns error when assignee is not a string', () => {
      expect(validateAssignTask({ assignee: 12345 })).toBe('assignee is required and must be a non-empty string');
      expect(validateAssignTask({ assignee: true })).toBe('assignee is required and must be a non-empty string');
    });
  });
});
