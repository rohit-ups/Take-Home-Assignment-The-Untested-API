const service = require('../src/services/taskService');

beforeEach(() => {
  service._reset();
  jest.useFakeTimers().setSystemTime(new Date('2030-01-10T12:00:00.000Z'));
});
afterEach(() => jest.useRealTimers());

test('creates tasks with defaults, unique IDs and timestamps', () => {
  const first = service.create({ title: 'First' });
  const second = service.create({ title: 'Second' });
  expect(first).toMatchObject({ title: 'First', description: '', status: 'todo', priority: 'medium', dueDate: null, completedAt: null, createdAt: '2030-01-10T12:00:00.000Z' });
  expect(first.id).not.toBe(second.id);
  expect(service.findById(first.id)).toEqual(first);
  expect(service.findById('missing')).toBeUndefined();
});

test('lists tasks, resets the store and returns an independent array', () => {
  expect(service.getAll()).toEqual([]);
  service.create({ title: 'First' });
  service.getAll().pop();
  expect(service.getAll()).toHaveLength(1);
  service._reset();
  expect(service.getAll()).toEqual([]);
});

test('filters exact statuses, not substrings', () => {
  const todo = service.create({ title: 'Todo' });
  service.create({ title: 'Done', status: 'done' });
  expect(service.getByStatus('todo')).toEqual([todo]);
  expect(service.getByStatus('do')).toEqual([]);
  expect(service.getByStatus('in_progress')).toEqual([]);
});

test('paginates from the first item and handles empty/out-of-range pages', () => {
  expect(service.getPaginated(1, 2)).toEqual([]);
  for (let i = 1; i <= 5; i++) service.create({ title: `Task ${i}` });
  expect(service.getPaginated(1, 2).map(t => t.title)).toEqual(['Task 1', 'Task 2']);
  expect(service.getPaginated(2, 2).map(t => t.title)).toEqual(['Task 3', 'Task 4']);
  expect(service.getPaginated(3, 2).map(t => t.title)).toEqual(['Task 5']);
  expect(service.getPaginated(4, 2)).toEqual([]);
});

test('updates editable fields while protecting identity and server fields', () => {
  const task = service.create({ title: 'Original' });
  const updated = service.update(task.id, { title: 'Updated', id: 'changed', createdAt: 'fake', completedAt: 'fake', extra: true });
  expect(updated).toMatchObject({ id: task.id, title: 'Updated', createdAt: task.createdAt, completedAt: null });
  expect(updated).not.toHaveProperty('extra');
  expect(service.update('missing', { title: 'X' })).toBeNull();
});

test('removes only the requested task and reports missing tasks', () => {
  const first = service.create({ title: 'First' });
  const second = service.create({ title: 'Second' });
  expect(service.remove('missing')).toBe(false);
  expect(service.remove(first.id)).toBe(true);
  expect(service.remove(first.id)).toBe(false);
  expect(service.getAll()).toEqual([second]);
});

test.each(['low', 'high'])('completion preserves %s priority and original completion time', priority => {
  const task = service.create({ title: 'Task', priority, description: 'Keep', dueDate: '2030-01-01' });
  const completed = service.completeTask(task.id);
  expect(completed).toMatchObject({ status: 'done', priority, description: 'Keep', dueDate: task.dueDate, completedAt: '2030-01-10T12:00:00.000Z' });
  jest.setSystemTime(new Date('2030-01-11T12:00:00.000Z'));
  expect(service.completeTask(task.id).completedAt).toBe(completed.completedAt);
  expect(service.completeTask('missing')).toBeNull();
});

test('synchronizes completion timestamps on creation and status transitions', () => {
  expect(service.create({ title: 'Done', status: 'done' }).completedAt).toBe('2030-01-10T12:00:00.000Z');
  const task = service.create({ title: 'Task' });
  expect(service.update(task.id, { status: 'done' }).completedAt).toBe('2030-01-10T12:00:00.000Z');
  expect(service.update(task.id, { title: 'Renamed' }).completedAt).toBe('2030-01-10T12:00:00.000Z');
  expect(service.update(task.id, { status: 'in_progress' }).completedAt).toBeNull();
});

test('counts statuses and overdue unfinished tasks with a strict time boundary', () => {
  expect(service.getStats()).toEqual({ todo: 0, in_progress: 0, done: 0, overdue: 0 });
  service.create({ title: 'Overdue', dueDate: '2030-01-01' });
  service.create({ title: 'In progress', status: 'in_progress', dueDate: '2030-01-09' });
  service.create({ title: 'Done', status: 'done', dueDate: '2030-01-01' });
  service.create({ title: 'No date' });
  service.create({ title: 'Future', dueDate: '2030-02-01' });
  service.create({ title: 'Now', dueDate: '2030-01-10T12:00:00.000Z' });
  expect(service.getStats()).toEqual({ todo: 4, in_progress: 1, done: 1, overdue: 2 });
});

test('assigns and reassigns a task without changing other fields', () => {
  const task = service.create({ title: 'Task', priority: 'high' });
  expect(service.assignTask(task.id, 'Alex')).toEqual({ ...task, assignee: 'Alex' });
  expect(service.assignTask(task.id, 'Sam')).toEqual({ ...task, assignee: 'Sam' });
  expect(service.findById(task.id).assignee).toBe('Sam');
  expect(service.assignTask('missing', 'Alex')).toBeNull();
});
