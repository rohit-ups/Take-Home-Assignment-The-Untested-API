const { validateCreateTask, validateUpdateTask } = require('../src/utils/validators');

describe('validateCreateTask', () => {
  test('accepts a minimal valid body', () => {
    expect(validateCreateTask({ title: 'ok' })).toBeNull();
  });
  test('accepts all valid fields', () => {
    expect(validateCreateTask({ title: 'ok', status: 'done', priority: 'low', dueDate: '2030-01-01' })).toBeNull();
  });
  test.each([
    [{}], [{ title: ' ' }], [{ title: 1 }],
    [{ title: 'a', status: 'x' }], [{ title: 'a', priority: 'x' }], [{ title: 'a', dueDate: 'x' }],
  ])('rejects %j', (body) => {
    expect(typeof validateCreateTask(body)).toBe('string');
  });
});

describe('validateUpdateTask', () => {
  test('accepts empty body', () => {
    expect(validateUpdateTask({})).toBeNull();
  });
  test('accepts valid partial updates', () => {
    expect(validateUpdateTask({ status: 'in_progress', priority: 'high', dueDate: '2030-01-01', title: 'x' })).toBeNull();
  });
  test.each([
    [{ title: '' }], [{ title: 3 }], [{ status: 'x' }], [{ priority: 'x' }], [{ dueDate: 'x' }],
  ])('rejects %j', (body) => {
    expect(typeof validateUpdateTask(body)).toBe('string');
  });
});
