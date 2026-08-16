const {
  validateCreateTask,
  validateUpdateTask,
  validateAssignTask,
} = require('../src/utils/validators');

describe('validateCreateTask', () => {
  test('accepts a minimal valid body', () => {
    expect(validateCreateTask({ title: 'Write tests' })).toBeNull();
  });

  test('accepts a fully populated valid body', () => {
    const error = validateCreateTask({
      title: 'Write tests',
      description: 'Cover the API',
      status: 'in_progress',
      priority: 'high',
      dueDate: '2026-12-01T00:00:00.000Z',
    });
    expect(error).toBeNull();
  });

  test('rejects a missing title', () => {
    expect(validateCreateTask({})).toMatch(/title/i);
  });

  test('rejects a whitespace-only title', () => {
    expect(validateCreateTask({ title: '   ' })).toMatch(/title/i);
  });

  test('rejects a non-string title', () => {
    expect(validateCreateTask({ title: 123 })).toMatch(/title/i);
  });

  test('rejects an invalid status', () => {
    expect(validateCreateTask({ title: 'x', status: 'bogus' })).toMatch(/status/i);
  });

  test('rejects an invalid priority', () => {
    expect(validateCreateTask({ title: 'x', priority: 'urgent' })).toMatch(/priority/i);
  });

  test('rejects an unparseable dueDate', () => {
    expect(validateCreateTask({ title: 'x', dueDate: 'not-a-date' })).toMatch(/dueDate/i);
  });
});

describe('validateUpdateTask', () => {
  test('accepts an empty body (no-op update)', () => {
    expect(validateUpdateTask({})).toBeNull();
  });

  test('accepts a partial valid update', () => {
    expect(validateUpdateTask({ status: 'done' })).toBeNull();
  });

  test('rejects an explicitly empty title', () => {
    expect(validateUpdateTask({ title: '' })).toMatch(/title/i);
  });

  test('rejects a non-string title', () => {
    expect(validateUpdateTask({ title: [] })).toMatch(/title/i);
  });

  test('rejects an invalid status', () => {
    expect(validateUpdateTask({ status: 'archived' })).toMatch(/status/i);
  });

  test('rejects an invalid priority', () => {
    expect(validateUpdateTask({ priority: 'critical' })).toMatch(/priority/i);
  });

  test('rejects an unparseable dueDate', () => {
    expect(validateUpdateTask({ dueDate: 'soon' })).toMatch(/dueDate/i);
  });
});

// New for PATCH /tasks/:id/assign (see ASSIGNMENT.md Part C).
describe('validateAssignTask', () => {
  test('accepts a non-empty assignee string', () => {
    expect(validateAssignTask({ assignee: 'Priya' })).toBeNull();
  });

  test('rejects a missing assignee', () => {
    expect(validateAssignTask({})).toMatch(/assignee/i);
  });

  test('rejects an empty-string assignee', () => {
    expect(validateAssignTask({ assignee: '' })).toMatch(/assignee/i);
  });

  test('rejects a whitespace-only assignee', () => {
    expect(validateAssignTask({ assignee: '   ' })).toMatch(/assignee/i);
  });

  test('rejects a non-string assignee', () => {
    expect(validateAssignTask({ assignee: 42 })).toMatch(/assignee/i);
  });
});
