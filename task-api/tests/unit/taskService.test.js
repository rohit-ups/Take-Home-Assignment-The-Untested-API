const taskService = require('../../src/services/taskService');
const {
  validateCreateTask,
  validateUpdateTask,
  validateAssignTask,
  VALID_STATUSES,
  VALID_PRIORITIES,
} = require('../../src/utils/validators');

describe('TaskService Unit Tests', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('create()', () => {
    it('should create a task with default values', () => {
      const task = taskService.create({ title: 'Read Documentation' });

      expect(task).toHaveProperty('id');
      expect(task.title).toBe('Read Documentation');
      expect(task.description).toBe('');
      expect(task.status).toBe('todo');
      expect(task.priority).toBe('medium');
      expect(task.dueDate).toBeNull();
      expect(task.completedAt).toBeNull();
      expect(task.assignee).toBeNull();
      expect(task).toHaveProperty('createdAt');
    });

    it('should create a task with custom fields', () => {
      const dueDate = new Date(Date.now() + 86400000).toISOString();
      const task = taskService.create({
        title: ' Deploy API ',
        description: 'Deploy to production server',
        status: 'in_progress',
        priority: 'high',
        dueDate,
        assignee: 'Alice ',
      });

      expect(task.title).toBe('Deploy API');
      expect(task.description).toBe('Deploy to production server');
      expect(task.status).toBe('in_progress');
      expect(task.priority).toBe('high');
      expect(task.dueDate).toBe(dueDate);
      expect(task.assignee).toBe('Alice');
    });

    it('should set completedAt if created with status done', () => {
      const task = taskService.create({ title: 'Finished task', status: 'done' });
      expect(task.status).toBe('done');
      expect(task.completedAt).not.toBeNull();
    });
  });

  describe('getAll()', () => {
    it('should return an empty array when no tasks exist', () => {
      expect(taskService.getAll()).toEqual([]);
    });

    it('should return a shallow copy of all tasks', () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });

      const tasks = taskService.getAll();
      expect(tasks).toHaveLength(2);
      expect(tasks[0].title).toBe('Task 1');
      expect(tasks[1].title).toBe('Task 2');
    });
  });

  describe('findById()', () => {
    it('should find a task by ID', () => {
      const created = taskService.create({ title: 'Find Me' });
      const found = taskService.findById(created.id);
      expect(found).toEqual(created);
    });

    it('should return undefined if task ID is not found', () => {
      expect(taskService.findById('non-existent-id')).toBeUndefined();
    });
  });

  describe('getByStatus()', () => {
    it('should filter tasks by exact status', () => {
      taskService.create({ title: 'Task 1', status: 'todo' });
      taskService.create({ title: 'Task 2', status: 'in_progress' });
      taskService.create({ title: 'Task 3', status: 'done' });

      const todoTasks = taskService.getByStatus('todo');
      expect(todoTasks).toHaveLength(1);
      expect(todoTasks[0].title).toBe('Task 1');
    });

    it('should NOT match partial status substrings (bug fix test)', () => {
      taskService.create({ title: 'Task Todo', status: 'todo' });
      taskService.create({ title: 'Task Done', status: 'done' });

      // Searching for "do" shouldn't return "todo" or "done"
      const partialMatch = taskService.getByStatus('do');
      expect(partialMatch).toEqual([]);
    });
  });

  describe('getPaginated()', () => {
    beforeEach(() => {
      for (let i = 1; i <= 25; i++) {
        taskService.create({ title: `Task ${i}` });
      }
    });

    it('should return page 1 (items 1-10) by default (bug fix test)', () => {
      const page1 = taskService.getPaginated(1, 10);
      expect(page1).toHaveLength(10);
      expect(page1[0].title).toBe('Task 1');
      expect(page1[9].title).toBe('Task 10');
    });

    it('should return page 2 (items 11-20)', () => {
      const page2 = taskService.getPaginated(2, 10);
      expect(page2).toHaveLength(10);
      expect(page2[0].title).toBe('Task 11');
      expect(page2[9].title).toBe('Task 20');
    });

    it('should return page 3 with remaining items (items 21-25)', () => {
      const page3 = taskService.getPaginated(3, 10);
      expect(page3).toHaveLength(5);
      expect(page3[0].title).toBe('Task 21');
      expect(page3[4].title).toBe('Task 25');
    });

    it('should handle out of bounds page numbers', () => {
      const page10 = taskService.getPaginated(10, 10);
      expect(page10).toEqual([]);
    });

    it('should use default arguments if unsupplied or invalid', () => {
      const defaultPage = taskService.getPaginated();
      expect(defaultPage).toHaveLength(10);
      expect(defaultPage[0].title).toBe('Task 1');

      const invalidPage = taskService.getPaginated(-5, -10);
      expect(invalidPage).toHaveLength(10);
      expect(invalidPage[0].title).toBe('Task 1');
    });
  });

  describe('queryTasks()', () => {
    it('should apply both status filtering and pagination simultaneously', () => {
      for (let i = 1; i <= 15; i++) {
        taskService.create({ title: `Todo ${i}`, status: 'todo' });
        taskService.create({ title: `Done ${i}`, status: 'done' });
      }

      const results = taskService.queryTasks({ status: 'todo', page: 2, limit: 5 });
      expect(results).toHaveLength(5);
      expect(results[0].title).toBe('Todo 6');
      expect(results[4].title).toBe('Todo 10');
    });
  });

  describe('getStats()', () => {
    it('should calculate counts by status and overdue count', () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString();
      const futureDate = new Date(Date.now() + 86400000).toISOString();

      // Overdue task
      taskService.create({ title: 'Task 1', status: 'todo', dueDate: pastDate });
      // Not overdue (future date)
      taskService.create({ title: 'Task 2', status: 'todo', dueDate: futureDate });
      // In progress & overdue
      taskService.create({ title: 'Task 3', status: 'in_progress', dueDate: pastDate });
      // Done task with past due date (should NOT count as overdue)
      taskService.create({ title: 'Task 4', status: 'done', dueDate: pastDate });

      const stats = taskService.getStats();
      expect(stats.todo).toBe(2);
      expect(stats.in_progress).toBe(1);
      expect(stats.done).toBe(1);
      expect(stats.overdue).toBe(2);
    });
  });

  describe('update()', () => {
    it('should update task fields', () => {
      const task = taskService.create({ title: 'Original Title' });
      const updated = taskService.update(task.id, { title: 'Updated Title', priority: 'high' });

      expect(updated.title).toBe('Updated Title');
      expect(updated.priority).toBe('high');
    });

    it('should return null when updating a non-existent task', () => {
      const result = taskService.update('invalid-id', { title: 'New' });
      expect(result).toBeNull();
    });
  });

  describe('remove()', () => {
    it('should remove a task by ID', () => {
      const task = taskService.create({ title: 'To Be Deleted' });
      const removed = taskService.remove(task.id);
      expect(removed).toBe(true);
      expect(taskService.findById(task.id)).toBeUndefined();
    });

    it('should return false when removing a non-existent task', () => {
      expect(taskService.remove('invalid-id')).toBe(false);
    });
  });

  describe('completeTask()', () => {
    it('should mark task as done and set completedAt without overwriting priority (bug fix test)', () => {
      const task = taskService.create({ title: 'Critical Task', priority: 'high' });
      const completed = taskService.completeTask(task.id);

      expect(completed.status).toBe('done');
      expect(completed.priority).toBe('high'); // Priority should NOT be reset to 'medium'
      expect(completed.completedAt).not.toBeNull();
    });

    it('should return null when completing a non-existent task', () => {
      expect(taskService.completeTask('invalid-id')).toBeNull();
    });
  });

  describe('assignTask()', () => {
    it('should assign a user to a task', () => {
      const task = taskService.create({ title: 'Feature Development' });
      const assigned = taskService.assignTask(task.id, 'Bob Builder');

      expect(assigned.assignee).toBe('Bob Builder');
    });

    it('should return null when assigning a non-existent task', () => {
      expect(taskService.assignTask('invalid-id', 'Bob')).toBeNull();
    });
  });
});

