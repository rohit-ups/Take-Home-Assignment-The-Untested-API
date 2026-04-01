const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

describe('Task Service - Unit Tests', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('create', () => {
    it('should create a task with all fields', () => {
      const task = taskService.create({
        title: 'Test Task',
        description: 'A test task',
        status: 'todo',
        priority: 'high',
        dueDate: '2025-12-31T23:59:59.000Z',
      });

      expect(task).toHaveProperty('id');
      expect(task.title).toBe('Test Task');
      expect(task.description).toBe('A test task');
      expect(task.status).toBe('todo');
      expect(task.priority).toBe('high');
      expect(task.dueDate).toBe('2025-12-31T23:59:59.000Z');
      expect(task.completedAt).toBeNull();
      expect(task).toHaveProperty('createdAt');
    });

    it('should use defaults for optional fields', () => {
      const task = taskService.create({ title: 'Simple Task' });

      expect(task.description).toBe('');
      expect(task.status).toBe('todo');
      expect(task.priority).toBe('medium');
      expect(task.dueDate).toBeNull();
      expect(task.completedAt).toBeNull();
    });
  });

  describe('findById', () => {
    it('should find a task by id', () => {
      const created = taskService.create({ title: 'Find Me' });
      const found = taskService.findById(created.id);

      expect(found).toEqual(created);
    });

    it('should return undefined for non-existent id', () => {
      const found = taskService.findById('non-existent-id');
      expect(found).toBeUndefined();
    });
  });

  describe('getAll', () => {
    it('should return empty array initially', () => {
      const all = taskService.getAll();
      expect(all).toEqual([]);
    });

    it('should return all created tasks', () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });
      taskService.create({ title: 'Task 3' });

      const all = taskService.getAll();
      expect(all).toHaveLength(3);
    });

    it('should return a copy of tasks array', () => {
      taskService.create({ title: 'Original' });
      const all1 = taskService.getAll();
      const all2 = taskService.getAll();

      expect(all1).not.toBe(all2); // Different array references
      expect(all1).toEqual(all2); // Same content
    });
  });

  describe('getByStatus', () => {
    beforeEach(() => {
      taskService.create({ title: 'Task 1', status: 'todo' });
      taskService.create({ title: 'Task 2', status: 'in_progress' });
      taskService.create({ title: 'Task 3', status: 'in_progress' });
      taskService.create({ title: 'Task 4', status: 'done' });
    });

    it('should filter tasks by exact status match', () => {
      const todos = taskService.getByStatus('todo');
      expect(todos).toHaveLength(1);
      expect(todos[0].title).toBe('Task 1');
    });

    it('should return tasks with "in_progress" status without matching "progress" substring', () => {
      // This tests the bug where includes() matches substrings
      const inProgress = taskService.getByStatus('progress');
      expect(inProgress).toHaveLength(0); // Should be 0, not 2
    });

    it('should return all "in_progress" tasks only', () => {
      const inProgress = taskService.getByStatus('in_progress');
      expect(inProgress).toHaveLength(2);
      expect(inProgress.every((t) => t.status === 'in_progress')).toBe(true);
    });

    it('should return empty array for non-matching status', () => {
      const invalid = taskService.getByStatus('completed');
      expect(invalid).toHaveLength(0);
    });
  });

  describe('getPaginated', () => {
    beforeEach(() => {
      for (let i = 1; i <= 25; i++) {
        taskService.create({ title: `Task ${i}` });
      }
    });

    it('should return correct page size', () => {
      const page1 = taskService.getPaginated(0, 10);
      expect(page1).toHaveLength(10);
    });

    it('should return first 10 items on page 0', () => {
      const page0 = taskService.getPaginated(0, 10);
      expect(page0[0].title).toBe('Task 1');
      expect(page0[9].title).toBe('Task 10');
    });

    it('should return items 11-20 on page 1 with limit 10', () => {
      const page1 = taskService.getPaginated(1, 10);
      expect(page1).toHaveLength(10);
      expect(page1[0].title).toBe('Task 11');
      expect(page1[9].title).toBe('Task 20');
    });

    it('should return remaining items on last page', () => {
      const page2 = taskService.getPaginated(2, 10);
      expect(page2).toHaveLength(5);
      expect(page2[0].title).toBe('Task 21');
    });

    it('should return empty array for out-of-bounds page', () => {
      const page10 = taskService.getPaginated(10, 10);
      expect(page10).toHaveLength(0);
    });
  });

  describe('getStats', () => {
    it('should count tasks by status', () => {
      taskService.create({ title: 'T1', status: 'todo' });
      taskService.create({ title: 'T2', status: 'todo' });
      taskService.create({ title: 'T3', status: 'in_progress' });
      taskService.create({ title: 'T4', status: 'done' });

      const stats = taskService.getStats();
      expect(stats.todo).toBe(2);
      expect(stats.in_progress).toBe(1);
      expect(stats.done).toBe(1);
    });

    it('should count overdue tasks', () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString(); // 1 day ago
      taskService.create({ title: 'T1', status: 'todo', dueDate: pastDate });
      taskService.create({ title: 'T2', status: 'in_progress', dueDate: pastDate });
      taskService.create({ title: 'T3', status: 'done', dueDate: pastDate }); // Done tasks shouldn't count

      const stats = taskService.getStats();
      expect(stats.overdue).toBe(2);
    });

    it('should not count done tasks as overdue', () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString();
      taskService.create({ title: 'T1', status: 'done', dueDate: pastDate });

      const stats = taskService.getStats();
      expect(stats.overdue).toBe(0);
    });
  });

  describe('update', () => {
    it('should update task fields', () => {
      const task = taskService.create({ title: 'Original', priority: 'low' });
      const updated = taskService.update(task.id, { title: 'Updated', priority: 'high' });

      expect(updated.title).toBe('Updated');
      expect(updated.priority).toBe('high');
      expect(updated.id).toBe(task.id);
    });

    it('should return null for non-existent task', () => {
      const result = taskService.update('fake-id', { title: 'Updated' });
      expect(result).toBeNull();
    });

    it('should preserve fields not being updated', () => {
      const task = taskService.create({
        title: 'Original',
        description: 'Original desc',
        priority: 'high',
      });
      const updated = taskService.update(task.id, { title: 'Only Title' });

      expect(updated.title).toBe('Only Title');
      expect(updated.description).toBe('Original desc');
      expect(updated.priority).toBe('high');
    });
  });

  describe('remove', () => {
    it('should remove a task', () => {
      const task = taskService.create({ title: 'Remove Me' });
      const removed = taskService.remove(task.id);

      expect(removed).toBe(true);
      expect(taskService.findById(task.id)).toBeUndefined();
    });

    it('should return false for non-existent task', () => {
      const removed = taskService.remove('fake-id');
      expect(removed).toBe(false);
    });

    it('should reduce task count', () => {
      const t1 = taskService.create({ title: 'T1' });
      const t2 = taskService.create({ title: 'T2' });

      expect(taskService.getAll()).toHaveLength(2);
      taskService.remove(t1.id);
      expect(taskService.getAll()).toHaveLength(1);
    });
  });

  describe('completeTask', () => {
    it('should mark task as done and set completedAt', () => {
      const task = taskService.create({ title: 'Complete Me' });
      const completed = taskService.completeTask(task.id);

      expect(completed.status).toBe('done');
      expect(completed.completedAt).not.toBeNull();
      expect(new Date(completed.completedAt).getTime()).toBeLessThanOrEqual(Date.now() + 100);
    });

    it('should set completion timestamp', () => {
      const task = taskService.create({ title: 'Time Me' });
      const before = Date.now();
      const completed = taskService.completeTask(task.id);
      const after = Date.now();

      const completedTime = new Date(completed.completedAt).getTime();
      expect(completedTime).toBeGreaterThanOrEqual(before);
      expect(completedTime).toBeLessThanOrEqual(after + 100);
    });

    it('should return null for non-existent task', () => {
      const result = taskService.completeTask('fake-id');
      expect(result).toBeNull();
    });

    it('should reset priority to medium when completing', () => {
      const task = taskService.create({ title: 'Reset Priority', priority: 'high' });
      const completed = taskService.completeTask(task.id);

      expect(completed.priority).toBe('medium');
    });
  });
});

