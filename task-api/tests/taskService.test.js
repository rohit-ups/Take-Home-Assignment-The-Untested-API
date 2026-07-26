const taskService = require('../src/services/taskService');

describe('taskService', () => {
  beforeEach(() => {
    taskService._reset();
  });

  it('creates, finds, and returns a copy of tasks', () => {
    const task = taskService.createTask({ title: 'Service task' });
    const allTasks = taskService.getAll();

    allTasks.push({ id: 'fake' });

    expect(taskService.findById(task.id)).toEqual(task);
    expect(taskService.getAll()).toHaveLength(1);
  });

  it('updates, completes, assigns, and removes tasks', () => {
    const task = taskService.createTask({ title: 'Original', priority: 'high' });

    const updated = taskService.editTask(task.id, { title: 'Updated' });
    const assigned = taskService.assignTask(task.id, 'Jane Doe');
    const completed = taskService.completeTask(task.id);
    const removed = taskService.removeTask(task.id);

    expect(updated.title).toBe('Updated');
    expect(assigned.assignee).toBe('Jane Doe');
    expect(completed.status).toBe('done');
    expect(completed.priority).toBe('high');
    expect(removed).toBe(true);
    expect(taskService.findById(task.id)).toBeUndefined();
  });

  it('returns null or false for missing task mutations', () => {
    expect(taskService.editTask('missing', { title: 'Nope' })).toBeNull();
    expect(taskService.completeTask('missing')).toBeNull();
    expect(taskService.assignTask('missing', 'Jane Doe')).toBeNull();
    expect(taskService.removeTask('missing')).toBe(false);
  });

  it('filters, paginates, and reports stats', () => {
    taskService.createTask({ title: 'Todo one', status: 'todo' });
    taskService.createTask({ title: 'Done one', status: 'done' });
    taskService.createTask({ title: 'Todo two', status: 'todo' });

    expect(taskService.getByStatus('todo')).toHaveLength(2);
    expect(taskService.getByStatus('do')).toHaveLength(0);
    expect(taskService.getPaginated(2, 1)[0].title).toBe('Done one');
    expect(taskService.getStats()).toMatchObject({
      todo: 2,
      in_progress: 0,
      done: 1,
    });
  });
});
