const service = require('../src/services/taskService');

const NOW = '2026-09-29T12:00:00.000Z';

beforeEach(() => {
  service._reset();
  jest.useFakeTimers().setSystemTime(new Date(NOW));
});
afterEach(() => jest.useRealTimers());

it('creates a task with defaults and a unique ID', () => {
  const task = service.create({ title: 'Write tests' });
  expect(task).toEqual({
    id: expect.any(String), title: 'Write tests', description: '',
    status: 'todo', priority: 'medium', dueDate: null,
    completedAt: null, createdAt: NOW,
  });
  expect(service.create({ title: 'Second' }).id).not.toBe(task.id);
  expect(service.findById(task.id)).toEqual(task);
});

it('returns an empty list and no match for a missing ID', () => {
  expect(service.getAll()).toEqual([]);
  expect(service.findById('missing')).toBeUndefined();
});

it('lists all tasks without exposing the stored array', () => {
  const task = service.create({ title: 'Task' });
  const result = service.getAll();
  result.pop();
  expect(service.getAll()).toEqual([task]);
});

it('filters by the exact status rather than a substring', () => {
  const todo = service.create({ title: 'Todo' });
  service.create({ title: 'Done', status: 'done' });
  expect(service.getByStatus('todo')).toEqual([todo]);
  expect(service.getByStatus('do')).toEqual([]);
  expect(service.getByStatus('in_progress')).toEqual([]);
});

it('uses one-based pagination and returns empty pages beyond the end', () => {
  const first = service.create({ title: 'First' });
  const second = service.create({ title: 'Second' });
  expect(service.getPaginated(1, 1)).toEqual([first]);
  expect(service.getPaginated(2, 1)).toEqual([second]);
  expect(service.getPaginated(3, 1)).toEqual([]);
});

it('paginates the filtered list', () => {
  service.create({ title: 'Done', status: 'done' });
  const first = service.create({ title: 'Todo 1' });
  const second = service.create({ title: 'Todo 2' });
  expect(service.getPaginated(1, 1, 'todo')).toEqual([first]);
  expect(service.getPaginated(2, 1, 'todo')).toEqual([second]);
});

it('updates editable fields while preserving the other fields and tasks', () => {
  const task = service.create({ title: 'Original', priority: 'high' });
  const other = service.create({ title: 'Other' });
  const updated = service.update(task.id, { title: 'Updated' });
  expect(updated).toEqual({ ...task, title: 'Updated' });
  expect(service.findById(other.id)).toEqual(other);
  expect(service.update('missing', { title: 'No' })).toBeNull();
});

it('does not allow direct updates to overwrite server-owned or unknown fields', () => {
  const task = service.create({ title: 'Task' });
  expect(service.update(task.id, {
    id: 'replacement', createdAt: 'fake', completedAt: 'fake', unexpected: true,
  })).toEqual(task);
  expect(service.findById(task.id)).toEqual(task);
});

it('deletes only the selected task and handles missing or repeated deletes', () => {
  const first = service.create({ title: 'First' });
  const second = service.create({ title: 'Second' });
  expect(service.remove(first.id)).toBe(true);
  expect(service.getAll()).toEqual([second]);
  expect(service.remove(first.id)).toBe(false);
  expect(service.remove('missing')).toBe(false);
});

it.each(['low', 'high'])('completion preserves %s priority and unrelated fields', (priority) => {
  const task = service.create({ title: 'Task', priority, description: 'Keep me' });
  expect(service.completeTask(task.id)).toEqual({ ...task, status: 'done', completedAt: NOW });
  expect(service.findById(task.id).status).toBe('done');
});

it('returns null when completing a missing task', () => {
  expect(service.completeTask('missing')).toBeNull();
});

it('preserves the first completion timestamp on repeated completion', () => {
  const task = service.create({ title: 'Task' });
  const completed = service.completeTask(task.id);
  jest.setSystemTime(new Date('2026-09-30T12:00:00.000Z'));
  expect(service.completeTask(task.id)).toEqual(completed);
});

it('sets completion time when creating or updating to done and clears it on reopening', () => {
  const task = service.create({ title: 'Done', status: 'done' });
  expect(task.completedAt).toBe(NOW);
  expect(service.update(task.id, { status: 'in_progress' }).completedAt).toBeNull();
  expect(service.update(task.id, { status: 'done' }).completedAt).toBe(NOW);
  jest.setSystemTime(new Date('2026-09-30T12:00:00.000Z'));
  expect(service.update(task.id, { title: 'Still done' }).completedAt).toBe(NOW);
  expect(service.update(task.id, { status: 'done' }).completedAt).toBe(NOW);
});

it('returns zero statistics for an empty store', () => {
  expect(service.getStats()).toEqual({ todo: 0, in_progress: 0, done: 0, overdue: 0 });
});

it('counts statuses and overdue tasks using a fixed clock', () => {
  service.create({ title: 'Overdue', dueDate: '2026-09-28T12:00:00Z' });
  service.create({ title: 'Working', status: 'in_progress', dueDate: '2026-09-28T12:00:00Z' });
  service.create({ title: 'Done', status: 'done', dueDate: '2026-09-28T12:00:00Z' });
  service.create({ title: 'Future', dueDate: '2026-09-30T12:00:00Z' });
  service.create({ title: 'Due now', dueDate: NOW });
  service.create({ title: 'No deadline' });
  expect(service.getStats()).toEqual({ todo: 4, in_progress: 1, done: 1, overdue: 2 });
});

it('assigns and reassigns a task while preserving unrelated fields', () => {
  const task = service.create({ title: 'Task', priority: 'high', status: 'done' });
  const assigned = service.assignTask(task.id, 'Vaibhav');
  expect(assigned).toEqual({ ...task, assignee: 'Vaibhav' });
  expect(service.findById(task.id)).toEqual(assigned);
  expect(service.assignTask(task.id, 'Rohit')).toEqual({ ...task, assignee: 'Rohit' });
  expect(service.assignTask(task.id, 'Rohit')).toEqual({ ...task, assignee: 'Rohit' });
  expect(service.update(task.id, { title: 'Updated' }).assignee).toBe('Rohit');
});

it('returns null when assigning a missing task', () => {
  expect(service.assignTask('missing', 'Vaibhav')).toBeNull();
});
