const { validateCreateTask, validateUpdateTask } = require('../src/utils/validators');

// ============================================================
// validateCreateTask
// ============================================================
describe('validateCreateTask', () => {
  it('should return null for a valid task with all fields', () => {
    const error = validateCreateTask({
      title: 'Valid task',
      status: 'todo',
      priority: 'high',
      dueDate: '2026-12-31T00:00:00.000Z',
    });
    expect(error).toBeNull();
  });

  it('should return null for a task with only a title', () => {
    expect(validateCreateTask({ title: 'Minimal' })).toBeNull();
  });

  it('should return an error when title is missing', () => {
    expect(validateCreateTask({})).toBeTruthy();
  });

  it('should return an error when title is an empty string', () => {
    expect(validateCreateTask({ title: '' })).toBeTruthy();
  });

  it('should return an error when title is whitespace only', () => {
    expect(validateCreateTask({ title: '   ' })).toBeTruthy();
  });

  it('should return an error when title is not a string', () => {
    expect(validateCreateTask({ title: 123 })).toBeTruthy();
  });

  it('should return an error for an invalid status', () => {
    expect(validateCreateTask({ title: 'X', status: 'invalid' })).toBeTruthy();
  });

  it('should return an error for an invalid priority', () => {
    expect(validateCreateTask({ title: 'X', priority: 'urgent' })).toBeTruthy();
  });

  it('should return an error for an invalid dueDate', () => {
    expect(validateCreateTask({ title: 'X', dueDate: 'not-a-date' })).toBeTruthy();
  });

  it('should accept valid statuses', () => {
    ['todo', 'in_progress', 'done'].forEach((status) => {
      expect(validateCreateTask({ title: 'X', status })).toBeNull();
    });
  });

  it('should accept valid priorities', () => {
    ['low', 'medium', 'high'].forEach((priority) => {
      expect(validateCreateTask({ title: 'X', priority })).toBeNull();
    });
  });
});

// ============================================================
// validateUpdateTask
// ============================================================
describe('validateUpdateTask', () => {
  it('should return null when no fields are provided', () => {
    expect(validateUpdateTask({})).toBeNull();
  });

  it('should return null for valid update fields', () => {
    expect(
      validateUpdateTask({
        title: 'Updated',
        status: 'done',
        priority: 'low',
        dueDate: '2026-06-15T00:00:00.000Z',
      })
    ).toBeNull();
  });

  it('should return an error when title is an empty string', () => {
    expect(validateUpdateTask({ title: '' })).toBeTruthy();
  });

  it('should return an error when title is whitespace only', () => {
    expect(validateUpdateTask({ title: '  ' })).toBeTruthy();
  });

  it('should return an error for an invalid status', () => {
    expect(validateUpdateTask({ status: 'nope' })).toBeTruthy();
  });

  it('should return an error for an invalid priority', () => {
    expect(validateUpdateTask({ priority: 'critical' })).toBeTruthy();
  });

  it('should return an error for an invalid dueDate', () => {
    expect(validateUpdateTask({ dueDate: 'yesterday' })).toBeTruthy();
  });
});
