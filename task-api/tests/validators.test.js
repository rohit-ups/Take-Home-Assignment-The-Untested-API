'use strict';

const { validateCreateTask, validateUpdateTask } = require('../src/utils/validators');

// ---------------------------------------------------------------------------
// validateCreateTask
// ---------------------------------------------------------------------------
describe('validateCreateTask', () => {
  // --- happy paths ---
  it('returns null for a minimal valid payload (title only)', () => {
    expect(validateCreateTask({ title: 'Buy milk' })).toBeNull();
  });

  it('returns null for a fully populated valid payload', () => {
    expect(
      validateCreateTask({
        title: 'Deploy app',
        description: 'Push to prod',
        status: 'todo',
        priority: 'high',
        dueDate: new Date().toISOString(),
      })
    ).toBeNull();
  });

  it('accepts all valid statuses', () => {
    for (const status of ['todo', 'in_progress', 'done']) {
      expect(validateCreateTask({ title: 'x', status })).toBeNull();
    }
  });

  it('accepts all valid priorities', () => {
    for (const priority of ['low', 'medium', 'high']) {
      expect(validateCreateTask({ title: 'x', priority })).toBeNull();
    }
  });

  it('accepts a valid ISO dueDate', () => {
    expect(validateCreateTask({ title: 'x', dueDate: '2030-01-01T00:00:00.000Z' })).toBeNull();
  });

  // --- missing / empty title ---
  it('returns an error when title is missing', () => {
    expect(validateCreateTask({})).toMatch(/title/i);
  });

  it('returns an error when title is an empty string', () => {
    expect(validateCreateTask({ title: '' })).toMatch(/title/i);
  });

  it('returns an error when title is only whitespace', () => {
    expect(validateCreateTask({ title: '   ' })).toMatch(/title/i);
  });

  it('returns an error when title is not a string', () => {
    expect(validateCreateTask({ title: 42 })).toMatch(/title/i);
  });

  it('returns an error when title is null', () => {
    expect(validateCreateTask({ title: null })).toMatch(/title/i);
  });

  // --- invalid enum values ---
  it('returns an error for an invalid status', () => {
    expect(validateCreateTask({ title: 'x', status: 'pending' })).toMatch(/status/i);
  });

  it('returns an error for an invalid priority', () => {
    expect(validateCreateTask({ title: 'x', priority: 'urgent' })).toMatch(/priority/i);
  });

  // --- invalid dueDate ---
  it('returns an error for a non-date dueDate string', () => {
    expect(validateCreateTask({ title: 'x', dueDate: 'not-a-date' })).toMatch(/dueDate/i);
  });
});

// ---------------------------------------------------------------------------
// validateUpdateTask
// ---------------------------------------------------------------------------
describe('validateUpdateTask', () => {
  // --- happy paths ---
  it('returns null for an empty body (no-op update is allowed)', () => {
    expect(validateUpdateTask({})).toBeNull();
  });

  it('returns null when updating only the title', () => {
    expect(validateUpdateTask({ title: 'New title' })).toBeNull();
  });

  it('returns null when updating status to a valid value', () => {
    expect(validateUpdateTask({ status: 'in_progress' })).toBeNull();
  });

  it('returns null for a fully populated valid update body', () => {
    expect(
      validateUpdateTask({
        title: 'Updated',
        status: 'done',
        priority: 'low',
        dueDate: '2030-06-01T12:00:00.000Z',
      })
    ).toBeNull();
  });

  // --- invalid title ---
  it('returns an error when title is explicitly set to empty string', () => {
    expect(validateUpdateTask({ title: '' })).toMatch(/title/i);
  });

  it('returns an error when title is only whitespace', () => {
    expect(validateUpdateTask({ title: '   ' })).toMatch(/title/i);
  });

  it('returns an error when title is not a string', () => {
    expect(validateUpdateTask({ title: 123 })).toMatch(/title/i);
  });

  // --- invalid enum values ---
  it('returns an error for an invalid status', () => {
    expect(validateUpdateTask({ status: 'completed' })).toMatch(/status/i);
  });

  it('returns an error for an invalid priority', () => {
    expect(validateUpdateTask({ priority: 'critical' })).toMatch(/priority/i);
  });

  // --- invalid dueDate ---
  it('returns an error for a non-date dueDate string', () => {
    expect(validateUpdateTask({ dueDate: 'tomorrow' })).toMatch(/dueDate/i);
  });
});
