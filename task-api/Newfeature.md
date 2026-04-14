# 🚀 New Feature: Assign Task Endpoint

## 📌 Overview

A new endpoint has been added to allow assigning tasks to users. This feature enables task ownership tracking and team collaboration.

**Endpoint:** `PATCH /tasks/:id/assign`

---

## 📥 Request

### Endpoint
```
PATCH /tasks/:id/assign
```

### Request Body
```json
{
  "assignee": "string"
}
```

### Example Request
```bash
curl -X PATCH http://localhost:3000/tasks/123e4567-e89b-12d3-a456-426614174000/assign \
  -H "Content-Type: application/json" \
  -d '{"assignee": "Sumit"}'
```

---

## 📤 Response

### Success Response (200 OK)

Returns the updated task with the assignee:

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "title": "Complete project documentation",
  "description": "Write comprehensive docs for the API",
  "status": "pending",
  "priority": "high",
  "assignee": "Sumit",
  "createdAt": "2026-04-15T10:30:00Z",
  "updatedAt": "2026-04-15T11:45:00Z"
}
```

### Error Responses

#### 1. Empty Assignee (400 Bad Request)

```json
{
  "error": "Assignee is required"
}
```

**Trigger:** When assignee is empty, null, or contains only whitespace.

---

#### 2. Task Not Found (404 Not Found)

```json
{
  "error": "Task not found"
}
```

**Trigger:** When the task ID does not exist in the database.

---

## 🛠️ Implementation

### Location
```
src/routes/tasks.js
```

### Code

```javascript
router.patch('/:id/assign', (req, res) => {
  const { assignee } = req.body;

  if (!assignee || assignee.trim() === '') {
    return res.status(400).json({ error: 'Assignee is required' });
  }

  const task = taskService.update(req.params.id, { assignee });

  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.json(task);
});
```

### How It Works

1. Extract the `assignee` from the request body
2. Validate that `assignee` is not empty or whitespace
3. Call `taskService.update()` with the task ID and assignee
4. Return the updated task or appropriate error message

---

## 🧪 Testing

### Test Coverage

All scenarios have been tested using Supertest:

| Test Case | Status |
|-----------|--------|
| Assign task successfully | ✅ Passing |
| Overwrite existing assignee | ✅ Passing |
| Empty assignee validation | ✅ Passing |
| Task not found error | ✅ Passing |

### Test Results

```
Test Suites: 2 passed, 2 total
Tests: 34 passed, 34 total
Coverage: ~91%
Time: 3.424s
```

### Example Test Cases

```javascript
describe('PATCH /tasks/:id/assign', () => {
  it('should assign task successfully', async () => {
    const response = await request(app)
      .patch(`/tasks/${taskId}/assign`)
      .send({ assignee: 'Sumit' })
      .expect(200);

    expect(response.body.assignee).toBe('Sumit');
  });

  it('should overwrite existing assignee', async () => {
    await request(app)
      .patch(`/tasks/${taskId}/assign`)
      .send({ assignee: 'Sumit' })
      .expect(200);

    const response = await request(app)
      .patch(`/tasks/${taskId}/assign`)
      .send({ assignee: 'John' })
      .expect(200);

    expect(response.body.assignee).toBe('John');
  });

  it('should return 400 for empty assignee', async () => {
    await request(app)
      .patch(`/tasks/${taskId}/assign`)
      .send({ assignee: '' })
      .expect(400);
  });

  it('should return 404 for non-existent task', async () => {
    await request(app)
      .patch('/tasks/invalid-id/assign')
      .send({ assignee: 'Sumit' })
      .expect(404);
  });
});
```

---

## 🎯 Why This Endpoint?

This feature is essential for team-based task management systems:

| Use Case | Benefit |
|----------|---------|
| Task ownership tracking | Know who owns each task |
| Team collaboration | Assign tasks to team members |
| Workflow management | Streamline task distribution |
| Accountability | Create clear responsibility chains |
| Reporting | Track work distribution and workload |

---

## ⚙️ Design Decisions

### 1. Validation Strategy

**Decision:** Empty or whitespace-only assignees are rejected with a 400 status.

**Rationale:**
- Prevents invalid data in the database
- Provides clear feedback to the client
- Uses `.trim()` to catch whitespace-only strings

```javascript
if (!assignee || assignee.trim() === '') {
  return res.status(400).json({ error: 'Assignee is required' });
}
```

---

### 2. Overwrite Behavior

**Decision:** If a task is already assigned to someone, the new assignee overwrites the old one.

**Rationale:**
- Keeps the API simple and stateless
- Provides flexibility for reassigning tasks
- Matches typical PATCH semantics (update operation)
- No need to track assignment history (can be added later if needed)

---

### 3. Service Layer Reuse

**Decision:** Used existing `taskService.update()` method instead of creating a new `assign()` method.

**Rationale:**
- Maintains DRY principle
- Consistent with other update operations
- Reduces code duplication
- Easier to maintain and test

```javascript
const task = taskService.update(req.params.id, { assignee });
```

---

## 🚀 Impact

### What Changed
- ✅ Tasks can now be assigned to specific users
- ✅ API is more practical for real-world team workflows
- ✅ Usability improved for task management systems

### Before This Feature
- Tasks could be created and updated, but no ownership tracking
- No way to know who was responsible for each task
- Limited workflow management capabilities

### After This Feature
- Clear task ownership and assignment
- Better team collaboration support
- Improved task tracking and accountability
- Foundation for additional features (reassignment, delegation, etc.)

---

## 🔗 Related Features

### Potential Future Enhancements
- [ ] GET filter tasks by assignee: `GET /tasks?assignee=Sumit`
- [ ] Bulk assign tasks: `PATCH /tasks/assign` with multiple IDs
- [ ] Assignment history: Track who assigned the task and when
- [ ] Team management: Create teams and assign multiple users
- [ ] Notifications: Alert assignees when assigned a task
- [ ] Reassignment limits: Restrict reassignment frequency

---

## 📚 API Documentation

### Quick Reference

```bash
# Assign a task
curl -X PATCH http://localhost:3000/tasks/{taskId}/assign \
  -H "Content-Type: application/json" \
  -d '{"assignee": "Sumit"}'

