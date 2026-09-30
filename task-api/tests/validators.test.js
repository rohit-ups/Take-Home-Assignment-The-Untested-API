const {
  validateCreateTask,
  validateUpdateTask,
  validateAssignTask,
} = require('../src/utils/validators');

describe('Validators Unit Tests', () => {
  describe('validateCreateTask', () => {
    test('passes with valid required fields', () => {
      const result = validateCreateTask({ title: 'Write unit tests' });
      expect(result).toBeNull();
    });

    test('passes with all valid fields', () => {
      const result = validateCreateTask({
        title: 'Complete assignment',
        description: 'Test thoroughly',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2026-10-15T10:00:00.000Z',
      });
      expect(result).toBeNull();
    });

    test('fails when body is null or not an object', () => {
      expect(validateCreateTask(null)).toBe('request body must be an object');
      expect(validateCreateTask('not-an-object')).toBe('request body must be an object');
    });

    test('fails when title is missing', () => {
      const result = validateCreateTask({});
      expect(result).toBe('title is required and must be a non-empty string');
    });

    test('fails when title is not a string', () => {
      const result = validateCreateTask({ title: 12345 });
      expect(result).toBe('title is required and must be a non-empty string');
    });

    test('fails when title is an empty string or whitespace only', () => {
      expect(validateCreateTask({ title: '' })).toBe('title is required and must be a non-empty string');
      expect(validateCreateTask({ title: '   ' })).toBe('title is required and must be a non-empty string');
    });

    test('fails when status is invalid', () => {
      const result = validateCreateTask({ title: 'Valid title', status: 'archived' });
      expect(result).toBe('status must be one of: todo, in_progress, done');
    });

    test('fails when priority is invalid', () => {
      const result = validateCreateTask({ title: 'Valid title', priority: 'urgent' });
      expect(result).toBe('priority must be one of: low, medium, high');
    });

    test('fails when dueDate is not a valid date string', () => {
      const result = validateCreateTask({ title: 'Valid title', dueDate: 'invalid-date' });
      expect(result).toBe('dueDate must be a valid ISO date string');
    });
  });

  describe('validateUpdateTask', () => {
    test('passes with valid partial update (title only)', () => {
      const result = validateUpdateTask({ title: 'Updated Title' });
      expect(result).toBeNull();
    });

    test('passes with valid partial update (status only)', () => {
      const result = validateUpdateTask({ status: 'done' });
      expect(result).toBeNull();
    });

    test('passes with valid partial update (priority only)', () => {
      const result = validateUpdateTask({ priority: 'low' });
      expect(result).toBeNull();
    });

    test('passes with valid dueDate update', () => {
      const result = validateUpdateTask({ dueDate: '2026-12-31T23:59:59.000Z' });
      expect(result).toBeNull();
    });

    test('fails when body is null or not an object', () => {
      expect(validateUpdateTask(null)).toBe('request body must be an object');
    });

    test('fails when title is an empty string or whitespace', () => {
      expect(validateUpdateTask({ title: '' })).toBe('title must be a non-empty string');
      expect(validateUpdateTask({ title: '   ' })).toBe('title must be a non-empty string');
    });

    test('fails when title is not a string', () => {
      expect(validateUpdateTask({ title: true })).toBe('title must be a non-empty string');
    });

    test('fails when status is invalid', () => {
      const result = validateUpdateTask({ status: 'finished' });
      expect(result).toBe('status must be one of: todo, in_progress, done');
    });

    test('fails when priority is invalid', () => {
      const result = validateUpdateTask({ priority: 'critical' });
      expect(result).toBe('priority must be one of: low, medium, high');
    });

    test('fails when dueDate is invalid', () => {
      const result = validateUpdateTask({ dueDate: 'not-a-date' });
      expect(result).toBe('dueDate must be a valid ISO date string');
    });
  });

  describe('validateAssignTask', () => {
    test('passes when assignee is a non-empty string', () => {
      const result = validateAssignTask({ assignee: 'Alice Johnson' });
      expect(result).toBeNull();
    });

    test('fails when body is null or not an object', () => {
      expect(validateAssignTask(null)).toBe('request body must be an object');
      expect(validateAssignTask(undefined)).toBe('request body must be an object');
    });

    test('fails when assignee is missing', () => {
      const result = validateAssignTask({});
      expect(result).toBe('assignee is required and must be a non-empty string');
    });

    test('fails when assignee is not a string', () => {
      expect(validateAssignTask({ assignee: 123 })).toBe('assignee must be a non-empty string');
      expect(validateAssignTask({ assignee: true })).toBe('assignee must be a non-empty string');
    });

    test('fails when assignee is empty string or only whitespace', () => {
      expect(validateAssignTask({ assignee: '' })).toBe('assignee must be a non-empty string');
      expect(validateAssignTask({ assignee: '    ' })).toBe('assignee must be a non-empty string');
    });
  });
});
