# 🚀 Pro-Grade Task Manager API

[![Node.js CI](https://github.com/rohit-ups/Take-Home-Assignment-The-Untested-API/actions/workflows/node.js.yml/badge.svg)](https://github.com/rohit-ups/Take-Home-Assignment-The-Untested-API/actions/workflows/node.js.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A production-ready, highly scalable, and secure Backend API for task management built with Node.js, Express, and MongoDB. This project demonstrates clean architecture, advanced filtering, robust error handling, and containerization.

## ✨ Key Features

-   **🔐 Secure Authentication**: JWT-based auth with registration, login, and protected routes.
-   **🏗️ Clean Architecture**: Separation of concerns into Controllers, Services, Models, and Middlewares.
-   **🔍 Advanced Querying**:
    -   Filtering (by status, assignee, priority)
    -   Pagination & Sorting
    -   Full-text search by title
-   **🛡️ Production-Ready Security**:
    -   Helmet for security headers
    -   CORS enabled
    -   Rate limiting to prevent DDoS
    -   Input validation with Zod
-   **📝 API Documentation**: Interactive Swagger/OpenAPI UI at `/api-docs`.
-   **🧪 Robust Testing**: High-coverage integration tests using Jest and MongoDB Memory Server.
-   **🐳 Containerization**: Fully Dockerized with Docker Compose for easy deployment.
-   **📊 Logging**: Centralized logging system using Winston and Morgan.

## 🛠️ Tech Stack

-   **Backend**: Node.js, Express
-   **Database**: MongoDB (Mongoose)
-   **Validation**: Zod
-   **Auth**: JWT, BcryptJS
-   **Docs**: Swagger UI, OAS 3.0
-   **Testing**: Jest, Supertest
-   **Security**: Helmet, Express-Rate-Limit
-   **DevOps**: Docker, GitHub Actions

## 🚦 Getting Started

### Prerequisites

-   Node.js (v18+)
-   MongoDB (Running locally or via Docker)
-   Docker (Optional)

### Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/rohit-ups/Take-Home-Assignment-The-Untested-API.git
    cd Take-Home-Assignment-The-Untested-API/task-api
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Setup Environment Variables**:
    Create a `.env` file in the root of `task-api`:
    ```env
    PORT=5000
    MONGODB_URI=mongodb://localhost:27017/task-manager
    JWT_SECRET=your_super_secret_jwt_key
    NODE_ENV=development
    ```

4.  **Run the application**:
    ```bash
    # Development mode
    npm run dev

    # Production mode
    npm start
    ```

### Running with Docker

```bash
docker-compose up --build
```

## 📖 API Documentation

Interactive documentation is available at `/api-docs` via Swagger.

### 🚀 API Examples (Quick Start)

#### 1. Register a User
```bash
curl -X POST http://localhost:5000/api/auth/register \
-H "Content-Type: application/json" \
-d '{"name": "John Doe", "email": "john@example.com", "password": "password123"}'
```

#### 2. Create a Task (Requires Token)
```bash
curl -X POST http://localhost:5000/api/tasks \
-H "Authorization: Bearer YOUR_TOKEN_HERE" \
-H "Content-Type: application/json" \
-d '{"title": "Complete Assignment", "priority": "high", "status": "todo"}'
```

#### 3. List Tasks with Filtering/Search
```bash
# Search for 'Assignment' in titles and filter by 'high' priority
curl "http://localhost:5000/api/tasks?search=Assignment&priority=high" \
-H "Authorization: Bearer YOUR_TOKEN_HERE"
```

#### 4. Assign a Task
```bash
curl -X POST http://localhost:5000/api/tasks/TASK_UUID/assign \
-H "Authorization: Bearer YOUR_TOKEN_HERE" \
-H "Content-Type: application/json" \
-d '{"assigneeId": "USER_ID_HERE"}'
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run coverage
```

## 📂 Project Structure

```text
src/
  ├── config/        # Environment and DB config
  ├── controllers/   # Request handlers
  ├── middleware/    # Auth, Validation, Error handlers
  ├── models/        # Mongoose schemas
  ├── routes/        # API route definitions
  ├── services/      # Business logic
  ├── utils/         # Helper functions and Logger
  ├── validators/    # Zod schemas
  ├── app.js         # Express app config
  └── index.js       # Server entry point
```

## ⚖️ Tradeoffs & Decisions

1.  **Repository Pattern vs. Direct Mongoose**: While I used a separate Service layer, I decided to interact with Mongoose models within the Services for this project to keep the code concise yet clean. In larger enterprise projects, a dedicated Repository layer would be added for further abstraction.
2.  **Zod over Joi**: Zod was chosen for its excellent TypeScript interoperability (if upgraded) and more modern API.
3.  **Soft Delete**: Implemented `isDeleted` flag on Tasks to preserve data integrity while allowing users to "remove" tasks.

## 👨‍💻 Author

Created with ❤️ by Antigravity (Senior AI Coding Assistant).
