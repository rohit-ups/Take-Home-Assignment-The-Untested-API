const {
  validateCreateTask,
  validateUpdateTask,
  validateAssignTask,
} = require('../src/utils/validators');

// ═══════════════════════════════════════════════════════════════════════════════
// validateCreateTask()
// ═══════════════════════════════════════════════════════════════════════════════
describe('validateCreateTask()', () => {
  it('should return null for a valid task with only title', () => {
    expect(validateCreateTask({ title: 'Buy milk' })).toBeNull();
  });

  it('should return null for a valid task with all optional fields', () => {
    const body = {
      title: 'Buy milk',
      status: 'todo',
      priority: 'high',
      dueDate: '2099-12-31T00:00:00.000Z',
    };
    expect(validateCreateTask(body)).toBeNull();
  });

  it('should return an error when title is missing', () => {
    expect(validateCreateTask({})).toMatch(/title/i);
  });

  it('should return an error when title is an empty string', () => {
    expect(validateCreateTask({ title: '' })).toMatch(/title/i);
  });

  it('should return an error when title is only whitespace', () => {
    expect(validateCreateTask({ title: '   ' })).toMatch(/title/i);
  });

  it('should return an error when title is not a string', () => {
    expect(validateCreateTask({ title: 123 })).toMatch(/title/i);
  });

  it('should return an error for an invalid status', () => {
    expect(validateCreateTask({ title: 'X', status: 'invalid' })).toMatch(/status/i);
  });

  it('should return an error for an invalid priority', () => {
    expect(validateCreateTask({ title: 'X', priority: 'urgent' })).toMatch(/priority/i);
  });

  it('should return an error for an invalid dueDate', () => {
    expect(validateCreateTask({ title: 'X', dueDate: 'not-a-date' })).toMatch(/dueDate/i);
  });

  it('should accept all valid statuses', () => {
    for (const status of ['todo', 'in_progress', 'done']) {
      expect(validateCreateTask({ title: 'X', status })).toBeNull();
    }
  });

  it('should accept all valid priorities', () => {
    for (const priority of ['low', 'medium', 'high']) {
      expect(validateCreateTask({ title: 'X', priority })).toBeNull();
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// validateUpdateTask()
// ═══════════════════════════════════════════════════════════════════════════════
describe('validateUpdateTask()', () => {
  it('should return null for a valid partial update', () => {
    expect(validateUpdateTask({ title: 'Updated' })).toBeNull();
  });

  it('should return null for an empty body (no fields to validate)', () => {
    expect(validateUpdateTask({})).toBeNull();
  });

  it('should return an error when title is set to an empty string', () => {
    expect(validateUpdateTask({ title: '' })).toMatch(/title/i);
  });

  it('should return an error for an invalid status', () => {
    expect(validateUpdateTask({ status: 'invalid' })).toMatch(/status/i);
  });

  it('should return an error for an invalid priority', () => {
    expect(validateUpdateTask({ priority: 'critical' })).toMatch(/priority/i);
  });

  it('should return an error for an invalid dueDate', () => {
    expect(validateUpdateTask({ dueDate: 'nope' })).toMatch(/dueDate/i);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// validateAssignTask()  — New feature
// ═══════════════════════════════════════════════════════════════════════════════
describe('validateAssignTask()', () => {
  it('should return null for a valid assignee string', () => {
    expect(validateAssignTask({ assignee: 'Alice' })).toBeNull();
  });

  it('should return an error when assignee is missing', () => {
    expect(validateAssignTask({})).toMatch(/assignee/i);
  });

  it('should return an error when assignee is an empty string', () => {
    expect(validateAssignTask({ assignee: '' })).toMatch(/assignee/i);
  });

  it('should return an error when assignee is only whitespace', () => {
    expect(validateAssignTask({ assignee: '   ' })).toMatch(/assignee/i);
  });

  it('should return an error when assignee is not a string', () => {
    expect(validateAssignTask({ assignee: 42 })).toMatch(/assignee/i);
  });

  it('should return an error when assignee is null', () => {
    expect(validateAssignTask({ assignee: null })).toMatch(/assignee/i);
  });
});