# Reassign a task
curl -X PATCH http://localhost:3000/tasks/{taskId}/assign \
  -H "Content-Type: application/json" \
  -d '{"assignee": "John"}'
```

---

**Last Updated:** April 15, 2026  
**Version:** 1.0.0  
**Status:** ✅ Implemented & Tested


## Test results 


> task-api@1.0.0 test
> jest

 PASS  tests/taskService.test.js
 PASS  tests/taskRoutes.test.js

Test Suites: 2 passed, 2 total
Tests:       34 passed, 34 total
Snapshots:   0 total
Time:        2.575 s, estimated 3 s
Ran all test suites.


> task-api@1.0.0 coverage
> jest --coverage

 PASS  tests/taskService.test.js                                            
 PASS  tests/taskRoutes.test.js

 PASS  tests/taskService.test.js
 PASS  tests/taskRoutes.test.js
 PASS  tests/taskService.test.js
 PASS  tests/taskRoutes.test.js
 PASS  tests/taskRoutes.test.js
---------------|---------|----------|---------|---------|-------------------
File           | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
---------------|---------|----------|---------|---------|-------------------
File           | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
---------------|---------|----------|---------|---------|-------------------
File           | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
---------------|---------|----------|---------|---------|-------------------
---------------|---------|----------|---------|---------|-------------------
All files      |   91.15 |    81.92 |   92.85 |   90.37 |                   
 src           |   69.23 |       75 |       0 |   69.23 |                   
All files      |   91.15 |    81.92 |   92.85 |   90.37 |                   
 src           |   69.23 |       75 |       0 |   69.23 |                   
  app.js       |   69.23 |       75 |       0 |   69.23 | 10-11,17-18       
 src           |   69.23 |       75 |       0 |   69.23 |                   
  app.js       |   69.23 |       75 |       0 |   69.23 | 10-11,17-18       
  app.js       |   69.23 |       75 |       0 |   69.23 | 10-11,17-18       
 src/routes    |   94.73 |    85.71 |     100 |   94.73 |                   
 src/routes    |   94.73 |    85.71 |     100 |   94.73 |                   
  tasks.js     |   94.73 |    85.71 |     100 |   94.73 | 14,53,76          
  tasks.js     |   94.73 |    85.71 |     100 |   94.73 | 14,53,76          
 src/services  |     100 |    94.11 |     100 |     100 |                   
  ...ervice.js |     100 |    94.11 |     100 |     100 | 22                
 src/utils     |   73.91 |    73.52 |     100 |   73.91 |                   
  ...dators.js |   73.91 |    73.52 |     100 |   73.91 | 9,15,22,25,28,31  
---------------|---------|----------|---------|---------|-------------------

Test Suites: 2 passed, 2 total
Tests:       34 passed, 34 total
Snapshots:   0 total
Time:        3.274 s
Ran all test suites.