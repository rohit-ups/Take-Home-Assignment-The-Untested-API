const {
  validateCreateTask,
  validateUpdateTask,
} = require('../../src/utils/validators');

describe('Validators', () => {

  describe('validateCreateTask', () => {
    test('should fail if title is missing', () => {
      const error = validateCreateTask({});
      expect(error).toBeTruthy();
    });

    test('should fail for invalid status', () => {
      const error = validateCreateTask({
        title: 'Test',
        status: 'invalid',
      });

      expect(error).toContain('status');
    });

    test('should fail for invalid priority', () => {
      const error = validateCreateTask({
        title: 'Test',
        priority: 'wrong',
      });

      expect(error).toContain('priority');
    });

    test('should pass for valid input', () => {
      const error = validateCreateTask({
        title: 'Valid',
        status: 'todo',
        priority: 'high',
      });

      expect(error).toBeNull();
    });
  });

  describe('validateUpdateTask', () => {
    test('should fail for empty title', () => {
      const error = validateUpdateTask({ title: '' });
      expect(error).toBeTruthy();
    });

    test('should pass valid update', () => {
      const error = validateUpdateTask({ priority: 'low' });
      expect(error).toBeNull();
    });
  });

});