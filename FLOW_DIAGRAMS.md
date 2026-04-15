# Flow Diagrams - The Untested API

This document provides implementation and testing flows in Mermaid format.

---

## 1) Overall Development Workflow

```mermaid
flowchart TD
    A[Start Assignment] --> B[Read src files and API contracts]
    B --> C[Run app and baseline tests]
    C --> D[Write unit tests for taskService]
    D --> E[Write integration tests for routes]
    E --> F{Coverage >= 80%?}
    F -- No --> G[Add missing edge and branch tests]
    G --> F
    F -- Yes --> H[Document bugs in BUG_REPORT.md]
    H --> I[Pick one bug to fix]
    I --> J[Implement fix and update tests]
    J --> K[Implement PATCH /tasks/:id/assign]
    K --> L[Add endpoint tests]
    L --> M[Run full test suite and coverage]
    M --> N[Prepare final submission notes]
    N --> O[Submit branch/fork link]
```

---

## 2) Test Development Flow (TDD-leaning)

```mermaid
flowchart LR
    A[Select behavior to test] --> B[Write failing test]
    B --> C[Run tests and confirm failure]
    C --> D[Implement minimal code change]
    D --> E[Run tests]
    E --> F{Pass?}
    F -- No --> D
    F -- Yes --> G[Refactor if needed]
    G --> H[Run full suite + coverage]
```

---

## 3) API Request Handling Flow

```mermaid
flowchart TD
    A[HTTP Request] --> B[Route match in routes/tasks.js]
    B --> C[Validate params/body/query]
    C --> D{Valid?}
    D -- No --> E[Return 400 with error message]
    D -- Yes --> F[Call taskService function]
    F --> G{Resource found?}
    G -- No --> H[Return 404]
    G -- Yes --> I[Apply business logic/mutation]
    I --> J[Return success response JSON]
```

---

## 4) Bug Discovery and Fix Flow

```mermaid
flowchart TD
    A[Test fails or unexpected behavior] --> B[Capture reproduction steps]
    B --> C[Inspect service/route/validator code]
    C --> D[Identify root cause]
    D --> E[Write bug entry in BUG_REPORT.md]
    E --> F[Create or keep failing regression test]
    F --> G[Implement targeted fix]
    G --> H[Run focused tests]
    H --> I[Run full suite]
    I --> J{Regression free?}
    J -- No --> G
    J -- Yes --> K[Mark bug as fixed]
```

---

## 5) New Endpoint Flow: PATCH /tasks/:id/assign

```mermaid
flowchart TD
    A[PATCH /tasks/:id/assign] --> B[Extract id and assignee]
    B --> C[Validate assignee exists and is string]
    C --> D{Valid type/content?}
    D -- No --> E[Return 400]
    D -- Yes --> F[Trim assignee]
    F --> G{Trimmed assignee empty?}
    G -- Yes --> E
    G -- No --> H[Find task by id]
    H --> I{Task exists?}
    I -- No --> J[Return 404]
    I -- Yes --> K[Set task.assignee = value]
    K --> L[Return updated task 200]
```

---

## 6) Coverage Improvement Loop

```mermaid
flowchart LR
    A[Run npm run coverage] --> B[Review low coverage files]
    B --> C[Identify uncovered branches]
    C --> D[Add meaningful tests]
    D --> E[Re-run coverage]
    E --> F{Target reached?}
    F -- No --> B
    F -- Yes --> G[Finalize]
```

---

## 7) Submission Readiness Gate

```mermaid
flowchart TD
    A[All code changes done] --> B{All tests pass?}
    B -- No --> C[Fix failing tests]
    C --> B
    B -- Yes --> D{Coverage >= 80%?}
    D -- No --> E[Add targeted coverage tests]
    E --> D
    D -- Yes --> F{Bug report present?}
    F -- No --> G[Write BUG_REPORT.md]
    G --> F
    F -- Yes --> H{Assign endpoint + tests complete?}
    H -- No --> I[Finish endpoint implementation]
    I --> H
    H -- Yes --> J[Write final reflection notes]
    J --> K[Ready to submit]
```
