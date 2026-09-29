const { validateCreateTask, validateUpdateTask, validateAssignTask } = require('../src/utils/validators');

describe('Validators Unit Tests', () => {
  describe('validateCreateTask', () => {
    it('should return null for valid task data', () => {
      const validData = {
        title: 'Test Task',
        description: 'Test description',
        status: 'todo',
        priority: 'high',
        dueDate: '2026-10-01T12:00:00.000Z',
      };
      expect(validateCreateTask(validData)).toBeNull();
    });

    it('should return error if title is missing', () => {
      const invalidData = { description: 'No title' };
      expect(validateCreateTask(invalidData)).toBe('title is required and must be a non-empty string');
    });

    it('should return error if title is not a string', () => {
      const invalidData = { title: 123 };
      expect(validateCreateTask(invalidData)).toBe('title is required and must be a non-empty string');
    });

    it('should return error if title is empty or whitespace', () => {
      const invalidData = { title: '   ' };
      expect(validateCreateTask(invalidData)).toBe('title is required and must be a non-empty string');
    });

    it('should return error for invalid status', () => {
      const invalidData = { title: 'Test Task', status: 'invalid_status' };
      expect(validateCreateTask(invalidData)).toBe('status must be one of: todo, in_progress, done');
    });

    it('should return error for invalid priority', () => {
      const invalidData = { title: 'Test Task', priority: 'urgent' };
      expect(validateCreateTask(invalidData)).toBe('priority must be one of: low, medium, high');
    });

    it('should return error for invalid dueDate format', () => {
      const invalidData = { title: 'Test Task', dueDate: 'invalid-date' };
      expect(validateCreateTask(invalidData)).toBe('dueDate must be a valid ISO date string');
    });
  });

  describe('validateUpdateTask', () => {
    it('should return null for valid empty update payload', () => {
      expect(validateUpdateTask({})).toBeNull();
    });

    it('should return null for valid full update payload', () => {
      const validUpdate = {
        title: 'Updated Title',
        status: 'in_progress',
        priority: 'low',
        dueDate: '2026-12-31T23:59:59.000Z',
      };
      expect(validateUpdateTask(validUpdate)).toBeNull();
    });

    it('should return error if updated title is empty string', () => {
      expect(validateUpdateTask({ title: '' })).toBe('title must be a non-empty string');
    });

    it('should return error if updated status is invalid', () => {
      expect(validateUpdateTask({ status: 'completed' })).toBe('status must be one of: todo, in_progress, done');
    });

    it('should return error if updated priority is invalid', () => {
      expect(validateUpdateTask({ priority: 'critical' })).toBe('priority must be one of: low, medium, high');
    });

    it('should return error if updated dueDate is invalid', () => {
      expect(validateUpdateTask({ dueDate: 'not-a-date' })).toBe('dueDate must be a valid ISO date string');
    });
  });

  describe('validateAssignTask', () => {
    it('should return null for valid assignee name', () => {
      expect(validateAssignTask({ assignee: 'Alex Developer' })).toBeNull();
    });

    it('should return error if assignee field is missing', () => {
      expect(validateAssignTask({})).toBe('assignee is required and must be a non-empty string');
    });

    it('should return error if assignee is not a string', () => {
      expect(validateAssignTask({ assignee: 12345 })).toBe('assignee is required and must be a non-empty string');
    });

    it('should return error if assignee is empty string or only whitespace', () => {
      expect(validateAssignTask({ assignee: '   ' })).toBe('assignee is required and must be a non-empty string');
    });
  });
});
