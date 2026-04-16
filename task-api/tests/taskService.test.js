const service = require("../src/services/taskService.js");
const { validateCreateTask } = require("../src/utils/validators.js");

beforeEach(() => {
    service._reset();
});

test('should create a task with default values', () => {
    const task = service.create({ title: 'task1' });

    expect(task).toHaveProperty('id');
    expect(task.title).toBe('task1');
    expect(task.status).toBe('todo');
    expect(task.priority).toBe('medium');
});

test('should return error when entering wrong key while creating', () => {
    const error = validateCreateTask({task1: "title"});
    let task = null;
    if(!error) {
        task = service.create({task1: "title"});
    }

    expect(task).toBeNull();
    expect(error).toBe("title is required and must be a non-empty string");
});

test('should allow empty description', () => {
    const task = service.create({ title: 'task1', description: '' });

    expect(task.description).toBe('');
});

test('should accept custom status and priority', () => {
    const task = service.create({
        title: 'Task',
        status: 'done',
        priority: 'high'
    });

    expect(task.status).toBe('done');
    expect(task.priority).toBe('high');
});

test('should return all tasks', () => {
    service.create({title:'task1'});
    service.create({title:'task2'});

    const tasks = service.getAll();
    expect(tasks.length).toBe(2);
});

test('should find task by id', () => {
    const task = service.create({title: 'task1'});

    const found = service.findById(task.id);
    expect(found.id).toBe(task.id);
});

test('should return undefined for invalid id', () => {
    const result = service.findById('invalid');

    expect(result).toBeUndefined();
});

test('should update task fields', () => {
    const task = service.create({title: 'task1', priority: 'low'});
    const updated = service.update(task.id, {priority: 'high'});

    expect(updated.priority).toBe('high');
});

test('should return null if invalid id is to be updated', () => {
    const result = service.update("wrong id", {title: 'task1'});

    expect(result).toBeNull();
});

test('should delete the task', () => {
    const task = service.create({title: 'task1'});
    const remove = service.remove(task.id);

    expect(remove).toBe(true);
    expect(service.getAll().length).toBe(0);

});

test('should return null if invalid id is to be deleted', () => {
    const result = service.remove("wrond id", {title: 'task1'});

    expect(result).toBe(false);
});

test('should complete the task', () => {
    const task = service.create({title: 'task1'});
    const complete = service.completeTask(task.id);

    expect(complete.status).toBe("done");
    expect(complete.completedAt).not.toBeNull();
    expect(complete.priority).toBe(task.priority);
});

test('should return null if invalid id is to be completed', () => {
    const result = service.completeTask("wrong id");

    expect(result).toBeNull();
});

test('should filter tasks by status', () => {
    service.create({title: 'task1', status:'todo'});
    service.create({title: 'task2', status:'done'});

    const result = service.getByStatus('done');
    expect(result.length).toBe(1);
});

test('should return null if no matched status', () => {
    const result = service.getByStatus('done');
    expect(result.length).toBe(0);
});

test('should return paginated result', () => {
    for(let i=0; i<5; i++) {
        service.create({title: `task ${i}`}); 
    }

    const page = service.getPaginated(1, 2);
    expect(page.length).toBe(2);
    expect(page[0].title).toBe("task 0");
});

test('should return empty if page out of range', () => {
  const result = service.getPaginated(10, 2);
  expect(result.length).toBe(0);
});

test('should return correct stats', () => {
  service.create({ title: 'A', status: 'todo' });
  service.create({ title: 'B', status: 'done' });

  const stats = service.getStats();

  expect(stats.todo).toBe(1);
  expect(stats.done).toBe(1);
});

test('should count overdue tasks', () => {
  service.create({
    title: 'A',
    dueDate: '2000-01-01',
    status: 'todo'
  });

  const stats = service.getStats();
  expect(stats.overdue).toBe(1);
});

test('should assign a task', () => {
    const task = service.create({title: 'task1'});
    const assigntask = service.assignTask(task.id, "smit");

    expect(assigntask.assignee).toBe("smit");
    expect(assigntask.id).toBe(task.id);
});

test('should return null for invalid task id while assigning', () => {
    const task = service.assignTask("wrong id", {assignee: "abc"});

    expect(task).toBeNull();
});

test('should handle when task already assigned', () => {
    const task = service.create({title: "task1"});

    const bool1 = service.hasAlreadyAssigned(task.id);
    let assignTask1 = null;
    if(!bool1) assignTask1 = service.assignTask(task.id, "smit");
    
    const bool2 = service.hasAlreadyAssigned(task.id);
    let assignTask2 = null;
    if(!bool2) assignTask2 = service.assignTask(task.id, "pawar");
    
    expect(bool1).toBe(false);
    expect(assignTask1.assignee).toBe("smit");
    expect(bool2).toBe(true);
    expect(assignTask2).toBeNull();
});