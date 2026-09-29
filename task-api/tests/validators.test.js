const { validateCreateTask, validateUpdateTask, validateAssignTask } = require('../src/utils/validators');

const fullTask = {
  title: 'a real title',
  description: 'details',
  status: 'in_progress',
  priority: 'high',
  dueDate: '2030-06-01T00:00:00.000Z',
};

describe('validateCreateTask', () => {
  it('accepts a minimal and a fully specified task', () => {
    expect(validateCreateTask({ title: 'x' })).toBeNull();
    expect(validateCreateTask(fullTask)).toBeNull();
  });

  it('accepts every value of the status and priority enums', () => {
    ['todo', 'in_progress', 'done'].forEach((status) => {
      expect(validateCreateTask({ title: 'x', status })).toBeNull();
    });
    ['low', 'medium', 'high'].forEach((priority) => {
      expect(validateCreateTask({ title: 'x', priority })).toBeNull();
    });
  });

  it('rejects a title that is missing, empty or not a string', () => {
    const message = 'title is required and must be a non-empty string';

    expect(validateCreateTask({})).toBe(message);
    expect(validateCreateTask({ title: '' })).toBe(message);
    expect(validateCreateTask({ title: '   ' })).toBe(message);
    expect(validateCreateTask({ title: 42 })).toBe(message);
    expect(validateCreateTask({ title: ['x'] })).toBe(message);
  });

  it('rejects an unknown status', () => {
    expect(validateCreateTask({ title: 'x', status: 'pending' })).toBe(
      'status must be one of: todo, in_progress, done'
    );
  });

  it('rejects an unknown priority', () => {
    expect(validateCreateTask({ title: 'x', priority: 'urgent' })).toBe(
      'priority must be one of: low, medium, high'
    );
  });

  it('rejects a dueDate that cannot be parsed', () => {
    expect(validateCreateTask({ title: 'x', dueDate: 'next tuesday' })).toBe(
      'dueDate must be a valid ISO date string'
    );
  });

  it('treats an empty status as if it was not sent', () => {
    expect(validateCreateTask({ title: 'x', status: '' })).toBeNull();
  });
});

describe('validateUpdateTask', () => {
  it('accepts an empty or partial body', () => {
    expect(validateUpdateTask({})).toBeNull();
    expect(validateUpdateTask({ description: 'only this' })).toBeNull();
    expect(validateUpdateTask({ status: 'done', priority: 'low' })).toBeNull();
  });

  it('rejects a title that is empty, whitespace or not a string', () => {
    expect(validateUpdateTask({ title: '' })).toBe('title must be a non-empty string');
    expect(validateUpdateTask({ title: '   ' })).toBe('title must be a non-empty string');
    expect(validateUpdateTask({ title: 42 })).toBe('title must be a non-empty string');
  });

  it('rejects an unknown status', () => {
    expect(validateUpdateTask({ status: 'pending' })).toBe(
      'status must be one of: todo, in_progress, done'
    );
  });

  it('rejects an unknown priority', () => {
    expect(validateUpdateTask({ priority: 'urgent' })).toBe(
      'priority must be one of: low, medium, high'
    );
  });

  it('rejects a dueDate that cannot be parsed', () => {
    expect(validateUpdateTask({ dueDate: 'sometime' })).toBe(
      'dueDate must be a valid ISO date string'
    );
  });

  it('treats an empty status as if it was not sent', () => {
    expect(validateUpdateTask({ status: '' })).toBeNull();
  });
});

describe('validateAssignTask', () => {
  const message = 'assignee is required and must be a non-empty string';

  it('accepts a non-empty name', () => {
    expect(validateAssignTask({ assignee: 'Priya' })).toBeNull();
    expect(validateAssignTask({ assignee: 'Priya Sharma' })).toBeNull();
  });

  it('rejects an assignee that is missing, empty, whitespace or not a string', () => {
    expect(validateAssignTask({})).toBe(message);
    expect(validateAssignTask({ assignee: '' })).toBe(message);
    expect(validateAssignTask({ assignee: '   ' })).toBe(message);
    expect(validateAssignTask({ assignee: 42 })).toBe(message);
    expect(validateAssignTask({ assignee: null })).toBe(message);
    expect(validateAssignTask({ assignee: ['Priya'] })).toBe(message);
  });

  it('rejects a request with no body at all', () => {
    expect(validateAssignTask(undefined)).toBe(message);
    expect(validateAssignTask(null)).toBe(message);
  });
});
