const { validateCreateTask, validateUpdateTask, validateAssignTask } = require('../src/utils/validators');

describe('validators', () => {
  describe('validateCreateTask', () => {
    it('should return null for a valid task', () => {
      expect(validateCreateTask({ title: 'Test' })).toBeNull();
    });

    it('should return null for a fully specified valid task', () => {
      const body = {
        title: 'Full Task',
        description: 'Desc',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2026-12-31T00:00:00.000Z',
      };
      expect(validateCreateTask(body)).toBeNull();
    });

    it('should reject missing title', () => {
      const error = validateCreateTask({});
      expect(error).toBe('title is required and must be a non-empty string');
    });

    it('should reject empty string title', () => {
      const error = validateCreateTask({ title: '' });
      expect(error).toBe('title is required and must be a non-empty string');
    });

    it('should reject whitespace-only title', () => {
      const error = validateCreateTask({ title: '   ' });
      expect(error).toBe('title is required and must be a non-empty string');
    });

    it('should reject non-string title', () => {
      expect(validateCreateTask({ title: 123 })).toBeTruthy();
      expect(validateCreateTask({ title: null })).toBeTruthy();
      expect(validateCreateTask({ title: undefined })).toBeTruthy();
    });

    it('should reject invalid status', () => {
      const error = validateCreateTask({ title: 'Test', status: 'invalid' });
      expect(error).toContain('status');
    });

    it('should accept valid statuses', () => {
      expect(validateCreateTask({ title: 'T', status: 'todo' })).toBeNull();
      expect(validateCreateTask({ title: 'T', status: 'in_progress' })).toBeNull();
      expect(validateCreateTask({ title: 'T', status: 'done' })).toBeNull();
    });

    it('should reject invalid priority', () => {
      const error = validateCreateTask({ title: 'Test', priority: 'urgent' });
      expect(error).toContain('priority');
    });

    it('should accept valid priorities', () => {
      expect(validateCreateTask({ title: 'T', priority: 'low' })).toBeNull();
      expect(validateCreateTask({ title: 'T', priority: 'medium' })).toBeNull();
      expect(validateCreateTask({ title: 'T', priority: 'high' })).toBeNull();
    });

    it('should reject invalid dueDate', () => {
      const error = validateCreateTask({ title: 'Test', dueDate: 'not-a-date' });
      expect(error).toBe('dueDate must be a valid ISO date string');
    });

    it('should accept valid dueDate', () => {
      expect(
        validateCreateTask({ title: 'T', dueDate: '2026-06-15T10:00:00.000Z' })
      ).toBeNull();
    });

    it('should return null when optional fields are omitted', () => {
      expect(validateCreateTask({ title: 'Just Title' })).toBeNull();
    });
  });

  describe('validateUpdateTask', () => {
    it('should return null for a valid update', () => {
      expect(validateUpdateTask({ title: 'Updated' })).toBeNull();
    });

    it('should return null for empty body (no-op update)', () => {
      expect(validateUpdateTask({})).toBeNull();
    });

    it('should reject empty string title', () => {
      const error = validateUpdateTask({ title: '' });
      expect(error).toBe('title must be a non-empty string');
    });

    it('should reject whitespace-only title', () => {
      const error = validateUpdateTask({ title: '   ' });
      expect(error).toBe('title must be a non-empty string');
    });

    it('should reject non-string title', () => {
      expect(validateUpdateTask({ title: 42 })).toBeTruthy();
    });

    it('should accept valid status update', () => {
      expect(validateUpdateTask({ status: 'done' })).toBeNull();
    });

    it('should reject invalid status', () => {
      expect(validateUpdateTask({ status: 'invalid' })).toBeTruthy();
    });

    it('should accept valid priority update', () => {
      expect(validateUpdateTask({ priority: 'low' })).toBeNull();
    });

    it('should reject invalid priority', () => {
      expect(validateUpdateTask({ priority: 'urgent' })).toBeTruthy();
    });

    it('should reject invalid dueDate', () => {
      expect(validateUpdateTask({ dueDate: 'bad' })).toBeTruthy();
    });

    it('should accept valid dueDate', () => {
      expect(
        validateUpdateTask({ dueDate: '2026-06-15T10:00:00.000Z' })
      ).toBeNull();
    });
  });

  describe('validateAssignTask', () => {
    it('should return null for a valid assignee', () => {
      expect(validateAssignTask({ assignee: 'Alice' })).toBeNull();
    });

    it('should reject missing assignee', () => {
      expect(validateAssignTask({})).toBeTruthy();
    });

    it('should reject empty string assignee', () => {
      expect(validateAssignTask({ assignee: '' })).toBeTruthy();
    });

    it('should reject whitespace-only assignee', () => {
      expect(validateAssignTask({ assignee: '   ' })).toBeTruthy();
    });

    it('should reject non-string assignee', () => {
      expect(validateAssignTask({ assignee: 123 })).toBeTruthy();
      expect(validateAssignTask({ assignee: null })).toBeTruthy();
    });

    it('should accept single character assignee', () => {
      expect(validateAssignTask({ assignee: 'A' })).toBeNull();
    });
  });
});
