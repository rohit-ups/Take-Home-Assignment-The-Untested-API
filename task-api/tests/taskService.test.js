const taskService = require('../src/services/taskService');

beforeEach(() => {
    taskService._reset();
});

test('should create a task with the given title', () => {
    const task = taskService.create({
        title: 'Learn testing',
        priority: 'high',
    });

    expect(task.title).toBe('Learn testing');
    expect(task.priority).toBe('high');
    expect(task.description).toBe('');
    expect(task.status).toBe('todo');
    expect(task.dueDate).toBe(null);
    expect(task.completedAt).toBe(null);
    expect(task.id).toBeDefined();
    expect(task.createdAt).toBeDefined();
});

test('should return all created tasks', () => {
    taskService.create({ title: 'Task 1' });
    taskService.create({ title: 'Task 2' });

    const tasks = taskService.getAll();

    expect(tasks).toHaveLength(2);
    expect(tasks[0].title).toBe('Task 1');
    expect(tasks[1].title).toBe('Task 2');
});

test('should find a task by its id', () => {
    const task = taskService.create({
        title: 'Find me',
    });

    const foundTask = taskService.findById(task.id);

    expect(foundTask).toBeDefined();
    expect(foundTask.id).toBe(task.id);
    expect(foundTask.title).toBe('Find me');
});

test('should return undefined when task id does not exist', () => {
    const task = taskService.findById('non-existent-id');

    expect(task).toBeUndefined();
});

test('should return tasks by status', () => {
    taskService.create({
        title: 'Task 1',
        status: 'todo',
    });

    taskService.create({
        title: 'Task 2',
        status: 'done',
    });

    const tasks = taskService.getByStatus('todo');

    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toBe('Task 1');
});

test('should return empty array when no tasks match the status', () => {
    taskService.create({
        title: 'Task 1',
        status: 'todo',
    });

    const tasks = taskService.getByStatus('done');

    expect(tasks).toEqual([]);
});

test('should return the correct tasks for page 1', () => {
    for (let i = 1; i <= 15; i++) {
        taskService.create({
            title: `Task ${i}`,
        });
    }

    const tasks = taskService.getPaginated(1, 10);

    expect(tasks).toHaveLength(10);
    expect(tasks[0].title).toBe('Task 1');
    expect(tasks[9].title).toBe('Task 10');
});

test('should return the correct tasks for page 2', () => {
    for (let i = 1; i <= 25; i++) {
        taskService.create({
            title: `Task ${i}`,
        });
    }

    const tasks = taskService.getPaginated(2, 10);

    expect(tasks).toHaveLength(10);
    expect(tasks[0].title).toBe('Task 11');
    expect(tasks[9].title).toBe('Task 20');
});

test('should return correct task statistics', () => {
    taskService.create({
        title: 'Task 1',
        status: 'todo',
    });

    taskService.create({
        title: 'Task 2',
        status: 'in_progress',
    });

    taskService.create({
        title: 'Task 3',
        status: 'done',
    });

    const stats = taskService.getStats();

    expect(stats.todo).toBe(1);
    expect(stats.in_progress).toBe(1);
    expect(stats.done).toBe(1);
    expect(stats.overdue).toBe(0);
});

test('should update an existing task', () => {
    const task = taskService.create({
        title: 'Original title',
        priority: 'low',
    });

    const updatedTask = taskService.update(task.id, {
        title: 'Updated title',
        priority: 'high',
    });

    expect(updatedTask).toBeDefined();
    expect(updatedTask.id).toBe(task.id);
    expect(updatedTask.title).toBe('Updated title');
    expect(updatedTask.priority).toBe('high');
});

test('should return null when updating a non-existent task', () => {
    const updatedTask = taskService.update('non-existent-id', {
        title: 'Updated title',
    });

    expect(updatedTask).toBeNull();
});

test('should remove an existing task', () => {
    const task = taskService.create({
        title: 'Delete me',
    });

    const result = taskService.remove(task.id);

    expect(result).toBe(true);
    expect(taskService.findById(task.id)).toBeUndefined();
});

test('should return false when removing a non-existent task', () => {
    const result = taskService.remove('non-existent-id');

    expect(result).toBe(false);
});

test('should complete an existing task', () => {
    const task = taskService.create({
        title: 'Complete me',
        status: 'todo',
        priority: 'high',
    });

    const completedTask = taskService.completeTask(task.id);

    expect(completedTask).toBeDefined();
    expect(completedTask.id).toBe(task.id);
    expect(completedTask.status).toBe('done');
    expect(completedTask.completedAt).toBeDefined();
});

test('should return null when completing a non-existent task', () => {
    const result = taskService.completeTask('non-existent-id');

    expect(result).toBeNull();
});