describe('Validators Unit Tests', () => {
  describe('validateCreateTask', () => {
    it('should return null for valid payload', () => {
      expect(validateCreateTask({ title: 'Valid Task' })).toBeNull();
      expect(validateCreateTask({ title: 'Task', status: 'todo', priority: 'high', dueDate: new Date().toISOString() })).toBeNull();
    });

    it('should return error for missing or empty title', () => {
      expect(validateCreateTask({})).toContain('title is required');
      expect(validateCreateTask({ title: '' })).toContain('title is required');
      expect(validateCreateTask({ title: '   ' })).toContain('title is required');
      expect(validateCreateTask({ title: 123 })).toContain('title is required');
    });

    it('should return error for invalid status', () => {
      expect(validateCreateTask({ title: 'Task', status: 'invalid_status' })).toContain('status must be one of');
    });

    it('should return error for invalid priority', () => {
      expect(validateCreateTask({ title: 'Task', priority: 'critical' })).toContain('priority must be one of');
    });

    it('should return error for invalid dueDate', () => {
      expect(validateCreateTask({ title: 'Task', dueDate: 'invalid-date' })).toContain('dueDate must be a valid ISO date string');
    });
  });

  describe('validateUpdateTask', () => {
    it('should return null for valid payload', () => {
      expect(validateUpdateTask({ title: 'Updated' })).toBeNull();
      expect(validateUpdateTask({ status: 'done' })).toBeNull();
      expect(validateUpdateTask({ dueDate: new Date().toISOString() })).toBeNull();
    });

    it('should return error if body is null', () => {
      expect(validateUpdateTask(null)).toBe('Request body is required');
    });

    it('should return error for empty title if title is provided', () => {
      expect(validateUpdateTask({ title: '' })).toBe('title must be a non-empty string');
      expect(validateUpdateTask({ title: 123 })).toBe('title must be a non-empty string');
    });

    it('should return error for invalid status', () => {
      expect(validateUpdateTask({ status: 'unknown' })).toContain('status must be one of');
    });

    it('should return error for invalid priority', () => {
      expect(validateUpdateTask({ priority: 'super-high' })).toContain('priority must be one of');
    });

    it('should return error for invalid dueDate', () => {
      expect(validateUpdateTask({ dueDate: 'not-a-valid-date' })).toBe('dueDate must be a valid ISO date string');
    });
  });


  describe('validateAssignTask', () => {
    it('should return null for valid assignee', () => {
      expect(validateAssignTask({ assignee: 'Charlie' })).toBeNull();
    });

    it('should return error for missing or empty assignee', () => {
      expect(validateAssignTask({})).toContain('assignee is required');
      expect(validateAssignTask({ assignee: '' })).toContain('assignee is required');
      expect(validateAssignTask({ assignee: '   ' })).toContain('assignee is required');
      expect(validateAssignTask({ assignee: 123 })).toContain('assignee is required');
      expect(validateAssignTask(null)).toContain('assignee is required');
    });
  });
});
