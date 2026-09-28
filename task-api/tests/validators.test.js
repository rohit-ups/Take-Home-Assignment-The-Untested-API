const {
  validateCreateTask,
  validateUpdateTask,
  validateAssign,
} = require('../src/utils/validators');

describe('validateCreateTask', () => {
  test('accepts a valid minimal body', () => {
    expect(validateCreateTask({ title: 'x' })).toBeNull();
  });

  test('accepts a fully specified valid body', () => {
    expect(
      validateCreateTask({
        title: 'x',
        description: 'd',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2099-01-01T00:00:00.000Z',
      })
    ).toBeNull();
  });

  test('rejects a missing title', () => {
    expect(validateCreateTask({})).toMatch(/title/);
  });

  test('rejects an empty title', () => {
    expect(validateCreateTask({ title: '' })).toMatch(/title/);
  });

  test('rejects a whitespace-only title', () => {
    expect(validateCreateTask({ title: '   ' })).toMatch(/title/);
  });

  test('rejects a non-string title', () => {
    expect(validateCreateTask({ title: 123 })).toMatch(/title/);
  });

  test('rejects an invalid status', () => {
    expect(validateCreateTask({ title: 'x', status: 'bogus' })).toMatch(/status/);
  });

  test('rejects an invalid priority', () => {
    expect(validateCreateTask({ title: 'x', priority: 'urgent' })).toMatch(/priority/);
  });

  test('rejects an invalid dueDate', () => {
    expect(validateCreateTask({ title: 'x', dueDate: 'not-a-date' })).toMatch(/dueDate/);
  });

  test('allows a null dueDate', () => {
    expect(validateCreateTask({ title: 'x', dueDate: null })).toBeNull();
  });
});

describe('validateUpdateTask', () => {
  test('accepts an empty body (all fields optional)', () => {
    expect(validateUpdateTask({})).toBeNull();
  });

  test('accepts a valid title', () => {
    expect(validateUpdateTask({ title: 'x' })).toBeNull();
  });

  test('rejects an empty title', () => {
    expect(validateUpdateTask({ title: '' })).toMatch(/title/);
  });

  test('rejects a non-string title', () => {
    expect(validateUpdateTask({ title: 123 })).toMatch(/title/);
  });

  test('rejects an invalid status', () => {
    expect(validateUpdateTask({ status: 'bogus' })).toMatch(/status/);
  });

  test('rejects an invalid priority', () => {
    expect(validateUpdateTask({ priority: 'urgent' })).toMatch(/priority/);
  });

  test('rejects an invalid dueDate', () => {
    expect(validateUpdateTask({ dueDate: 'not-a-date' })).toMatch(/dueDate/);
  });

  test('allows a null dueDate (clears the date)', () => {
    expect(validateUpdateTask({ dueDate: null })).toBeNull();
  });
});

describe('validateAssign', () => {
  test('accepts a non-empty string', () => {
    expect(validateAssign({ assignee: 'ada' })).toBeNull();
  });

  test('accepts a name with surrounding whitespace (caller trims)', () => {
    expect(validateAssign({ assignee: '  ada  ' })).toBeNull();
  });

  test('rejects a missing assignee', () => {
    expect(validateAssign({})).toMatch(/assignee/);
  });

  test('rejects an empty string', () => {
    expect(validateAssign({ assignee: '' })).toMatch(/assignee/);
  });

  test('rejects a whitespace-only string', () => {
    expect(validateAssign({ assignee: '   ' })).toMatch(/assignee/);
  });

  test('rejects a non-string', () => {
    expect(validateAssign({ assignee: 42 })).toMatch(/assignee/);
  });

  test('rejects null', () => {
    expect(validateAssign({ assignee: null })).toMatch(/assignee/);
  });
});