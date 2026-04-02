# Bug Report:

## Identified Issues & Fixes

### 1. Status Filtering Issue

* **Issue:** Task filtering used `.includes()`, leading to unintended partial matches (e.g., `"complete"` matching `"incomplete"`).
* **Resolution:** Replaced `.includes()` with strict equality (`===`) to ensure accurate filtering.

---

### 2. Pagination Calculation Error

* **Issue:** Incorrect offset calculation using `page * limit`, resulting in skipped records.
* **Resolution:** Updated logic to `(page - 1) * limit`.
* **Enhancement:** Added validation and default values for `page` and `limit`.

---

### 3. Sensitive Field Updates

* **Issue:** API allowed updates to protected fields such as `id`.
* **Resolution:** Restricted updates to a predefined whitelist of allowed fields.

---

### 4. Task Completion Bug

* **Issue:** Marking a task as completed unintentionally modified the `priority` field.
* **Resolution:** Ensured only `status` and `completedAt` fields are updated during task completion.

---

### 5. Duplicate Filtering Logic

* **Issue:** Filtering logic was redundantly implemented in both route and service layers.
* **Resolution:** Centralized filtering logic within the service layer to maintain consistency and reduce duplication.

---

### 6. Missing Query Validation

* **Issue:** Query parameters (`page`, `limit`) were not validated, leading to potential runtime errors.
* **Resolution:** Added validation to ensure numeric inputs and applied safe default values.

---

### 7. Missing 404 Handler

* **Issue:** API lacked a handler for unknown routes, resulting in unclear responses.
* **Resolution:** Implemented a global 404 handler to return standardized error messages.

---

## Summary of Improvements

* Enhanced filtering accuracy
* Corrected pagination behavior
* Strengthened data protection
* Eliminated unintended field mutations
* Reduced code duplication
* Improved input validation
* Added proper error handling for unknown routes

---

## Conclusion

All identified issues have been successfully resolved. These changes significantly improve the robustness, consistency, and maintainability of the Task Management Service, making it more reliable for production use and easier for future contributors to extend.

---
