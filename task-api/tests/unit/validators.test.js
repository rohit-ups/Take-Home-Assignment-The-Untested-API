const { validateCreateTask, validateUpdateTask, validateAssignTask } = require('../../src/utils/validators');

describe('validators unit tests', () => {
  describe('validateCreateTask', () => {
    it('should return null for valid minimal payload', () => {
      const error = validateCreateTask({ title: 'Valid Task' });
      expect(error).toBeNull();
    });

    it('should return null for valid full payload', () => {
      const error = validateCreateTask({
        title: 'Full Task',
        description: 'Description',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2026-10-15T12:00:00.000Z',
      });
      expect(error).toBeNull();
    });

    it('should return error if body is missing, null, or not an object', () => {
      expect(validateCreateTask(null)).toMatch(/object/i);
      expect(validateCreateTask(undefined)).toMatch(/object/i);
    });

    it('should return error if title is missing', () => {
      const error = validateCreateTask({});
      expect(error).toBe('title is required and must be a non-empty string');
    });

    it('should return error if title is not a string', () => {
      expect(validateCreateTask({ title: 123 })).toBe('title is required and must be a non-empty string');
      expect(validateCreateTask({ title: true })).toBe('title is required and must be a non-empty string');
      expect(validateCreateTask({ title: {} })).toBe('title is required and must be a non-empty string');
    });

    it('should return error if title is an empty or whitespace string', () => {
      expect(validateCreateTask({ title: '' })).toBe('title is required and must be a non-empty string');
      expect(validateCreateTask({ title: '   ' })).toBe('title is required and must be a non-empty string');
    });

    it('should return error if status is invalid or empty string', () => {
      expect(validateCreateTask({ title: 'Task', status: 'invalid_status' })).toMatch(/status must be one of/);
      expect(validateCreateTask({ title: 'Task', status: '' })).toMatch(/status must be one of/);
    });

    it('should return error if priority is invalid or empty string', () => {
      expect(validateCreateTask({ title: 'Task', priority: 'urgent' })).toMatch(/priority must be one of/);
      expect(validateCreateTask({ title: 'Task', priority: '' })).toMatch(/priority must be one of/);
    });

    it('should return error if dueDate is not a valid ISO date', () => {
      expect(validateCreateTask({ title: 'Task', dueDate: 'not-a-date' })).toBe('dueDate must be a valid ISO date string');
    });

    it('should allow null dueDate', () => {
      expect(validateCreateTask({ title: 'Task', dueDate: null })).toBeNull();
    });
  });

  describe('validateUpdateTask', () => {
    it('should return null for valid update payload', () => {
      expect(validateUpdateTask({ title: 'Updated' })).toBeNull();
      expect(validateUpdateTask({ status: 'done', priority: 'low' })).toBeNull();
      expect(validateUpdateTask({ dueDate: '2026-12-01T00:00:00.000Z' })).toBeNull();
      expect(validateUpdateTask({ dueDate: null })).toBeNull();
    });

    it('should return error if body is null or not an object', () => {
      expect(validateUpdateTask(null)).toMatch(/object/i);
    });

    it('should return error if title is non-string or empty/whitespace', () => {
      expect(validateUpdateTask({ title: '' })).toBe('title must be a non-empty string');
      expect(validateUpdateTask({ title: '   ' })).toBe('title must be a non-empty string');
      expect(validateUpdateTask({ title: 12345 })).toBe('title must be a non-empty string');
    });

    it('should return error if status is invalid or empty string', () => {
      expect(validateUpdateTask({ status: 'random' })).toMatch(/status must be one of/);
      expect(validateUpdateTask({ status: '' })).toMatch(/status must be one of/);
    });

    it('should return error if priority is invalid or empty string', () => {
      expect(validateUpdateTask({ priority: 'critical' })).toMatch(/priority must be one of/);
      expect(validateUpdateTask({ priority: '' })).toMatch(/priority must be one of/);
    });

    it('should return error if dueDate is invalid date string', () => {
      expect(validateUpdateTask({ dueDate: 'invalid-date' })).toBe('dueDate must be a valid ISO date string');
    });
  });

  describe('validateAssignTask', () => {
    it('should return null for valid assignee name', () => {
      expect(validateAssignTask({ assignee: 'Alice' })).toBeNull();
    });

    it('should return error if body is null or not an object', () => {
      expect(validateAssignTask(null)).toMatch(/object/i);
      expect(validateAssignTask(undefined)).toMatch(/object/i);
    });

    it('should return error if assignee is missing', () => {
      expect(validateAssignTask({})).toBe('assignee is required and must be a non-empty string');
    });

    it('should return error if assignee is non-string or empty/whitespace', () => {
      expect(validateAssignTask({ assignee: '' })).toBe('assignee is required and must be a non-empty string');
      expect(validateAssignTask({ assignee: '   ' })).toBe('assignee is required and must be a non-empty string');
      expect(validateAssignTask({ assignee: 123 })).toBe('assignee is required and must be a non-empty string');
      expect(validateAssignTask({ assignee: null })).toBe('assignee is required and must be a non-empty string');
    });
  });
});
