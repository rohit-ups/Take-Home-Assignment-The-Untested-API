const { validateCreateTask, validateUpdateTask, validateAssignTask } = require('../src/utils/validators');

describe('validators', () => {
  // ─── validateCreateTask ──────────────────────────────────────────

  describe('validateCreateTask', () => {
    it('should return null for a valid task', () => {
      expect(validateCreateTask({ title: 'Test' })).toBeNull();
    });

    it('should return null when all optional fields are valid', () => {
      expect(
        validateCreateTask({
          title: 'Test',
          status: 'in_progress',
          priority: 'high',
          dueDate: '2026-12-31T00:00:00.000Z',
        })
      ).toBeNull();
    });

    it('should reject missing title', () => {
      expect(validateCreateTask({})).toMatch(/title/i);
    });

    it('should reject empty string title', () => {
      expect(validateCreateTask({ title: '' })).toMatch(/title/i);
    });

    it('should reject whitespace-only title', () => {
      expect(validateCreateTask({ title: '   ' })).toMatch(/title/i);
    });

    it('should reject non-string title', () => {
      expect(validateCreateTask({ title: 123 })).toMatch(/title/i);
    });

    it('should reject invalid status', () => {
      expect(validateCreateTask({ title: 'T', status: 'invalid' })).toMatch(/status/i);
    });

    it('should reject invalid priority', () => {
      expect(validateCreateTask({ title: 'T', priority: 'urgent' })).toMatch(/priority/i);
    });

    it('should reject invalid dueDate', () => {
      expect(validateCreateTask({ title: 'T', dueDate: 'not-a-date' })).toMatch(/dueDate/i);
    });
  });

  // ─── validateUpdateTask ──────────────────────────────────────────

  describe('validateUpdateTask', () => {
    it('should return null when body is empty (no-op update)', () => {
      expect(validateUpdateTask({})).toBeNull();
    });

    it('should return null for valid fields', () => {
      expect(validateUpdateTask({ title: 'Updated', priority: 'low' })).toBeNull();
    });

    it('should reject empty string title', () => {
      expect(validateUpdateTask({ title: '' })).toMatch(/title/i);
    });

    it('should reject whitespace-only title', () => {
      expect(validateUpdateTask({ title: '   ' })).toMatch(/title/i);
    });

    it('should reject invalid status', () => {
      expect(validateUpdateTask({ status: 'nope' })).toMatch(/status/i);
    });

    it('should reject invalid priority', () => {
      expect(validateUpdateTask({ priority: 'critical' })).toMatch(/priority/i);
    });

    it('should reject invalid dueDate', () => {
      expect(validateUpdateTask({ dueDate: 'xyz' })).toMatch(/dueDate/i);
    });
  });

  // ─── validateAssignTask ──────────────────────────────────────────

  describe('validateAssignTask', () => {
    it('should return null for a valid assignee', () => {
      expect(validateAssignTask({ assignee: 'Alice' })).toBeNull();
    });

    it('should reject missing assignee', () => {
      expect(validateAssignTask({})).toMatch(/assignee/i);
    });

    it('should reject empty string assignee', () => {
      expect(validateAssignTask({ assignee: '' })).toMatch(/assignee/i);
    });

    it('should reject whitespace-only assignee', () => {
      expect(validateAssignTask({ assignee: '   ' })).toMatch(/assignee/i);
    });

    it('should reject non-string assignee', () => {
      expect(validateAssignTask({ assignee: 42 })).toMatch(/assignee/i);
    });
  });
});
