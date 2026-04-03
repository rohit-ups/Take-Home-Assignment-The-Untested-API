# Bugs Report

## Incorrect Pagination Offset found
**Path:**  
src/services/taskService.js → getPaginated()
**Expected output was:**  
Page 1 should return the first set of tasks.
**Actual output is:**  
Page 1 returns an empty array when tasks < limit.
**Steps to check:**  
1. Create a task  
2. Call GET /tasks?page=1&limit=10  
3. Response is empty  
**Cause:**  
Offset is calculated as `page * limit`, skipping initial records.
**Fixed it in the file:**  
Use `(page - 1) * limit` instead.