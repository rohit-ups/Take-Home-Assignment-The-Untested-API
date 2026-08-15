const { validateCreateTask, validateUpdateTask } = require('../src/utils/validators');

describe('validators unit tests', () => {
  test('validateCreateTask: missing title', () => {
    const err = validateCreateTask({});
    expect(err).toMatch(/title is required/);
  });

  test('validateCreateTask: invalid status/priority/dueDate', () => {
    expect(validateCreateTask({ title: 'x', status: 'bad' })).toMatch(/status must be one of/);
    expect(validateCreateTask({ title: 'x', priority: 'bad' })).toMatch(/priority must be one of/);
    expect(validateCreateTask({ title: 'x', dueDate: 'not-a-date' })).toMatch(/dueDate must be a valid/);
  });

  test('validateUpdateTask: empty title and invalid fields', () => {
    expect(validateUpdateTask({ title: '' })).toMatch(/title must be a non-empty string/);
    expect(validateUpdateTask({ status: 'nope' })).toMatch(/status must be one of/);
    expect(validateUpdateTask({ priority: 'nope' })).toMatch(/priority must be one of/);
    expect(validateUpdateTask({ dueDate: 'bad' })).toMatch(/dueDate must be a valid/);
  });
});
