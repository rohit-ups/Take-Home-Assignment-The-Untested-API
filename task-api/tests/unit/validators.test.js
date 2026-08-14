const { validateCreateTask, validateUpdateTask, validateAssignTask } = require('../../src/utils/validators');

describe('validators Unit Tests', () => {
  describe('validateCreateTask()', () => {
    it('should return null for a valid minimal task', () => {
      const error = validateCreateTask({ title: 'Build tests' });
      expect(error).toBeNull();
    });

    it('should return null for a valid complete task', () => {
      const error = validateCreateTask({
        title: 'Complete assignment',
        description: 'Write comprehensive tests and fixes',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2026-12-31T23:59:59.000Z',
      });
      expect(error).toBeNull();
    });

    it('should reject missing or empty body', () => {
      expect(validateCreateTask(null)).toMatch(/title is required/);
      expect(validateCreateTask(undefined)).toMatch(/title is required/);
      expect(validateCreateTask({})).toBe('title is required and must be a non-empty string');
    });

    it('should reject non-string or whitespace-only title', () => {
      expect(validateCreateTask({ title: '' })).toBe('title is required and must be a non-empty string');
      expect(validateCreateTask({ title: '   ' })).toBe('title is required and must be a non-empty string');
      expect(validateCreateTask({ title: 123 })).toBe('title is required and must be a non-empty string');
      expect(validateCreateTask({ title: true })).toBe('title is required and must be a non-empty string');
      expect(validateCreateTask({ title: {} })).toBe('title is required and must be a non-empty string');
    });

    it('should reject invalid status', () => {
      const error = validateCreateTask({ title: 'Task', status: 'invalid_status' });
      expect(error).toBe('status must be one of: todo, in_progress, done');
    });

    it('should reject invalid priority', () => {
      const error = validateCreateTask({ title: 'Task', priority: 'critical' });
      expect(error).toBe('priority must be one of: low, medium, high');
    });

    it('should reject invalid dueDate format', () => {
      const error = validateCreateTask({ title: 'Task', dueDate: 'invalid-date-string' });
      expect(error).toBe('dueDate must be a valid ISO date string');
    });
  });

  describe('validateUpdateTask()', () => {
    it('should return null for valid update fields', () => {
      expect(validateUpdateTask({ title: 'Updated Title' })).toBeNull();
      expect(validateUpdateTask({ status: 'done' })).toBeNull();
      expect(validateUpdateTask({ priority: 'low' })).toBeNull();
      expect(validateUpdateTask({ dueDate: '2026-08-20T00:00:00.000Z' })).toBeNull();
      expect(validateUpdateTask({})).toBeNull();
    });

    it('should reject null or undefined body gracefully', () => {
      expect(validateUpdateTask(null)).toBe('request body must be an object');
      expect(validateUpdateTask(undefined)).toBe('request body must be an object');
    });

    it('should reject invalid title types or empty strings', () => {
      expect(validateUpdateTask({ title: '' })).toBe('title must be a non-empty string');
      expect(validateUpdateTask({ title: '   ' })).toBe('title must be a non-empty string');
      expect(validateUpdateTask({ title: 42 })).toBe('title must be a non-empty string');
    });

    it('should reject invalid status', () => {
      const error = validateUpdateTask({ status: 'archived' });
      expect(error).toBe('status must be one of: todo, in_progress, done');
    });

    it('should reject invalid priority', () => {
      const error = validateUpdateTask({ priority: 'urgent' });
      expect(error).toBe('priority must be one of: low, medium, high');
    });

    it('should reject invalid dueDate', () => {
      const error = validateUpdateTask({ dueDate: 'yesterday' });
      expect(error).toBe('dueDate must be a valid ISO date string');
    });
  });

  describe('validateAssignTask()', () => {
    it('should return null for valid assignee string', () => {
      if (typeof validateAssignTask === 'function') {
        expect(validateAssignTask({ assignee: 'Alice' })).toBeNull();
      }
    });

    it('should reject missing or empty assignee', () => {
      if (typeof validateAssignTask === 'function') {
        expect(validateAssignTask(null)).toMatch(/assignee/);
        expect(validateAssignTask({})).toBe('assignee is required and must be a non-empty string');
        expect(validateAssignTask({ assignee: '' })).toBe('assignee is required and must be a non-empty string');
        expect(validateAssignTask({ assignee: '   ' })).toBe('assignee is required and must be a non-empty string');
        expect(validateAssignTask({ assignee: 123 })).toBe('assignee is required and must be a non-empty string');
      }
    });
  });
});
