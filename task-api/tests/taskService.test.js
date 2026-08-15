const taskService = require('../src/services/taskService');

describe('taskService', () => {
  beforeEach(() => {
    taskService._reset();
  });

  it('creates a task with a title', () => {
    const task = taskService.create({ title: 'Write tests' });
    expect(task.title).toBe('Write tests');
  });

  it('creates a task with default values when only title is given', () => {
    const task = taskService.create({ title: 'Minimal task' });
    expect(task.status).toBe('todo');
    expect(task.priority).toBe('medium');
    expect(task.completedAt).toBeNull();
  });
  it('page 1 returns the first items', () => {
    for (let i = 1; i <= 5; i++) {
      taskService.create({ title: `Task ${i}` });
    }

    const page1 = taskService.getPaginated(1, 2);
    expect(page1[0].title).toBe('Task 1');
  });
  it('removes a task and returns true', () => {
    const task = taskService.create({ title: 'Delete me' });
    const result = taskService.remove(task.id);

    expect(result).toBe(true);
    expect(taskService.findById(task.id)).toBeUndefined();
  });
  it('returns false when removing a task that does not exist', () => {
    const result = taskService.remove('some-fake-id-that-does-not-exist');
    expect(result).toBe(false);
  });
  it('updates one field without erasing the others', () => {
    const task = taskService.create({ title: 'Original title', priority: 'low' });
    const updated = taskService.update(task.id, { title: 'New title' });

    expect(updated.title).toBe('New title');
    expect(updated.priority).toBe('low');
  });
  it('keeps the original priority after completing a task', () => {
    const task = taskService.create({ title: 'Important task', priority: 'high' });
    const completed = taskService.completeTask(task.id);
    expect(completed.priority).toBe('high');
  });
  it('BUG: matches tasks by substring instead of exact status (should be 0, is not)', () => {
    taskService.create({ title: 'A', status: 'todo' });
    taskService.create({ title: 'B', status: 'in_progress' });
    taskService.create({ title: 'C', status: 'done' });

    // Ideally this should be 0 (since 'o' isn't a real status), but the
    // current implementation uses .includes() instead of exact matching,
    // so it incorrectly matches any status containing the letter 'o'.
    const result = taskService.getByStatus('o');
    expect(result.length).toBe(3); // demonstrates the bug — not correct behavior
  });
  it('does not count a task with no due date as overdue', () => {
    taskService.create({ title: 'No deadline', status: 'todo' });

    const stats = taskService.getStats();
    expect(stats.overdue).toBe(0);
  });
  it('counts a task as overdue if its due date has passed and it is not done', () => {
    taskService.create({
      title: 'Old task',
      status: 'todo',
      dueDate: '2000-01-01T00:00:00.000Z',
    });

    const stats = taskService.getStats();
    expect(stats.overdue).toBe(1);
  });
});