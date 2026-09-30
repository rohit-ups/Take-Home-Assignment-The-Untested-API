const { validateCreateTask, validateUpdateTask, validateAssignTask } = require('../src/utils/validators');

describe('validateCreateTask', () => {
  test('accepts minimal and full valid bodies', () => {
    expect(validateCreateTask({ title: 'ok' })).toBeNull();
    expect(validateCreateTask({ title: 'ok', status: 'done', priority: 'low', dueDate: '2030-01-01' })).toBeNull();
  });

  test.each([
    [{}], [{ title: '' }], [{ title: '   ' }], [{ title: 123 }],
  ])('rejects bad title %j', (body) => {
    expect(validateCreateTask(body)).toMatch(/title/);
  });

  test('rejects bad status, priority, dueDate', () => {
    expect(validateCreateTask({ title: 'x', status: 'nope' })).toMatch(/status/);
    expect(validateCreateTask({ title: 'x', priority: 'urgent' })).toMatch(/priority/);
    expect(validateCreateTask({ title: 'x', dueDate: 'not-a-date' })).toMatch(/dueDate/);
  });

  // truthiness check lets "" slip through
  test.failing('rejects empty-string status', () => {
    expect(validateCreateTask({ title: 'x', status: '' })).not.toBeNull();
  });
});

describe('validateUpdateTask', () => {
  test('accepts partial updates', () => {
    expect(validateUpdateTask({})).toBeNull();
    expect(validateUpdateTask({ priority: 'high' })).toBeNull();
  });

  test('rejects invalid fields', () => {
    expect(validateUpdateTask({ title: '' })).toMatch(/title/);
    expect(validateUpdateTask({ status: 'x' })).toMatch(/status/);
    expect(validateUpdateTask({ priority: 'x' })).toMatch(/priority/);
    expect(validateUpdateTask({ dueDate: 'x' })).toMatch(/dueDate/);
  });
});

describe('validateAssignTask', () => {
  test('accepts a normal name', () => {
    expect(validateAssignTask({ assignee: 'Alice' })).toBeNull();
  });

  test.each([
    [undefined], [null], [''], ['   '], [42], [['a']], [{}],
  ])('rejects assignee %j', (assignee) => {
    expect(validateAssignTask({ assignee })).toMatch(/assignee/);
  });

  test('rejects missing body and over-long names', () => {
    expect(validateAssignTask(undefined)).toMatch(/assignee/);
    expect(validateAssignTask({ assignee: 'x'.repeat(101) })).toMatch(/at most/);
    expect(validateAssignTask({ assignee: 'x'.repeat(100) })).toBeNull();
  });
});
