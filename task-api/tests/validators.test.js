const { validateCreateTask, validateUpdateTask } = require('../src/utils/validators');

describe('validateUpdateTask', () => {
  test('accepts an empty body (all fields optional)', () => {
    expect(validateUpdateTask({})).toBeNull();
  });
  test.each([
    [{ title: '' }],
    [{ title: '  ' }],
    [{ title: 5 }],
    [{ status: 'pending' }],
    [{ priority: 'urgent' }],
    [{ dueDate: 'nope' }],
  ])('rejects %j', (body) => {
    expect(validateUpdateTask(body)).toEqual(expect.any(String));
  });
});

describe('validateCreateTask', () => {
  test('accepts a fully valid body', () => {
    expect(
      validateCreateTask({ title: 'a', status: 'done', priority: 'low', dueDate: '2030-01-01T00:00:00Z' })
    ).toBeNull();
  });
});
