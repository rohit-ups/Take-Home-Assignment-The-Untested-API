const { validateCreateTask, validateUpdateTask, validateAssignTask } = require('../src/utils/validators');

test.each([undefined, null, false, 42, 'text', []])('rejects non-object bodies: %j', body => {
  expect(validateCreateTask(body)).toBe('request body must be an object');
  expect(validateUpdateTask(body)).toBe('request body must be an object');
  expect(validateAssignTask(body)).toBe('request body must be an object');
});

test('requires a create title but preserves optional fields on updates', () => {
  expect(validateCreateTask({})).not.toBeNull();
  expect(validateCreateTask({ title: 'Task' })).toBeNull();
  expect(validateUpdateTask({})).toBeNull();
  expect(validateUpdateTask({ description: '', dueDate: null })).toBeNull();
  expect(validateAssignTask({ assignee: 'Alex' })).toBeNull();
});

test.each(['2030-01-01', '2028-02-29', '2030-01-01T10:20:30Z', '2030-01-01T10:20:30.123Z', '2030-01-01T10:20:30.1+05:30', '2030-01-01T10:20:30-04:00', null])('accepts supported ISO dates: %j', dueDate => {
  expect(validateCreateTask({ title: 'Task', dueDate })).toBeNull();
});

test.each(['2030-02-29', '2030-02-30', '2030-13-01', '2030-00-01', '2030-01-00', '2030-01-01T25:00:00Z', '2030-01-01T10:60:00Z', '2030-01-01T10:00:00+25:00', '2030-01-01T10:00:00', 'December 1, 2030', '', false, 0, {}, undefined])('rejects invalid or unsupported dates: %j', dueDate => {
  expect(validateCreateTask({ title: 'Task', dueDate })).not.toBeNull();
});

test.each(['todo', 'in_progress', 'done'])('accepts status %s', status => {
  expect(validateCreateTask({ title: 'Task', status })).toBeNull();
});

test.each(['low', 'medium', 'high'])('accepts priority %s', priority => {
  expect(validateCreateTask({ title: 'Task', priority })).toBeNull();
});
