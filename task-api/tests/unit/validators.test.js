const {
  validateCreateTask,
  validateUpdateTask,
  validateAssignTask,
} = require('../../src/utils/validators');

describe('validators (Unit Tests)', () => {
  describe('validateCreateTask()', () => {
    it('should return null for valid minimal payload', () => {
      const error = validateCreateTask({ title: 'Buy milk' });
      expect(error).toBeNull();
    });

    it('should return null for valid full payload', () => {
      const error = validateCreateTask({
        title: 'Complete project',
        description: 'Need to submit before deadline',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2026-10-15T12:00:00.000Z',
      });
      expect(error).toBeNull();
    });

    it('should reject missing title', () => {
      expect(validateCreateTask({})).toContain('title is required');
    });

    it('should reject non-string title', () => {
      expect(validateCreateTask({ title: 12345 })).toContain('title is required and must be a non-empty string');
    });

    it('should reject empty or whitespace-only title', () => {
      expect(validateCreateTask({ title: '' })).toContain('title is required and must be a non-empty string');
      expect(validateCreateTask({ title: '   ' })).toContain('title is required and must be a non-empty string');
    });

    it('should reject invalid status', () => {
      const error = validateCreateTask({ title: 'Task', status: 'unknown_status' });
      expect(error).toContain('status must be one of: todo, in_progress, done');
    });

    it('should reject invalid priority', () => {
      const error = validateCreateTask({ title: 'Task', priority: 'critical' });
      expect(error).toContain('priority must be one of: low, medium, high');
    });

    it('should reject invalid dueDate format', () => {
      const error = validateCreateTask({ title: 'Task', dueDate: 'not-a-date' });
      expect(error).toBe('dueDate must be a valid ISO date string');
    });
  });

  describe('validateUpdateTask()', () => {
    it('should return null for valid partial updates', () => {
      expect(validateUpdateTask({ title: 'New title' })).toBeNull();
      expect(validateUpdateTask({ status: 'done' })).toBeNull();
      expect(validateUpdateTask({ priority: 'low' })).toBeNull();
      expect(validateUpdateTask({ dueDate: '2026-11-01T00:00:00.000Z' })).toBeNull();
    });

    it('should reject invalid title if provided', () => {
      expect(validateUpdateTask({ title: '' })).toContain('title must be a non-empty string');
      expect(validateUpdateTask({ title: '   ' })).toContain('title must be a non-empty string');
      expect(validateUpdateTask({ title: 999 })).toContain('title must be a non-empty string');
    });

    it('should reject invalid status if provided', () => {
      const error = validateUpdateTask({ status: 'archived' });
      expect(error).toContain('status must be one of: todo, in_progress, done');
    });

    it('should reject invalid priority if provided', () => {
      const error = validateUpdateTask({ priority: 'urgent' });
      expect(error).toContain('priority must be one of: low, medium, high');
    });

    it('should reject invalid dueDate if provided', () => {
      const error = validateUpdateTask({ dueDate: 'yesterday' });
      expect(error).toBe('dueDate must be a valid ISO date string');
    });
  });

  describe('validateAssignTask() [New Feature]', () => {
    it('should return null for valid assignee name', () => {
      expect(validateAssignTask({ assignee: 'John Doe' })).toBeNull();
    });

    it('should reject missing assignee property', () => {
      expect(validateAssignTask({})).toContain('assignee is required');
    });

    it('should reject non-string assignee', () => {
      expect(validateAssignTask({ assignee: 123 })).toContain('assignee is required and must be a non-empty string');
      expect(validateAssignTask({ assignee: null })).toContain('assignee is required and must be a non-empty string');
    });

    it('should reject empty or whitespace-only assignee', () => {
      expect(validateAssignTask({ assignee: '' })).toContain('assignee is required and must be a non-empty string');
      expect(validateAssignTask({ assignee: '   ' })).toContain('assignee is required and must be a non-empty string');
    });
  });
});
