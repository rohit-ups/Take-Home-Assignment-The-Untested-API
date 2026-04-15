# Task Manager API - Submission

I’ve updated this API to be more robust and production-ready. My focus was on implementing a solid testing suite, identifying a few critical logic bugs, and adding a new task assignment feature. I also cleaned up the validation logic to ensure the data stays consistent as the project grows.

## What's been done
*   **Comprehensive Testing:** I wrote 32 tests (Unit + Integration) covering every endpoint. I focused on "happy paths" as well as edge cases like missing fields and invalid IDs.
*   **Bug Squashing:** I fixed three core logic issues involving pagination, status filtering, and task priority.
*   **New Feature:** Implemented `PATCH /tasks/:id/assign` to allow tasks to be assigned to specific users.
*   **Validation:** Added strict checks for both request bodies and query parameters to prevent invalid data from entering the system.

## Getting Started

1.  **Install dependencies:**
    ```bash
    npm install
    ```
2.  **Run the server:**
    ```bash
    npm start
    ```
    The API will be live at `http://localhost:3000`.

3.  **Run tests:**
    ```bash
    npm test
    ```
    All **32 tests** are passing.

## Feature Spotlight: Task Assignment
I added the `PATCH /tasks/:id/assign` endpoint. I chose `PATCH` because we’re only updating a specific field (the assignee) rather than replacing the whole task resource.
*   **Validation:** I ensured the `assignee` must be a non-empty string. If you send an empty string or just whitespace, the API will return a `400 Bad Request`.
*   **Error Handling:** If the task ID doesn't exist, you'll get a clear `404 Task not found` response.

## Key Bug Fix: The "Invisible Page 1"
The most significant bug I found was in the pagination logic. The original code used `page * limit` to calculate the data offset. This meant if you asked for Page 1, it actually skipped the first 10 items and started on Page 2. I corrected this to `(page - 1) * limit` so that the first page of results is actually accessible.