describe('Task API - Integration Tests', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('POST /tasks', () => {
    it('should create a task and return 201', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({
          title: 'New Task',
          description: 'A new task',
          priority: 'high',
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.title).toBe('New Task');
      expect(res.body.status).toBe('todo');
      expect(res.body.completedAt).toBeNull();
    });

    it('should return 400 for missing title', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ description: 'No title' })
        .expect(400);

      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toContain('title');
    });

    it('should return 400 for empty title', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: '   ' })
        .expect(400);

      expect(res.body).toHaveProperty('error');
    });

    it('should return 400 for invalid status', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'Task', status: 'invalid' })
        .expect(400);

      expect(res.body.error).toContain('status');
    });

    it('should return 400 for invalid priority', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'Task', priority: 'urgent' })
        .expect(400);

      expect(res.body.error).toContain('priority');
    });

    it('should return 400 for invalid dueDate', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'Task', dueDate: 'not-a-date' })
        .expect(400);

      expect(res.body.error).toContain('dueDate');
    });
  });

  describe('GET /tasks', () => {
    it('should list all tasks', async () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });

      const res = await request(app)
        .get('/tasks')
        .expect(200);

      expect(res.body).toHaveLength(2);
    });

    it('should return empty array when no tasks', async () => {
      const res = await request(app)
        .get('/tasks')
        .expect(200);

      expect(res.body).toEqual([]);
    });

    it('should filter by status query param', async () => {
      taskService.create({ title: 'T1', status: 'todo' });
      taskService.create({ title: 'T2', status: 'in_progress' });
      taskService.create({ title: 'T3', status: 'done' });

      const res = await request(app)
        .get('/tasks?status=todo')
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe('T1');
    });

    it('should filter by status without false matches', async () => {
      taskService.create({ title: 'T1', status: 'todo' });
      taskService.create({ title: 'T2', status: 'in_progress' });

      const res = await request(app)
        .get('/tasks?status=progress')
        .expect(200);

      expect(res.body).toHaveLength(0); // Should not match "in_progress"
    });

    it('should support pagination', async () => {
      for (let i = 1; i <= 25; i++) {
        taskService.create({ title: `Task ${i}` });
      }

      const page1 = await request(app)
        .get('/tasks?page=0&limit=10')
        .expect(200);

      expect(page1.body).toHaveLength(10);
      expect(page1.body[0].title).toBe('Task 1');
    });

    it('should return second page correctly', async () => {
      for (let i = 1; i <= 25; i++) {
        taskService.create({ title: `Task ${i}` });
      }

      const page2 = await request(app)
        .get('/tasks?page=1&limit=10')
        .expect(200);

      expect(page2.body).toHaveLength(10);
      expect(page2.body[0].title).toBe('Task 11');
      expect(page2.body[9].title).toBe('Task 20');
    });

    it('should return remaining items on last page', async () => {
      for (let i = 1; i <= 25; i++) {
        taskService.create({ title: `Task ${i}` });
      }

      const lastPage = await request(app)
        .get('/tasks?page=2&limit=10')
        .expect(200);

      expect(lastPage.body).toHaveLength(5);
    });
  });

  describe('GET /tasks/stats', () => {
    it('should return stats object', async () => {
      const res = await request(app)
        .get('/tasks/stats')
        .expect(200);

      expect(res.body).toHaveProperty('todo');
      expect(res.body).toHaveProperty('in_progress');
      expect(res.body).toHaveProperty('done');
      expect(res.body).toHaveProperty('overdue');
    });

    it('should count tasks by status', async () => {
      taskService.create({ title: 'T1', status: 'todo' });
      taskService.create({ title: 'T2', status: 'todo' });
      taskService.create({ title: 'T3', status: 'in_progress' });

      const res = await request(app)
        .get('/tasks/stats')
        .expect(200);

      expect(res.body.todo).toBe(2);
      expect(res.body.in_progress).toBe(1);
      expect(res.body.done).toBe(0);
    });

    it('should count overdue tasks', async () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString();
      taskService.create({ title: 'T1', status: 'todo', dueDate: pastDate });
      taskService.create({ title: 'T2', status: 'done', dueDate: pastDate });

      const res = await request(app)
        .get('/tasks/stats')
        .expect(200);

      expect(res.body.overdue).toBe(1);
    });
  });

  describe('GET /tasks/:id', () => {
    it('should get a single task by id', async () => {
      const created = taskService.create({ title: 'Get Me' });

      const res = await request(app)
        .get(`/tasks/${created.id}`)
        .expect(200);

      expect(res.body.id).toBe(created.id);
      expect(res.body.title).toBe('Get Me');
    });

    // Note: GET /:id is not implemented in the routes - this would be a feature gap
  });

  describe('PUT /tasks/:id', () => {
    it('should update a task', async () => {
      const task = taskService.create({ title: 'Original', priority: 'low' });

      const res = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ title: 'Updated', priority: 'high' })
        .expect(200);

      expect(res.body.title).toBe('Updated');
      expect(res.body.priority).toBe('high');
    });

    it('should return 404 for non-existent task', async () => {
      const res = await request(app)
        .put('/tasks/fake-id')
        .send({ title: 'Updated' })
        .expect(404);

      expect(res.body).toHaveProperty('error');
    });

    it('should return 400 for invalid status update', async () => {
      const task = taskService.create({ title: 'Task' });

      const res = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ status: 'invalid' })
        .expect(400);

      expect(res.body.error).toContain('status');
    });

    it('should preserve unchanged fields', async () => {
      const task = taskService.create({
        title: 'Original',
        description: 'Original desc',
        priority: 'high',
      });

      const res = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ title: 'New Title' })
        .expect(200);

      expect(res.body.title).toBe('New Title');
      expect(res.body.description).toBe('Original desc');
      expect(res.body.priority).toBe('high');
    });
  });

  describe('DELETE /tasks/:id', () => {
    it('should delete a task and return 204', async () => {
      const task = taskService.create({ title: 'Delete Me' });

      await request(app)
        .delete(`/tasks/${task.id}`)
        .expect(204);

      expect(taskService.findById(task.id)).toBeUndefined();
    });

    it('should return 404 for non-existent task', async () => {
      const res = await request(app)
        .delete('/tasks/fake-id')
        .expect(404);

      expect(res.body).toHaveProperty('error');
    });

    it('should remove task from list', async () => {
      const t1 = taskService.create({ title: 'Task 1' });
      const t2 = taskService.create({ title: 'Task 2' });

      await request(app).delete(`/tasks/${t1.id}`).expect(204);

      const res = await request(app).get('/tasks').expect(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].id).toBe(t2.id);
    });
  });

  describe('PATCH /tasks/:id/complete', () => {
    it('should mark task as done', async () => {
      const task = taskService.create({ title: 'Complete Me' });

      const res = await request(app)
        .patch(`/tasks/${task.id}/complete`)
        .expect(200);

      expect(res.body.status).toBe('done');
      expect(res.body.completedAt).not.toBeNull();
    });

    it('should return 404 for non-existent task', async () => {
      const res = await request(app)
        .patch('/tasks/fake-id/complete')
        .expect(404);

      expect(res.body).toHaveProperty('error');
    });

    it('should reset priority to medium', async () => {
      const task = taskService.create({ title: 'Task', priority: 'high' });

      const res = await request(app)
        .patch(`/tasks/${task.id}/complete`)
        .expect(200);

      expect(res.body.priority).toBe('medium');
    });

    it('should set timestamp', async () => {
      const task = taskService.create({ title: 'Task' });

      const res = await request(app)
        .patch(`/tasks/${task.id}/complete`)
        .expect(200);

      expect(res.body.completedAt).not.toBeNull();
      const completedTime = new Date(res.body.completedAt).getTime();
      expect(completedTime).toBeLessThanOrEqual(Date.now() + 100);
    });
  });

  describe('PATCH /tasks/:id/assign', () => {
    it('should assign a task to a person', async () => {
      const task = taskService.create({ title: 'Assign Me' });

      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 'John Doe' })
        .expect(200);

      expect(res.body.assignee).toBe('John Doe');
      expect(res.body.id).toBe(task.id);
    });

    it('should update assignee on re-assignment', async () => {
      const task = taskService.create({ title: 'Assign Me' });

      // First assignment
      await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 'John Doe' })
        .expect(200);

      // Re-assignment
      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 'Jane Smith' })
        .expect(200);

      expect(res.body.assignee).toBe('Jane Smith');
    });

    it('should trim whitespace from assignee name', async () => {
      const task = taskService.create({ title: 'Assign Me' });

      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: '  John Doe  ' })
        .expect(200);

      expect(res.body.assignee).toBe('John Doe');
    });

    it('should return 400 if assignee is missing', async () => {
      const task = taskService.create({ title: 'Assign Me' });

      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({})
        .expect(400);

      expect(res.body.error).toContain('assignee');
    });

    it('should return 400 if assignee is empty string', async () => {
      const task = taskService.create({ title: 'Assign Me' });

      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: '' })
        .expect(400);

      expect(res.body.error).toContain('assignee');
    });

    it('should return 400 if assignee is whitespace only', async () => {
      const task = taskService.create({ title: 'Assign Me' });

      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: '   ' })
        .expect(400);

      expect(res.body.error).toContain('assignee');
    });

    it('should return 400 if assignee is not a string', async () => {
      const task = taskService.create({ title: 'Assign Me' });

      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 123 })
        .expect(400);

      expect(res.body.error).toContain('assignee');
    });

    it('should return 404 if task does not exist', async () => {
      const res = await request(app)
        .patch('/tasks/non-existent-id/assign')
        .send({ assignee: 'John Doe' })
        .expect(404);

      expect(res.body.error).toContain('Task not found');
    });

    it('should preserve other task fields when assigning', async () => {
      const task = taskService.create({
        title: 'My Task',
        description: 'Task description',
        status: 'in_progress',
        priority: 'high',
      });

      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 'John Doe' })
        .expect(200);

      expect(res.body.title).toBe('My Task');
      expect(res.body.description).toBe('Task description');
      expect(res.body.status).toBe('in_progress');
      expect(res.body.priority).toBe('high');
      expect(res.body.assignee).toBe('John Doe');
    });

    it('should allow special characters in assignee name', async () => {
      const task = taskService.create({ title: 'Assign Me' });

      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: "O'Brien-Smith, Jr." })
        .expect(200);

      expect(res.body.assignee).toBe("O'Brien-Smith, Jr.");
    });
  });
});
