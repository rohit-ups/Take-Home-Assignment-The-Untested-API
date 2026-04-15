const { validateCreateTask, validateUpdateTask, validateAssignTask } = require('../src/utils/validators');

describe('validators', () => {
  // ─────────────────────────────────────────────
  // validateCreateTask()
  // ─────────────────────────────────────────────
  describe('validateCreateTask()', () => {
    it('should return null for a valid minimal task (title only)', () => {
      expect(validateCreateTask({ title: 'Valid Task' })).toBeNull();
    });

    it('should return null for a valid task with all fields', () => {
      const result = validateCreateTask({
        title: 'Full Task',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2026-12-31T00:00:00.000Z',
      });
      expect(result).toBeNull();
    });

    // Title validation
    it('should return error when title is missing', () => {
      expect(validateCreateTask({})).toMatch(/title/i);
    });

    it('should return error when title is empty string', () => {
      expect(validateCreateTask({ title: '' })).toMatch(/title/i);
    });

    it('should return error when title is only whitespace', () => {
      expect(validateCreateTask({ title: '   ' })).toMatch(/title/i);
    });

    it('should return error when title is not a string', () => {
      expect(validateCreateTask({ title: 123 })).toMatch(/title/i);
    });

    it('should return error when title is null', () => {
      expect(validateCreateTask({ title: null })).toMatch(/title/i);
    });

    // Status validation
    it('should return error for invalid status', () => {
      const result = validateCreateTask({ title: 'T', status: 'invalid' });
      expect(result).toMatch(/status/i);
    });

    it('should accept all valid statuses', () => {
      ['todo', 'in_progress', 'done'].forEach((status) => {
        expect(validateCreateTask({ title: 'T', status })).toBeNull();
      });
    });

    // Priority validation
    it('should return error for invalid priority', () => {
      const result = validateCreateTask({ title: 'T', priority: 'critical' });
      expect(result).toMatch(/priority/i);
    });

    it('should accept all valid priorities', () => {
      ['low', 'medium', 'high'].forEach((priority) => {
        expect(validateCreateTask({ title: 'T', priority })).toBeNull();
      });
    });

    // dueDate validation
    it('should return error for invalid dueDate', () => {
      const result = validateCreateTask({ title: 'T', dueDate: 'not-a-date' });
      expect(result).toMatch(/dueDate/i);
    });

    it('should accept valid ISO date string for dueDate', () => {
      const result = validateCreateTask({ title: 'T', dueDate: '2026-06-15T00:00:00.000Z' });
      expect(result).toBeNull();
    });
  });

  // ─────────────────────────────────────────────
  // validateUpdateTask()
  // ─────────────────────────────────────────────
  describe('validateUpdateTask()', () => {
    it('should return null for a valid update body', () => {
      expect(validateUpdateTask({ title: 'Updated' })).toBeNull();
    });

    it('should return null for an empty body (no fields to update)', () => {
      expect(validateUpdateTask({})).toBeNull();
    });

    // Title validation
    it('should return error when title is empty string', () => {
      expect(validateUpdateTask({ title: '' })).toMatch(/title/i);
    });

    it('should return error when title is whitespace only', () => {
      expect(validateUpdateTask({ title: '   ' })).toMatch(/title/i);
    });

    it('should return error when title is a non-string type', () => {
      expect(validateUpdateTask({ title: 42 })).toMatch(/title/i);
    });

    // Unlike create, title=undefined should be okay (means "don't change it")
    it('should allow title to be absent (undefined)', () => {
      expect(validateUpdateTask({ priority: 'low' })).toBeNull();
    });

    // Status validation
    it('should return error for invalid status', () => {
      expect(validateUpdateTask({ status: 'archived' })).toMatch(/status/i);
    });

    // Priority validation
    it('should return error for invalid priority', () => {
      expect(validateUpdateTask({ priority: 'urgent' })).toMatch(/priority/i);
    });

    // dueDate validation
    it('should return error for invalid dueDate', () => {
      expect(validateUpdateTask({ dueDate: 'yesterday' })).toMatch(/dueDate/i);
    });
  });

  // ─────────────────────────────────────────────
  // validateAssignTask()
  // ─────────────────────────────────────────────
  describe('validateAssignTask()', () => {
    it('should return null for a valid assignee', () => {
      expect(validateAssignTask({ assignee: 'Jane Smith' })).toBeNull();
    });

    it('should return error if assignee is entirely missing', () => {
      expect(validateAssignTask({})).toMatch(/assignee/i);
    });

    it('should return error if assignee is empty string', () => {
      expect(validateAssignTask({ assignee: '' })).toMatch(/assignee/i);
    });

    it('should return error if assignee is only whitespace', () => {
      expect(validateAssignTask({ assignee: '   ' })).toMatch(/assignee/i);
    });

    it('should return error if assignee is not a string', () => {
      expect(validateAssignTask({ assignee: 123 })).toMatch(/assignee/i);
    });
  });
});
