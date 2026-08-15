const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');
const { validateAssignTask } = require('../src/utils/validators');

describe('PATCH /tasks/:id/assign & assignTask (Unit & Integration Tests)', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('Validator: validateAssignTask()', () => {
    it('returns null for valid non-empty string assignees', () => {
      expect(validateAssignTask({ assignee: 'Alice' })).toBeNull();
      expect(validateAssignTask({ assignee: 'Bob Smith' })).toBeNull();
      expect(validateAssignTask({ assignee: 'user-123@example.com' })).toBeNull();
    });

    it('returns error when assignee is missing or body is undefined/empty', () => {
      expect(validateAssignTask({})).toContain('assignee is required');
      expect(validateAssignTask({ otherField: 'test' })).toContain('assignee is required');
      expect(validateAssignTask(null)).toContain('assignee is required');
      expect(validateAssignTask(undefined)).toContain('assignee is required');
    });

    it('returns error when assignee is an empty string or whitespace-only', () => {
      expect(validateAssignTask({ assignee: '' })).toContain('assignee is required');
      expect(validateAssignTask({ assignee: '   ' })).toContain('assignee is required');
      expect(validateAssignTask({ assignee: '\t\n' })).toContain('assignee is required');
    });

    it('returns error when assignee is not a string type', () => {
      expect(validateAssignTask({ assignee: 123 })).toContain('assignee is required');
      expect(validateAssignTask({ assignee: true })).toContain('assignee is required');
      expect(validateAssignTask({ assignee: ['Alice'] })).toContain('assignee is required');
      expect(validateAssignTask({ assignee: { name: 'Alice' } })).toContain('assignee is required');
      expect(validateAssignTask({ assignee: null })).toContain('assignee is required');
    });

    it('returns error when assignee exceeds max length (100 characters)', () => {
      const longName = 'A'.repeat(101);
      expect(validateAssignTask({ assignee: longName })).toContain('must not exceed 100 characters');

      const exactMaxLengthName = 'A'.repeat(100);
      expect(validateAssignTask({ assignee: exactMaxLengthName })).toBeNull();
    });
  });

  describe('Service: assignTask()', () => {
    it('assigns assignee to task and returns updated task', () => {
      const created = taskService.create({ title: 'Task to assign' });
      expect(created.assignee).toBeNull();

      const assigned = taskService.assignTask(created.id, 'Alice');
      expect(assigned).toBeDefined();
      expect(assigned.id).toBe(created.id);
      expect(assigned.assignee).toBe('Alice');

      const found = taskService.findById(created.id);
      expect(found.assignee).toBe('Alice');
    });

    it('returns null when assigning to non-existent task ID', () => {
      const result = taskService.assignTask('non-existent-uuid', 'Alice');
      expect(result).toBeNull();
    });

    it('preserves all existing properties when assigning', () => {
      const created = taskService.create({
        title: 'Original Title',
        description: 'Original Description',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2026-12-31T23:59:59.000Z',
      });

      const assigned = taskService.assignTask(created.id, 'Bob');

      expect(assigned.title).toBe('Original Title');
      expect(assigned.description).toBe('Original Description');
      expect(assigned.status).toBe('in_progress');
      expect(assigned.priority).toBe('high');
      expect(assigned.dueDate).toBe('2026-12-31T23:59:59.000Z');
      expect(assigned.createdAt).toBe(created.createdAt);
      expect(assigned.completedAt).toBeNull();
      expect(assigned.assignee).toBe('Bob');
    });
  });

  describe('Integration: PATCH /tasks/:id/assign', () => {
    it('successfully assigns a task (200) with trimmed assignee and preserves other fields', async () => {
      const createRes = await request(app)
        .post('/tasks')
        .send({
          title: 'Review PR',
          description: 'Check unit tests',
          priority: 'high',
          status: 'in_progress',
        })
        .expect(201);

      const id = createRes.body.id;

      const res = await request(app)
        .patch(`/tasks/${id}/assign`)
        .send({ assignee: '  Alice Johnson  ' })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(res.body.id).toBe(id);
      expect(res.body.assignee).toBe('Alice Johnson');
      expect(res.body.title).toBe('Review PR');
      expect(res.body.description).toBe('Check unit tests');
      expect(res.body.priority).toBe('high');
      expect(res.body.status).toBe('in_progress');
      expect(res.body.createdAt).toBe(createRes.body.createdAt);
      expect(res.body.completedAt).toBeNull();
    });

    it('returns 404 if the task does not exist', async () => {
      const res = await request(app)
        .patch('/tasks/non-existent-id/assign')
        .send({ assignee: 'Alice' })
        .expect(404);

      expect(res.body).toEqual({ error: 'Task not found' });
    });

    it('returns 400 if assignee field is missing from request body', async () => {
      const createRes = await request(app).post('/tasks').send({ title: 'Task' });
      const id = createRes.body.id;

      const res = await request(app)
        .patch(`/tasks/${id}/assign`)
        .send({})
        .expect(400);

      expect(res.body.error).toContain('assignee is required and must be a non-empty string');
    });

    it('returns 400 if assignee is empty string or whitespace-only', async () => {
      const createRes = await request(app).post('/tasks').send({ title: 'Task' });
      const id = createRes.body.id;

      const resEmpty = await request(app)
        .patch(`/tasks/${id}/assign`)
        .send({ assignee: '' })
        .expect(400);
      expect(resEmpty.body.error).toContain('assignee is required and must be a non-empty string');

      const resWhitespace = await request(app)
        .patch(`/tasks/${id}/assign`)
        .send({ assignee: '     ' })
        .expect(400);
      expect(resWhitespace.body.error).toContain('assignee is required and must be a non-empty string');
    });

    it('returns 400 if assignee is a non-string type (number, boolean, object, array)', async () => {
      const createRes = await request(app).post('/tasks').send({ title: 'Task' });
      const id = createRes.body.id;

      const resNum = await request(app)
        .patch(`/tasks/${id}/assign`)
        .send({ assignee: 42 })
        .expect(400);
      expect(resNum.body.error).toContain('assignee is required and must be a non-empty string');

      const resObj = await request(app)
        .patch(`/tasks/${id}/assign`)
        .send({ assignee: { name: 'Alice' } })
        .expect(400);
      expect(resObj.body.error).toContain('assignee is required and must be a non-empty string');
    });

    it('returns 400 if assignee exceeds max length (100 characters)', async () => {
      const createRes = await request(app).post('/tasks').send({ title: 'Task' });
      const id = createRes.body.id;

      const res = await request(app)
        .patch(`/tasks/${id}/assign`)
        .send({ assignee: 'A'.repeat(101) })
        .expect(400);

      expect(res.body.error).toContain('assignee must not exceed 100 characters');
    });

    it('allows reassigning an already-assigned task (idempotent PATCH semantics)', async () => {
      const createRes = await request(app).post('/tasks').send({ title: 'Reassign Task' });
      const id = createRes.body.id;

      const firstAssign = await request(app)
        .patch(`/tasks/${id}/assign`)
        .send({ assignee: 'Alice' })
        .expect(200);
      expect(firstAssign.body.assignee).toBe('Alice');

      const secondAssign = await request(app)
        .patch(`/tasks/${id}/assign`)
        .send({ assignee: 'Bob' })
        .expect(200);
      expect(secondAssign.body.assignee).toBe('Bob');

      // Verify subsequent GET reflects the reassigned assignee
      const getRes = await request(app).get('/tasks').expect(200);
      const task = getRes.body.find((t) => t.id === id);
      expect(task.assignee).toBe('Bob');
    });

    it('does not mutate status, completedAt, or priority when assigning a task', async () => {
      const createRes = await request(app)
        .post('/tasks')
        .send({ title: 'Task with priority', priority: 'high', status: 'todo' });
      const id = createRes.body.id;

      const assignRes = await request(app)
        .patch(`/tasks/${id}/assign`)
        .send({ assignee: 'Charlie' })
        .expect(200);

      expect(assignRes.body.priority).toBe('high');
      expect(assignRes.body.status).toBe('todo');
      expect(assignRes.body.completedAt).toBeNull();
    });
  });
});
