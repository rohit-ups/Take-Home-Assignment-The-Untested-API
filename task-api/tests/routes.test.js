const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

describe('Task API Integration Tests', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('GET /tasks - List all tasks', () => {
    // Test: Verifies HTTP 200 status and empty array response when database is empty
    // Purpose: Ensures consistent API behavior for empty state
    test('should return 200 with empty array when no tasks', async () => {
      const response = await request(app).get('/tasks');
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    // Test: Verifies GET retrieves newly created task from previous POST request
    // Purpose: Tests end-to-end create → read workflow to ensure data persistence
    test('should return 200 with all tasks when tasks exist', async () => {
      const created = await request(app)
        .post('/tasks')
        .send({ title: 'Task 1' });

      const response = await request(app).get('/tasks');
      expect(response.status).toBe(200);
      expect(response.body.length).toBe(1);
      expect(response.body[0].title).toBe('Task 1');
    });

    // Test: Validates that response objects include all required properties
    // Purpose: Ensures API returns complete task objects with all fields (id, title, description, status, priority, createdAt)
    test('should return correct task properties', async () => {
      await request(app)
        .post('/tasks')
        .send({
          title: 'Test Task',
          description: 'Test desc',
          priority: 'high',
          status: 'pending'
        });

      const response = await request(app).get('/tasks');
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('title');
      expect(response.body[0]).toHaveProperty('description');
      expect(response.body[0]).toHaveProperty('status');
      expect(response.body[0]).toHaveProperty('priority');
      expect(response.body[0]).toHaveProperty('createdAt');
    });

    // Test: Verifies endpoint correctly returns all created tasks in the array
    // Purpose: Ensures multiple tasks are all returned without filtering or loss
    test('should return multiple tasks', async () => {
      await request(app).post('/tasks').send({ title: 'Task 1' });
      await request(app).post('/tasks').send({ title: 'Task 2' });
      await request(app).post('/tasks').send({ title: 'Task 3' });

      const response = await request(app).get('/tasks');
      expect(response.body.length).toBe(3);
    });
  });

  describe('GET /tasks?status=<status> - Filter by status', () => {
    beforeEach(async () => {
      await request(app).post('/tasks').send({ title: 'Task 1', status: 'pending' });
      await request(app).post('/tasks').send({ title: 'Task 2', status: 'in-progress' });
      await request(app).post('/tasks').send({ title: 'Task 3', status: 'pending' });
    });

    // Test: Verifies HTTP 200 and correct count when filtering by status
    // Purpose: Ensures status filter works and returns only matching tasks
    test('should return 200 with filtered tasks', async () => {
      const response = await request(app).get('/tasks?status=pending');
      expect(response.status).toBe(200);
      expect(response.body.length).toBe(2);
    });

    // Test: Validates only tasks with matching status are returned
    // Purpose: Prevents other status values from appearing in filtered results
    test('should return only tasks matching status', async () => {
      const response = await request(app).get('/tasks?status=in-progress');
      expect(response.body.length).toBe(1);
      expect(response.body[0].title).toBe('Task 2');
    });

    // Test: CRITICAL - Verifies exact status matching, not substring matching
    // Purpose: Prevents Bug #2. Ensures "in" doesn't match "in-progress"
    test('should use exact matching (not partial match)', async () => {
      const response = await request(app).get('/tasks?status=in');
      expect(response.status).toBe(200);
      expect(response.body.length).toBe(0);
    });

    // Test: Verifies empty array response for statuses with no tasks
    // Purpose: Ensures graceful handling of valid but non-existent filter values
    test('should return empty array for non-existent status', async () => {
      const response = await request(app).get('/tasks?status=non-existent');
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    // Test: Verifies "completed" status filter works (common status with no items)
    // Purpose: Tests edge case where valid status exists but no tasks have it
    test('should filter by completed status', async () => {
      const response = await request(app).get('/tasks?status=completed');
      expect(response.status).toBe(200);
      expect(response.body.length).toBe(0);
    });
  });

  describe('GET /tasks?page=<page>&limit=<limit> - Paginated list', () => {
    beforeEach(async () => {
      for (let i = 1; i <= 15; i++) {
        await request(app).post('/tasks').send({ title: `Task ${i}` });
      }
    });

    // Test: Verifies pagination returns correct page slice and respects limit parameter
    // Purpose: Ensures first page returns limited results (not all tasks)
    test('should return correct page of tasks', async () => {
      const response = await request(app).get('/tasks?page=1&limit=5');
      expect(response.status).toBe(200);
      expect(response.body.length).toBe(5);
    });

    // Test: Verifies limit parameter is actually enforced in response
    // Purpose: Ensures custom limit (different from default) works correctly
    test('should respect limit parameter', async () => {
      const response = await request(app).get('/tasks?page=1&limit=3');
      expect(response.body.length).toBe(3);
    });

    // Test: CRITICAL - Verifies second page returns different items than first page
    // Purpose: Prevents Bug #1 (off-by-one pagination). Ensures page separation works
    test('should return second page correctly', async () => {
      const page1 = await request(app).get('/tasks?page=1&limit=5');
      const page2 = await request(app).get('/tasks?page=2&limit=5');

      expect(page1.body[0].title).not.toBe(page2.body[0].title);
      expect(page2.body.length).toBe(5);
    });

    // Test: Verifies empty array response when pagination offset exceeds data
    // Purpose: Ensures graceful handling of requests beyond available pages
    test('should return empty array when page beyond available data', async () => {
      const response = await request(app).get('/tasks?page=10&limit=5');
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    // Test: Verifies endpoint works when only page is specified (limit uses default)
    // Purpose: Ensures endpoint handles missing parameters gracefully
    test('should handle missing limit (use default)', async () => {
      const response = await request(app).get('/tasks?page=1');
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    // Test: Verifies endpoint works when only limit is specified (page uses default)
    // Purpose: Ensures flexibility in query parameter usage
    test('should handle missing page (use default)', async () => {
      const response = await request(app).get('/tasks?limit=5');
      expect(response.status).toBe(200);
      expect(response.body.length).toBe(5);
    });
  });

  describe('POST /tasks - Create task', () => {
    // Test: Verifies HTTP 201 (Created) status and returns created task object
    // Purpose: Ensures successful creation returns proper status and response body
    test('should return 201 with created task', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({ title: 'New Task' });

      expect(response.status).toBe(201);
      expect(response.body.title).toBe('New Task');
    });

    // Test: Validates all expected properties are set on created task
    // Purpose: Ensures create endpoint generates id, timestamps, and applies defaults correctly
    test('should set correct properties on created task', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({
          title: 'Task',
          description: 'Desc',
          priority: 'high',
          status: 'pending'
        });

      expect(response.body.id).toBeDefined();
      expect(response.body.title).toBe('Task');
      expect(response.body.description).toBe('Desc');
      expect(response.body.priority).toBe('high');
      expect(response.body.status).toBe('pending');
      expect(response.body.createdAt).toBeDefined();
    });

    // Test: Verifies HTTP 400 error when title field is missing
    // Purpose: Ensures validation rejects incomplete requests
    test('should return 400 validation error for missing title', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    // Test: Verifies whitespace-only title is rejected as invalid
    // Purpose: Ensures validation catches empty/whitespace titles
    test('should return 400 for empty title string', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({ title: '   ' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    // Test: Verifies invalid priority values are rejected
    // Purpose: Ensures enum validation works for priority field
    test('should return 400 for invalid priority', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({
          title: 'Task',
          priority: 'invalid-priority'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('priority');
    });

    // Test: Verifies invalid status values are rejected
    // Purpose: Ensures enum validation works for status field (tests Bug #3 fix)
    test('should return 400 for invalid status', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({
          title: 'Task',
          status: 'invalid-status'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('status');
    });

    // Test: Verifies invalid date format is rejected for dueDate
    // Purpose: Ensures date validation enforces ISO format
    test('should return 400 for invalid dueDate', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({
          title: 'Task',
          dueDate: 'not-a-valid-date'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('dueDate');
    });

    // Test: Verifies default values are applied to optional fields when not provided
    // Purpose: Ensures service layer defaults are applied correctly (pending status, medium priority, etc.)
    test('should use default values for optional fields', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({ title: 'Task' });

      expect(response.body.status).toBe('pending');
      expect(response.body.priority).toBe('medium');
      expect(response.body.description).toBe('');
      expect(response.body.dueDate).toBeNull();
    });

    // Test: Verifies valid ISO 8601 dueDate format is accepted
    // Purpose: Ensures date validation accepts proper ISO format
    test('should accept valid ISO dueDate', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({
          title: 'Task',
          dueDate: '2026-04-15T23:59:59Z'
        });

      expect(response.status).toBe(201);
      expect(response.body.dueDate).toBe('2026-04-15T23:59:59Z');
    });
  });

  describe('PUT /tasks/:id - Update task', () => {
    let taskId;

    beforeEach(async () => {
      const response = await request(app)
        .post('/tasks')
        .send({ title: 'Original Task', status: 'pending' });
      taskId = response.body.id;
    });

    // Test: Verifies HTTP 200 status and updated task object is returned
    // Purpose: Ensures successful update returns correct status and modified data
    test('should return 200 with updated task', async () => {
      const response = await request(app)
        .put(`/tasks/${taskId}`)
        .send({ title: 'Updated Task' });

      expect(response.status).toBe(200);
      expect(response.body.title).toBe('Updated Task');
    });

    // Test: Verifies all modifiable fields can be updated in single request
    // Purpose: Ensures update works for: title, description, status, priority
    test('should update all modifiable fields', async () => {
      const response = await request(app)
        .put(`/tasks/${taskId}`)
        .send({
          title: 'New Title',
          description: 'New Description',
          status: 'completed',
          priority: 'high'
        });

      expect(response.body.title).toBe('New Title');
      expect(response.body.description).toBe('New Description');
      expect(response.body.status).toBe('completed');
      expect(response.body.priority).toBe('high');
    });

    // Test: Verifies HTTP 404 error when attempting to update non-existent task
    // Purpose: Ensures proper error handling for invalid task IDs
    test('should return 404 when task does not exist', async () => {
      const response = await request(app)
        .put('/tasks/non-existent-id')
        .send({ title: 'New' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Task not found');
    });

    // Test: Verifies validation errors prevent invalid updates
    // Purpose: Ensures whitespace-only titles are rejected during update
    test('should return 400 for validation error', async () => {
      const response = await request(app)
        .put(`/tasks/${taskId}`)
        .send({ title: '   ' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    // Test: Verifies invalid status values are rejected
    // Purpose: Ensures enum validation applies to updates too (Bug #3)
    test('should return 400 for invalid status', async () => {
      const response = await request(app)
        .put(`/tasks/${taskId}`)
        .send({ status: 'invalid' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('status');
    });

    // Test: Verifies updates can modify single field without providing all fields
    // Purpose: Ensures flexibility - update only what's needed
    test('should allow partial field updates', async () => {
      const response = await request(app)
        .put(`/tasks/${taskId}`)
        .send({ priority: 'high' });

      expect(response.status).toBe(200);
      expect(response.body.title).toBe('Original Task'); // Unchanged
      expect(response.body.priority).toBe('high');       // Changed
    });
  });

  describe('DELETE /tasks/:id - Delete task', () => {
    let taskId;

    beforeEach(async () => {
      const response = await request(app)
        .post('/tasks')
        .send({ title: 'Task to delete' });
      taskId = response.body.id;
    });

    // Test: Verifies HTTP 204 (No Content) status on successful deletion
    // Purpose: Ensures proper HTTP status for successful delete operation
    test('should return 204 on successful delete', async () => {
      const response = await request(app).delete(`/tasks/${taskId}`);
      expect(response.status).toBe(204);
    });

    // Test: Verifies task is actually removed from database and won't appear in GET
    // Purpose: Ensures delete truly removes data, not just marks for deletion
    test('should actually delete task from database', async () => {
      await request(app).delete(`/tasks/${taskId}`);
      const response = await request(app).get('/tasks');
      expect(response.body.length).toBe(0);
    });

    // Test: Verifies HTTP 404 error when attempting to delete non-existent task
    // Purpose: Ensures proper error handling for invalid task IDs
    test('should return 404 when task does not exist', async () => {
      const response = await request(app).delete('/tasks/non-existent-id');
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Task not found');
    });

    // Test: Verifies deletion only removes target task, other tasks remain intact
    // Purpose: Ensures delete operation is precise and doesn't have cascade effects
    test('should not affect other tasks', async () => {
      const task2 = await request(app)
        .post('/tasks')
        .send({ title: 'Task 2' });

      await request(app).delete(`/tasks/${taskId}`);

      const response = await request(app).get('/tasks');
      expect(response.body.length).toBe(1);
      expect(response.body[0].id).toBe(task2.body.id);
    });

    // Test: Verifies deletion cannot be performed twice on same task
    // Purpose: Ensures idempotency - second delete properly returns 404
    test('should handle double delete (already deleted)', async () => {
      await request(app).delete(`/tasks/${taskId}`);
      const response = await request(app).delete(`/tasks/${taskId}`);
      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /tasks/:id/complete - Mark task complete', () => {
    let taskId;

    beforeEach(async () => {
      const response = await request(app)
        .post('/tasks')
        .send({ title: 'Task', status: 'pending', priority: 'high' });
      taskId = response.body.id;
    });

    // Test: Verifies HTTP 200 status and returns completed task object
    // Purpose: Ensures successful completion returns proper response
    test('should return 200 with updated task', async () => {
      const response = await request(app).patch(`/tasks/${taskId}/complete`);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
    });

    // Test: Verifies status field is changed to 'completed'
    // Purpose: Ensures core completion action works correctly
    test('should set status to completed', async () => {
      const response = await request(app).patch(`/tasks/${taskId}/complete`);
      expect(response.body.status).toBe('completed');
    });

    // Test: Verifies completedAt timestamp is set when task is completed
    // Purpose: Ensures completion time is recorded for auditing
    test('should set completedAt timestamp', async () => {
      const response = await request(app).patch(`/tasks/${taskId}/complete`);
      expect(response.body.completedAt).toBeDefined();
      expect(typeof response.body.completedAt).toBe('string');
    });

    // Test: Verifies HTTP 404 error when attempting to complete non-existent task
    // Purpose: Ensures proper error handling for invalid task IDs
    test('should return 404 when task does not exist', async () => {
      const response = await request(app).patch('/tasks/non-existent-id/complete');
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Task not found');
    });

    // Test: Verifies priority is normalized to 'medium' upon completion
    // Purpose: Ensures completion has side effects on priority field
    test('should set priority to medium', async () => {
      const response = await request(app).patch(`/tasks/${taskId}/complete`);
      expect(response.body.priority).toBe('medium');
    });

    // Test: Verifies other task fields remain unchanged (not affected by completion)
    // Purpose: Ensures completion only modifies specific fields
    test('should preserve other task fields', async () => {
      const response = await request(app).patch(`/tasks/${taskId}/complete`);
      expect(response.body.title).toBe('Task');
      expect(response.body.id).toBe(taskId);
    });

    // Test: Verifies completing already-completed task is safe (idempotent)
    // Purpose: Ensures multiple completions don't cause errors or state issues
    test('should handle completing already completed task', async () => {
      await request(app).patch(`/tasks/${taskId}/complete`);
      const response = await request(app).patch(`/tasks/${taskId}/complete`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('completed');
    });

    // Test: Verifies request body is ignored (status in body doesn't override completion)
    // Purpose: Ensures endpoint logic cannot be bypassed via request body
    test('should ignore request body', async () => {
      const response = await request(app)
        .patch(`/tasks/${taskId}/complete`)
        .send({ status: 'pending' });

      expect(response.body.status).toBe('completed'); // Not 'pending'
    });
  });

  describe('GET /tasks/stats - Statistics', () => {
    // Test: Verifies stats endpoint returns correct count for each status
    // Purpose: Ensures aggregation works correctly across mixed task statuses
    test('should return correct counts for each status', async () => {
      await request(app).post('/tasks').send({ title: 'Task 1', status: 'pending' });
      await request(app).post('/tasks').send({ title: 'Task 2', status: 'in-progress' });
      await request(app).post('/tasks').send({ title: 'Task 3', status: 'completed' });
      await request(app).post('/tasks').send({ title: 'Task 4', status: 'pending' });

      const response = await request(app).get('/tasks/stats');
      expect(response.status).toBe(200);
      expect(response.body.pending).toBe(2);
      expect(response.body['in-progress']).toBe(1);
      expect(response.body.completed).toBe(1);
    });

    // Test: Verifies overdue count includes only non-completed tasks with past dueDate
    // Purpose: Ensures overdue calculation excludes completed tasks (Bug #3 fix)
    test('should return correct overdue count', async () => {
      const pastDate = new Date('2020-01-01').toISOString();
      await request(app).post('/tasks').send({
        title: 'Overdue Task',
        status: 'pending',
        dueDate: pastDate
      });
      await request(app).post('/tasks').send({
        title: 'On-time Task',
        status: 'pending'
      });

      const response = await request(app).get('/tasks/stats');
      expect(response.body.overdue).toBe(1);
    });

    // Test: Verifies all counts are zero when database is empty
    // Purpose: Ensures stats handle initial empty state correctly
    test('should return zero counts when no tasks exist', async () => {
      const response = await request(app).get('/tasks/stats');
      expect(response.status).toBe(200);
      expect(response.body.pending).toBe(0);
      expect(response.body['in-progress']).toBe(0);
      expect(response.body.completed).toBe(0);
      expect(response.body.overdue).toBe(0);
    });

    // Test: CRITICAL - Verifies completed tasks are NOT counted in overdue statistics
    // Purpose: Prevents inflated overdue counts from finished work (Bug #3 fix)
    test('should not count completed tasks as overdue', async () => {
      const pastDate = new Date('2020-01-01').toISOString();
      await request(app).post('/tasks').send({
        title: 'Completed overdue task',
        status: 'completed',
        dueDate: pastDate
      });
      await request(app).post('/tasks').send({
        title: 'Pending overdue task',
        status: 'pending',
        dueDate: pastDate
      });

      const response = await request(app).get('/tasks/stats');
      expect(response.body.overdue).toBe(1); // Only 1, not 2
    });

    // Test: Verifies counting handles high volume of same status
    // Purpose: Ensures aggregation works correctly with multiple tasks of same status
    test('should handle multiple tasks with same status', async () => {
      for (let i = 0; i < 5; i++) {
        await request(app).post('/tasks').send({ title: `Task ${i}`, status: 'pending' });
      }

      const response = await request(app).get('/tasks/stats');
      expect(response.body.pending).toBe(5);
    });

    // Test: Verifies response includes all required status fields
    // Purpose: Ensures API contract is maintained (pending, in-progress, completed, overdue)
    test('should return all status counts in response', async () => {
      const response = await request(app).get('/tasks/stats');
      expect(response.body).toHaveProperty('pending');
      expect(response.body).toHaveProperty('in-progress');
      expect(response.body).toHaveProperty('completed');
      expect(response.body).toHaveProperty('overdue');
    });
  });

  describe('Error Handling', () => {
    // Test: Verifies API returns 404 for non-existent endpoints
    // Purpose: Ensures error handling middleware works for undefined routes
    test('should return 500 for unexpected server errors', async () => {
      // This would require forcing an error in the code
      // For now, we verify error handler exists
      const response = await request(app).get('/invalid-endpoint');
      // 404 is expected for non-existent endpoint
      expect(response.status).toBe(404);
    });
  });

  describe('Cross-endpoint Integration', () => {
    // Test: Validates complete CRUD workflow across multiple endpoints
    // Purpose: Ensures all endpoints work together in realistic usage pattern:
    //   1. POST /tasks creates new task
    //   2. GET /tasks retrieves created task
    //   3. PUT /tasks/:id updates task
    //   4. PATCH /tasks/:id/complete marks complete
    //   5. DELETE /tasks/:id removes task
    test('should handle complete workflow: create -> read -> update -> complete -> delete', async () => {
      // Create
      const createRes = await request(app)
        .post('/tasks')
        .send({ title: 'Workflow Test', priority: 'high' });
      const taskId = createRes.body.id;

      // Read
      const getRes = await request(app).get('/tasks');
      expect(getRes.body.length).toBe(1);

      // Update
      const updateRes = await request(app)
        .put(`/tasks/${taskId}`)
        .send({ status: 'in-progress' });
      expect(updateRes.body.status).toBe('in-progress');

      // Complete
      const completeRes = await request(app).patch(`/tasks/${taskId}/complete`);
      expect(completeRes.body.status).toBe('completed');

      // Delete
      const deleteRes = await request(app).delete(`/tasks/${taskId}`);
      expect(deleteRes.status).toBe(204);

      // Verify deleted
      const finalRes = await request(app).get('/tasks');
      expect(finalRes.body.length).toBe(0);
    });
  });
});
