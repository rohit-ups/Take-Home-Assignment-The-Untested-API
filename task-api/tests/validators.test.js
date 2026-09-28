const {
  validateCreateTask,
  validateUpdateTask,
  validateAssignTask,
} = require('../src/utils/validators');

describe('Validators (Unit Tests)', () => {
  describe('validateCreateTask', () => {
    it('returns null for valid input with all fields provided', () => {
      const err = validateCreateTask({
        title: 'Valid Title',
        description: 'Detailed description',
        status: 'todo',
        priority: 'high',
        dueDate: '2026-10-15T00:00:00.000Z',
      });
      expect(err).toBeNull();
    });

    it('returns null for minimal valid input (title only)', () => {
      expect(validateCreateTask({ title: 'Just a title' })).toBeNull();
    });

    it('allows valid status values: todo, in_progress, done', () => {
      expect(validateCreateTask({ title: 'T1', status: 'todo' })).toBeNull();
      expect(validateCreateTask({ title: 'T2', status: 'in_progress' })).toBeNull();
      expect(validateCreateTask({ title: 'T3', status: 'done' })).toBeNull();
    });

    it('allows valid priority values: low, medium, high', () => {
      expect(validateCreateTask({ title: 'T1', priority: 'low' })).toBeNull();
      expect(validateCreateTask({ title: 'T2', priority: 'medium' })).toBeNull();
      expect(validateCreateTask({ title: 'T3', priority: 'high' })).toBeNull();
    });

    it('returns error when title is missing or undefined', () => {
      expect(validateCreateTask({})).toContain('title is required');
      expect(validateCreateTask({ description: 'No title' })).toContain('title is required');
    });

    it('returns error when title is not a string (number, boolean, object, array)', () => {
      expect(validateCreateTask({ title: 123 })).toContain('title is required');
      expect(validateCreateTask({ title: true })).toContain('title is required');
      expect(validateCreateTask({ title: {} })).toContain('title is required');
      expect(validateCreateTask({ title: ['Task'] })).toContain('title is required');
    });

    it('returns error when title is only spaces, tabs, or newlines', () => {
      expect(validateCreateTask({ title: '   ' })).toContain('title is required');
      expect(validateCreateTask({ title: '\t\n' })).toContain('title is required');
    });

    it('returns error when status is invalid', () => {
      expect(validateCreateTask({ title: 'Task', status: 'pending' })).toContain('status must be one of');
      expect(validateCreateTask({ title: 'Task', status: 'TODO' })).toContain('status must be one of');
      expect(validateCreateTask({ title: 'Task', status: 'completed' })).toContain('status must be one of');
    });

    it('returns error when priority is invalid', () => {
      expect(validateCreateTask({ title: 'Task', priority: 'urgent' })).toContain('priority must be one of');
      expect(validateCreateTask({ title: 'Task', priority: 'HIGH' })).toContain('priority must be one of');
      expect(validateCreateTask({ title: 'Task', priority: 1 })).toContain('priority must be one of');
    });

    it('validates dueDate formats', () => {
      expect(validateCreateTask({ title: 'Task', dueDate: '2026-12-31T23:59:59.000Z' })).toBeNull();
      expect(validateCreateTask({ title: 'Task', dueDate: '2026-05-15' })).toBeNull();

      expect(validateCreateTask({ title: 'Task', dueDate: 'not-a-date' })).toContain('dueDate must be a valid ISO date string');
      expect(validateCreateTask({ title: 'Task', dueDate: '2026-99-99' })).toContain('dueDate must be a valid ISO date string');
    });
  });

  describe('validateUpdateTask', () => {
    it('returns null for an empty body object (valid no-op update)', () => {
      expect(validateUpdateTask({})).toBeNull();
    });

    it('returns null for valid partial updates of title, status, priority, dueDate', () => {
      expect(validateUpdateTask({ title: 'New Title' })).toBeNull();
      expect(validateUpdateTask({ status: 'done' })).toBeNull();
      expect(validateUpdateTask({ priority: 'low' })).toBeNull();
      expect(validateUpdateTask({ dueDate: '2026-12-01T00:00:00.000Z' })).toBeNull();
      expect(validateUpdateTask({ description: 'New description only' })).toBeNull();
    });

    it('returns error for empty or non-string title in update', () => {
      expect(validateUpdateTask({ title: '' })).toContain('title must be a non-empty string');
      expect(validateUpdateTask({ title: '   ' })).toContain('title must be a non-empty string');
      expect(validateUpdateTask({ title: 123 })).toContain('title must be a non-empty string');
    });

    it('returns error for invalid status in update', () => {
      expect(validateUpdateTask({ status: 'bogus' })).toContain('status must be one of');
      expect(validateUpdateTask({ status: 'in-progress' })).toContain('status must be one of');
    });

    it('returns error for invalid priority in update', () => {
      expect(validateUpdateTask({ priority: 'critical' })).toContain('priority must be one of');
    });

    it('returns error for invalid dueDate in update', () => {
      expect(validateUpdateTask({ dueDate: 'yesterday' })).toContain('dueDate must be a valid ISO date string');
    });
  });

  describe('validateAssignTask', () => {
    it('returns null for valid assignee string', () => {
      expect(validateAssignTask({ assignee: 'Jane Doe' })).toBeNull();
      expect(validateAssignTask({ assignee: 'User 123' })).toBeNull();
    });

    it('returns error when body is null or undefined', () => {
      expect(validateAssignTask(null)).toContain('assignee is required');
      expect(validateAssignTask(undefined)).toContain('assignee is required');
    });

    it('returns error when assignee is missing or empty object', () => {
      expect(validateAssignTask({})).toContain('assignee is required');
    });

    it('returns error when assignee is only whitespace, spaces, or tabs', () => {
      expect(validateAssignTask({ assignee: '' })).toContain('assignee is required');
      expect(validateAssignTask({ assignee: '   ' })).toContain('assignee is required');
      expect(validateAssignTask({ assignee: '\t\n' })).toContain('assignee is required');
    });

    it('returns error when assignee is non-string (number, boolean, array, object)', () => {
      expect(validateAssignTask({ assignee: 123 })).toContain('assignee is required');
      expect(validateAssignTask({ assignee: true })).toContain('assignee is required');
      expect(validateAssignTask({ assignee: ['Alex'] })).toContain('assignee is required');
      expect(validateAssignTask({ assignee: { name: 'Alex' } })).toContain('assignee is required');
    });
  });
});
