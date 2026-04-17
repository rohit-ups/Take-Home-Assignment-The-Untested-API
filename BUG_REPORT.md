# 🚀 Bug Submission & Resolution Report

This document outlines the critical logic errors identified and resolved during the development and testing phase of the Task Management API.

---

## 📊 Executive Summary

| Issue | Impact | Root Cause | Resolution |
| :--- | :--- | :--- | :--- |
| **Pagination Offset** | High | Zero-based index error | Adjusted offset calculation |
| **Status Filtering** | Medium | Non-strict string matching | Implemented strict equality |
| **Priority Mutation** | Medium | Hardcoded state reset | Preserved original object state |

---

## 🛠 Detailed Findings

### 1. Pagination Logic Error (Off-by-One)
* **Location:** `src/services/taskService.js`
* **The Problem:** The API was skipping the first page of results entirely. If a user requested Page 1 with a limit of 10, the system would start returning results from Index 10 instead of Index 0.
* **Expected Behavior:** Page 1 should return indices $0$ to $limit - 1$.
* **Actual Behavior:** Page 1 returned indices $limit$ to $(2 \times limit) - 1$.
* **The Fix:**
  * **Old:** `offset = page * limit`
  * **New:** `offset = (page - 1) * limit`
* **Discovery:** Identified via Unit Testing when `expect(results.length).toBe(totalCount)` failed on initial data fetch.

---

### 2. Loose Status Filtering
* **Location:** `src/services/taskService.js`
* **The Problem:** The filtering mechanism was too permissive, leading to "dirty" data sets. Searching for status `done` would also return tasks with custom statuses like `done-urgent`.
* **Expected Behavior:** Tasks should only be returned if they provide an exact match for the status string.
* **Actual Behavior:** Used `.includes()`, allowing partial string matches.
* **The Fix:** Replaced fuzzy matching logic with a strict equality operator (`===`).
* **Discovery:** Manual API validation using Postman showed tasks appearing in categories where they didn't belong.

---

### 3. State Mutation: Priority Reset
* **Location:** `src/services/taskService.js`
* **The Problem:** Updating a task's completion status triggered an unintended side effect: the task's priority (High/Low) was being reset to a default value.
* **Expected Behavior:** Only `status` and `completedAt` should change; all other metadata must persist.
* **Actual Behavior:** The `completeTask()` function contained a hardcoded `priority: 'medium'` assignment.
* **The Fix:** Removed the hardcoded line to ensure the task's existing priority remains intact during the update cycle.
* **Discovery:** Integration testing revealed that "High Priority" tasks were becoming "Medium" after being marked as done.

---

## 🧪 Validation Suite
All identified bugs were fixed and verified using the following workflow:

- [x] **Regression Testing:** Ensured new fixes didn't break existing CRUD functionality.
- [x] **Edge Case Validation:** Tested pagination with `page=1` and `limit=0`.
- [x] **Strict Mode Testing:** Verified that filtering no longer accepts partial strings.

> **Note:** These fixes ensure the service layer remains predictable and follows the principle of "Least Astonishment" for the end-user.