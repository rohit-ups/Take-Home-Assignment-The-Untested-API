const taskService = require('../src/services/taskService');

// avoids leaking tasks between tests
beforeEach(() => {
  taskService._reset();
});

//  getAll 

describe('getAll', () => {
  it('returns empty array when no tasks', () => {
    expect(taskService.getAll()).toEqual([]);
  });

  it('returns all created tasks', () => {
    taskService.create({ title: 'sample one' });
    taskService.create({ title: 'sample two' });
    expect(taskService.getAll()).toHaveLength(2);
  });
});

//  create 

describe('create', () => {
  it('successfuly creates a task with only title provided', () => {
    const task = taskService.create({ title: 'sample task' });

    expect(task.title).toBe('sample task');
    expect(task.status).toBe('todo');
    expect(task.priority).toBe('medium');
    expect(task.id).toBeDefined();
    expect(task.createdAt).toBeDefined();
    expect(task.completedAt).toBeNull();
  });

  it('takes custom status and priority, and defaults description to \"\" ', () => {
    const task = taskService.create({ title: 'urgent', status: 'in_progress', priority: 'high' });
    expect(task.status).toBe('in_progress');
    expect(task.priority).toBe('high');
    expect(task.description).toBe("");
  });

  it('ids are different from each other', () => {
    const a = taskService.create({ title: 'id a' });
    const b = taskService.create({ title: 'id b' });
    expect(a.id).not.toBe(b.id);
  });
});

//  findById 

describe('findById', () => {
  it('returns a task successfully when the provided id is valid/exists', () => {
    const task = taskService.create({ title: 'sample task' });
    expect(taskService.findById(task.id)).toEqual(task);
  });

  it('returns undefined when id is invalid', () => {
    expect(taskService.findById('invalid sample task')).toBeUndefined();
  });
});

//  update 

describe('update', () => {
  it('updates task fields', () => {
    const task = taskService.create({ title: 'old title' });
    const updated = taskService.update(task.id, { title: 'new title' });
    expect(updated.title).toBe('new title');
  });

  it('returns null when task id is invalid', () => {
    expect(taskService.update('invalid', { title: 'invalid' })).toBeNull();
  });

  it('other fields arent affected when updating other fields', () => {
    const task = taskService.create({ title: 'stable', priority: 'high' });
    const updated = taskService.update(task.id, { title: 'changed', status: 'in_progress' });
    expect(updated.priority).toBe('high');
  });
});

//  remove 

describe('remove', () => {
  it('deletes task then returns true', () => {

    const task = taskService.create({ title: 'sample' });
    expect(taskService.remove(task.id)).toBe(true);
    expect(taskService.findById(task.id)).toBeUndefined();
  });

  it('returns false when task not found', () => {
    expect(taskService.remove('invalid')).toBe(false);
  });
});

//  completeTask 

describe('completeTask', () => {
  it('sets status to done and sets completedAt', () => {
    const task = taskService.create({ title: 'sampletask' });
    const completed = taskService.completeTask(task.id);
    expect(completed.status).toBe('done');
    expect(completed.completedAt).not.toBeNull();
  });

  it('returns null when task not found', () => {
    expect(taskService.completeTask('invalid')).toBeNull();
  });


  it('other fields shouldnt be affected when completing a task', () => {
    const task = taskService.create({ title: 'sample task', priority: 'high' });
    const completed = taskService.completeTask(task.id);
    expect(completed.priority).toBe('high'); //fixed - its hardcoded to be set to medium every time the function is called succesfully
  });
});

//  getByStatus 

describe('getByStatus', () => {
  it('returns only matching tasks', () => {

    taskService.create({ title: 'a', status: 'todo' });
    taskService.create({ title: 'b', status: 'done' });
    const result = taskService.getByStatus('todo');
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('a');
  });

  it('should not return if its an invalid status', () => {
    taskService.create({ title: 'a', status: 'todo' });
    const result = taskService.getByStatus('tod');
    expect(result).toBeNull(); //fixed - shouldn't return anything since tod should be invalid
  });
});

//  getPaginated 

describe('getPaginated', () => {
  beforeEach(() => {
    for (let i = 1; i <= 5; i++) {
      taskService.create({ title: `${i}` });
    }
  });

  it('returns nothing for page 0 limit 0', () => {
    const tasks = taskService.getPaginated(0, 0);
    expect(tasks).toHaveLength(0);
  });


  it('should return first 2 items for page 1 limit 2', () => {
    const result = taskService.getPaginated(1, 2);
    expect(result[0].title).toBe('1');
    expect(result[1].title).toBe('2');  //Fixed - returns the second batch despite being on page 1
  });
});

//  getStats 

describe('getStats', () => {
  it('counts tasks by status correcctly', () => {
    taskService.create({ title: 'a', status: 'todo' });
    taskService.create({ title: 'b', status: 'done' });
    taskService.create({ title: 'c', status: 'in_progress' });

    const stats = taskService.getStats();
    expect(stats.todo).toBe(1);
    expect(stats.done).toBe(1);
    expect(stats.in_progress).toBe(1);
  });

  it('counts overdue tasks correctly', () => {
    taskService.create({ title: 'sample od', status: 'todo', dueDate: '2020-01-01' });
    taskService.create({ title: 'sample not od', status: 'todo', dueDate: '2099-01-01' });

    const odTasks = taskService.getStats();
    expect(odTasks.overdue).toBe(1);
  });

  it('does not count done tasks as overdue even with past dueDate', () => {
    taskService.create({ title: 'done task', status: 'done', dueDate: '2020-01-01' });
    const finishedTasks = taskService.getStats();
    expect(finishedTasks.overdue).toBe(0);
  });
});

describe('assignTask', () => {
  it('assigns a task to an assignee', () => {
    const task = taskService.create({ title: 'sample task' });
    const assigned = taskService.assignTask(task.id, 'John Doe');
    expect(assigned.assignee).toBe('John Doe');
  });

  it('returns null when trying to assign a non-existent/invalid task', () => {
    expect(taskService.assignTask('invalid', 'John Doe')).toBeNull();
  });

  it('returns null when trying to assign a completed task', () => {
    const task = taskService.create({ title: 'sample task' });
    taskService.completeTask(task.id);
    expect(taskService.assignTask(task.id, 'John Doe')).toBeNull();
  });
});