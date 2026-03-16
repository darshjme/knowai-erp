# Know AI ERP - API Reference

Complete API documentation for the Know AI ERP backend. The API is built on Next.js 15 App Router and runs on port 3001.

---

## Table of Contents

- [Base URL](#base-url)
- [Authentication](#authentication)
- [Error Response Format](#error-response-format)
- [Role Abbreviations](#role-abbreviations)
- [API Endpoints](#api-endpoints)
  - [Auth](#auth)
  - [Dashboard](#dashboard)
  - [Projects](#projects)
  - [Tasks](#tasks)
  - [Team](#team)
  - [Payroll](#payroll)
  - [Leaves](#leaves)
  - [Expenses](#expenses)
  - [Hiring](#hiring)
  - [Careers (Public)](#careers-public)
  - [Clients](#clients)
  - [Leads](#leads)
  - [Invoices](#invoices)
  - [Chat](#chat)
  - [Email](#email)
  - [Email Dashboard](#email-dashboard)
  - [Calendar](#calendar)
  - [Files](#files)
  - [Docs](#docs)
  - [Time Tracking](#time-tracking)
  - [Goals](#goals)
  - [Spaces](#spaces)
  - [Canvas](#canvas)
  - [Contacts](#contacts)
  - [Notifications](#notifications)
  - [Favorites](#favorites)
  - [Settings](#settings)
  - [Preferences](#preferences)
  - [Analytics](#analytics)
  - [Reports](#reports)
  - [Audit Log](#audit-log)
  - [Complaints](#complaints)
  - [Credentials](#credentials)
  - [HR Dashboard](#hr-dashboard)
  - [Admin](#admin)
  - [API Keys](#api-keys)
  - [Webhooks](#webhooks)
  - [SOPs](#sops)
  - [Chatbot](#chatbot)

---

## Base URL

```
http://localhost:3001/api
```

In production, replace with your deployed domain.

---

## Authentication

All protected endpoints require a valid JWT token stored in an httpOnly cookie named `token`.

To authenticate, send a POST to `/api/auth/login`. The response sets the `token` cookie automatically.

For programmatic access (e.g., curl), pass the cookie with `-b cookies.txt`:

```bash
# Login and save cookie
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@knowai.com","password":"admin123"}' \
  -c cookies.txt

# Use cookie for subsequent requests
curl http://localhost:3001/api/projects -b cookies.txt
```

The middleware extracts the JWT and injects the following headers into requests for route handlers:
- `x-user-id` - The authenticated user's ID
- `x-user-email` - The authenticated user's email
- `x-user-role` - The authenticated user's role
- `x-workspace-id` - The authenticated user's workspace ID

---

## Error Response Format

All errors follow a consistent format:

```json
{
  "success": false,
  "error": "Error message description"
}
```

### Common HTTP Status Codes

| Code | Meaning                                      |
|------|----------------------------------------------|
| 200  | Success                                      |
| 201  | Created                                      |
| 400  | Bad Request (missing or invalid parameters)  |
| 401  | Unauthorized (not logged in or token expired)|
| 403  | Forbidden (insufficient role permissions)    |
| 404  | Not Found                                    |
| 409  | Conflict (duplicate resource)                |
| 429  | Too Many Requests (rate limited)             |
| 500  | Internal Server Error                        |

---

## Role Abbreviations

Used throughout this document to indicate which roles can access an endpoint.

| Abbreviation | Role               |
|--------------|--------------------|
| ALL          | All authenticated users |
| CEO          | CEO                |
| CTO          | CTO                |
| CFO          | CFO                |
| ADM          | ADMIN              |
| HR           | HR                 |
| ACC          | ACCOUNTING         |
| PO           | PRODUCT_OWNER      |
| BF           | BRAND_FACE         |
| CS           | CONTENT_STRATEGIST |
| BP           | BRAND_PARTNER      |
| SRD          | SR_DEVELOPER       |
| EDT          | EDITOR             |
| GD           | GRAPHIC_DESIGNER   |
| JRD          | JR_DEVELOPER       |
| GUY          | GUY                |
| OB           | OFFICE_BOY         |

---

## API Endpoints

---

### Auth

#### POST /api/auth/login

Log in and receive a session cookie.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | No                     |
| Rate Limited | Yes (5 attempts per 15 min per IP and email) |

**Request Body:**

```json
{
  "email": "admin@knowai.com",
  "password": "admin123"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "admin@knowai.com",
      "firstName": "Admin",
      "lastName": "User",
      "role": "ADMIN",
      "designation": "System Administrator",
      "department": "Operations",
      "phone": null,
      "avatar": null,
      "status": "ONLINE",
      "workspaceId": "uuid",
      "workspace": {
        "id": "uuid",
        "name": "Know AI",
        "type": "DEFAULT"
      },
      "preferences": null,
      "permissions": [
        "all:read", "all:write", "users:manage", "roles:assign",
        "workspace:manage", "settings:manage", "credentials:all",
        "audit:read", "hiring:manage", "payroll:read"
      ]
    }
  }
}
```

The response sets an httpOnly cookie named `token` with a 7-day expiry.

**Error Responses:**

| Code | Error                                        |
|------|----------------------------------------------|
| 400  | Email and password are required              |
| 401  | Invalid email or password                    |
| 429  | Too many login attempts. Please try again later. |

---

#### POST /api/auth/signup

Create a new user account. This is NOT a public signup. Only ADMIN, HR, or CEO can create users.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | CEO, ADM, HR             |

**Request Body:**

```json
{
  "email": "new.user@knowai.com",
  "password": "securepassword",
  "firstName": "New",
  "lastName": "User",
  "role": "JR_DEVELOPER",
  "designation": "Junior Developer",
  "department": "Engineering",
  "phone": "+91 9876543210",
  "salary": 45000,
  "reportingTo": "manager-user-id",
  "workspaceId": "workspace-uuid"
}
```

Only `email`, `password`, `firstName`, and `lastName` are required. Other fields are optional.

**Success Response (201):**

```json
{
  "success": true,
  "message": "User New User created with role JR_DEVELOPER",
  "data": {
    "user": {
      "id": "uuid",
      "email": "new.user@knowai.com",
      "firstName": "New",
      "lastName": "User",
      "role": "JR_DEVELOPER",
      "workspace": { "id": "uuid", "name": "Know AI", "type": "DEFAULT" }
    }
  }
}
```

**Error Responses:**

| Code | Error                                                    |
|------|----------------------------------------------------------|
| 400  | email, password, firstName, and lastName are required    |
| 400  | Invalid email format                                     |
| 400  | Password must be at least 8 characters                   |
| 400  | Invalid role                                             |
| 401  | Authentication required                                  |
| 403  | Access denied. Only ADMIN, HR, or CEO roles can create new users |
| 403  | Only the CEO can assign C-suite roles                    |
| 409  | Email already in use                                     |

---

#### POST /api/auth/logout

Log out and clear the session cookie. Sets user status to OFFLINE.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | ALL                      |

**Request Body:** None

**Success Response (200):**

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### Dashboard

#### GET /api/dashboard

Retrieve personalized dashboard data for the logged-in user. Response varies by role.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | ALL                      |

**Query Parameters:** None

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "firstName": "Admin",
      "lastName": "User",
      "email": "admin@knowai.com",
      "role": "ADMIN",
      "department": "Operations",
      "avatar": null
    },
    "greeting": "Good Morning",
    "todayDate": "Monday, March 17, 2026",
    "motivationalQuote": "The secret of getting ahead is getting started. — Mark Twain",
    "todayTasks": [],
    "upcomingTasks": [],
    "backlogTasks": [],
    "inProgressTasks": [],
    "inReviewTasks": [],
    "recentlyCompleted": [],
    "totalTasksCompleted": 5,
    "totalTasksAssigned": 12,
    "taskCompletionRate": 41.7,
    "unreadNotifications": 3,
    "recentNotifications": [],
    "streakDays": 2,
    "kpiMetrics": {
      "tasksCompletedThisWeek": 3,
      "tasksCompletedLastWeek": 2,
      "avgCompletionTimeDays": 4.2,
      "onTimeCompletionRate": 80.0,
      "overdueCount": 1,
      "weeklyTrend": [
        { "day": "Mon", "completed": 1 },
        { "day": "Tue", "completed": 2 }
      ]
    },
    "upcomingEvents": [],
    "activityFeed": [],
    "overdueTasks": [],
    "todayLeaves": [],
    "taskPipeline": {
      "todo": 4,
      "inProgress": 3,
      "inReview": 2,
      "completed": 3
    },
    "teamStats": {
      "totalMembers": 16,
      "activeProjects": 2,
      "totalTasks": 12,
      "completedTasks": 2,
      "revenue": 0,
      "expenses": 0
    },
    "revenueVsExpenses": [],
    "taskStatusDistribution": [],
    "teamPerformance": []
  }
}
```

Admin/Manager roles include `teamStats`, `revenueVsExpenses`, `taskStatusDistribution`, and `teamPerformance`. HR roles include `pendingLeaves` and `headcount`.

---

### Projects

#### GET /api/projects

List projects with role-based scoping and pagination.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | CEO, CTO, ADM, PO (all); CFO, HR (all); SRD (own+assigned); Task-based roles (projects with their tasks); GUY, OB (no access) |

**Query Parameters:**

| Param      | Type   | Description                              |
|------------|--------|------------------------------------------|
| status     | string | Filter: PLANNING, ACTIVE, IN_REVIEW, COMPLETED, ON_HOLD |
| managerId  | string | Filter by project manager ID             |
| search     | string | Search by project name                   |
| department | string | Filter by manager's department           |
| page       | number | Page number (default: 1)                 |
| pageSize   | number | Results per page (default: 20)           |
| detail     | string | Project ID to get single project detail  |

**Success Response (200) - List:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Know AI ERP Platform",
      "description": "Internal ERP system...",
      "status": "ACTIVE",
      "progress": 45,
      "dueDate": "2026-06-30T00:00:00.000Z",
      "managerId": "uuid",
      "manager": {
        "id": "uuid",
        "firstName": "Ravi",
        "lastName": "Kumar",
        "email": "ravi@knowai.com",
        "avatar": null,
        "department": "Executive"
      },
      "tasks": [
        {
          "id": "uuid",
          "status": "IN_PROGRESS",
          "priority": "HIGH",
          "dueDate": "2026-04-30T00:00:00.000Z",
          "assignee": { "id": "uuid", "firstName": "Rohit", "lastName": "Gupta", "avatar": null }
        }
      ],
      "_count": { "tasks": 6 }
    }
  ],
  "total": 3,
  "page": 1,
  "pageSize": 20,
  "totalPages": 1,
  "departments": ["Content", "Design", "Engineering", "Executive", "Product"]
}
```

**Success Response (200) - Detail (with ?detail=uuid):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Know AI ERP Platform",
    "tasks": [
      {
        "id": "uuid",
        "title": "Set up PostgreSQL database schema",
        "status": "COMPLETED",
        "priority": "HIGH",
        "assignee": { "id": "uuid", "firstName": "Rohit", "lastName": "Gupta" },
        "blockedBy": [],
        "blocking": []
      }
    ],
    "teamMembers": [
      { "id": "uuid", "firstName": "Ravi", "lastName": "Kumar", "role": "CTO" }
    ]
  }
}
```

---

#### POST /api/projects

Create a new project.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | CEO, CTO, ADM, PO       |

**Request Body:**

```json
{
  "name": "New Project",
  "description": "Project description",
  "status": "PLANNING",
  "dueDate": "2026-12-31"
}
```

Only `name` is required.

**Success Response (201):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "New Project",
    "description": "Project description",
    "status": "PLANNING",
    "progress": 0,
    "dueDate": "2026-12-31T00:00:00.000Z",
    "managerId": "uuid",
    "manager": { "id": "uuid", "firstName": "Admin", "lastName": "User" },
    "tasks": [],
    "_count": { "tasks": 0 }
  }
}
```

---

#### PATCH /api/projects

Update a project.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | ADM, or project manager  |

**Request Body:**

```json
{
  "id": "project-uuid",
  "name": "Updated Name",
  "description": "Updated description",
  "status": "ACTIVE",
  "dueDate": "2026-12-31"
}
```

`id` is required. All other fields are optional.

**Success Response (200):** Returns the updated project object.

---

#### DELETE /api/projects?id=uuid

Delete a project and all its tasks (cascade).

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | ADM, or project manager  |

**Success Response (200):**

```json
{
  "success": true,
  "message": "Project deleted"
}
```

---

### Tasks

#### GET /api/tasks

List tasks with role-based scoping, filters, sorting, and pagination.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | ALL (scoped by role)     |

**Query Parameters:**

| Param       | Type   | Description                                          |
|-------------|--------|------------------------------------------------------|
| status      | string | TODO, IN_PROGRESS, IN_REVIEW, COMPLETED              |
| priority    | string | LOW, MEDIUM, HIGH, URGENT                            |
| assigneeId  | string | Filter by assignee user ID                           |
| projectId   | string | Filter by project ID                                 |
| search      | string | Search title and description                         |
| view        | string | my, team, blocked, calendar                          |
| sortBy      | string | title, priority, dueDate, createdAt, status          |
| sortDir     | string | asc, desc (default: desc)                            |
| dueDateFrom | string | ISO date (inclusive)                                 |
| dueDateTo   | string | ISO date (inclusive)                                 |
| page        | number | Page number (default: 1)                             |
| pageSize    | number | Results per page (default: 50)                       |

**Success Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Set up PostgreSQL database schema",
      "description": null,
      "status": "COMPLETED",
      "priority": "HIGH",
      "assigneeId": "uuid",
      "projectId": "uuid",
      "dueDate": "2026-04-30T00:00:00.000Z",
      "createdById": "uuid",
      "assignee": { "id": "uuid", "firstName": "Rohit", "lastName": "Gupta", "role": "SR_DEVELOPER" },
      "project": { "id": "uuid", "name": "Know AI ERP Platform" },
      "createdBy": { "id": "uuid", "firstName": "Ravi", "lastName": "Kumar" },
      "blockedBy": [],
      "blocking": []
    }
  ],
  "total": 12,
  "page": 1,
  "pageSize": 50,
  "totalPages": 1,
  "hasMore": false,
  "currentUserId": "uuid",
  "currentUserRole": "ADMIN"
}
```

---

#### POST /api/tasks

Create a task, add/remove dependencies, or perform bulk operations.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | ALL (scoped by role)     |

**Create Task - Request Body:**

```json
{
  "title": "Implement login page",
  "description": "Build the login form with email/password",
  "projectId": "project-uuid",
  "assigneeId": "user-uuid",
  "priority": "HIGH",
  "status": "TODO",
  "dueDate": "2026-04-15",
  "dependsOn": ["blocking-task-uuid-1", "blocking-task-uuid-2"]
}
```

`title` and `projectId` are required.

**Add Dependency - Request Body:**

```json
{
  "action": "addDependency",
  "blockedTaskId": "task-uuid",
  "blockingTaskId": "task-uuid"
}
```

**Remove Dependency - Request Body:**

```json
{
  "action": "removeDependency",
  "blockedTaskId": "task-uuid",
  "blockingTaskId": "task-uuid"
}
```

**Bulk Update - Request Body:**

```json
{
  "action": "bulkUpdate",
  "taskIds": ["uuid1", "uuid2"],
  "status": "IN_PROGRESS",
  "assigneeId": "user-uuid",
  "priority": "HIGH"
}
```

**Bulk Delete - Request Body:**

```json
{
  "action": "bulkDelete",
  "taskIds": ["uuid1", "uuid2"]
}
```

---

#### PATCH /api/tasks

Update a single task.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | ALL (scoped)             |

**Request Body:**

```json
{
  "id": "task-uuid",
  "status": "IN_PROGRESS",
  "title": "Updated title",
  "description": "Updated desc",
  "priority": "URGENT",
  "assigneeId": "user-uuid",
  "dueDate": "2026-05-01"
}
```

`id` is required. All other fields optional.

---

#### DELETE /api/tasks?id=uuid

Delete a task.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | ALL (scoped)             |

---

### Team

#### GET /api/team

List team members or get a single member's detail.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | ALL (data detail varies) |

**Query Parameters:**

| Param      | Type   | Description                     |
|------------|--------|---------------------------------|
| id         | string | Single member detail by user ID |
| role       | string | Filter by role                  |
| status     | string | Filter by ONLINE/OFFLINE/AWAY   |
| search     | string | Search by name, email, dept     |
| department | string | Filter by department            |

**Success Response (200) - List (full access):**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "email": "rohit@knowai.com",
      "firstName": "Rohit",
      "lastName": "Gupta",
      "role": "SR_DEVELOPER",
      "avatar": null,
      "status": "OFFLINE",
      "department": "Engineering",
      "phone": null,
      "createdAt": "2026-01-15T00:00:00.000Z",
      "_count": { "tasks": 3, "projects": 1 }
    }
  ],
  "total": 16,
  "departments": ["Content", "Design", "Engineering", "Executive", "Finance", "Human Resources", "Marketing", "Operations", "Product"],
  "userRole": "ADMIN",
  "userDepartment": "Operations"
}
```

Non-privileged roles receive a limited response (name, role, department only).

---

#### POST /api/team

Onboard a new team member.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | CEO, CTO, ADM, HR       |

**Request Body:**

```json
{
  "email": "new.member@knowai.com",
  "password": "securepassword",
  "firstName": "Jane",
  "lastName": "Doe",
  "role": "GRAPHIC_DESIGNER",
  "department": "Design",
  "phone": "+91 9876543210"
}
```

**Error Responses:**

| Code | Error                                                   |
|------|---------------------------------------------------------|
| 403  | Only CEO, CTO, Admin, or HR can add team members       |
| 403  | You don't have permission to add members with this role |
| 409  | Email is already taken                                  |

---

#### PATCH /api/team

Update a team member's role, status, department, or phone.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | CEO, CTO, ADM, HR       |

**Request Body:**

```json
{
  "id": "user-uuid",
  "role": "SR_DEVELOPER",
  "status": "ONLINE",
  "department": "Engineering",
  "phone": "+91 9876543210"
}
```

---

#### DELETE /api/team?id=uuid

Remove a team member.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | CEO, CTO, ADM, HR       |

---

### Payroll

#### GET /api/payroll

List payroll records. Privileged roles see all; others see only their own.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | CEO, CFO, ADM, ACC, HR (all); Others (own only) |

**Query Parameters:** month, year, employeeId, status

---

#### POST /api/payroll

Create a payroll record or record a payment.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | CEO, CFO, ADM, ACC, HR (create); CEO, CFO, ADM, ACC (process payment) |

**Create Payroll - Request Body:**

```json
{
  "employeeId": "user-uuid",
  "month": 3,
  "year": 2026,
  "basicPay": 80000,
  "hra": 20000,
  "transport": 5000,
  "bonus": 0,
  "deductions": 5000,
  "workingDays": 22,
  "presentDays": 20,
  "absentDays": 1,
  "leaveDays": 1,
  "notes": "March 2026 salary"
}
```

**Record Payment - Request Body:**

```json
{
  "action": "recordPayment",
  "payrollId": "payroll-uuid",
  "amount": 100000,
  "mode": "BANK_TRANSFER",
  "bankRef": "UTR123456789",
  "purpose": "salary",
  "remarks": "March salary payment"
}
```

Payment modes: CASH, BANK_TRANSFER, UPI, CHEQUE

---

#### PATCH /api/payroll

Update a payroll record.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | CEO, CFO, ADM, ACC, HR  |

---

#### DELETE /api/payroll?id=uuid

Delete a payroll record.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | CEO, CFO, ADM, ACC      |

---

### Leaves

#### GET /api/leaves

List leave requests.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | CEO, ADM, HR (all); Others (own only) |

**Query Parameters:** status, employeeId, month, year

---

#### POST /api/leaves

Request a leave.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | ALL                      |

**Request Body:**

```json
{
  "type": "PAID",
  "startDate": "2026-03-20",
  "endDate": "2026-03-21",
  "reason": "Family event"
}
```

Leave types: PAID, UNPAID, SICK, HALF_DAY, WORK_FROM_HOME

---

#### PATCH /api/leaves

Approve, reject, or cancel a leave request.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | CEO, ADM, HR (approve/reject); Requester (cancel own) |

**Request Body:**

```json
{
  "id": "leave-uuid",
  "status": "APPROVED",
  "approverNote": "Approved. Enjoy your time off."
}
```

---

#### DELETE /api/leaves?id=uuid

Delete a leave request (only PENDING leaves).

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | Requester or CEO, ADM, HR |

---

### Expenses

#### GET /api/expenses

List expenses.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | CEO, CFO, ADM, ACC (all); HR, PO (team); Others (own only) |

**Query Parameters:** status, category, submitterId

---

#### POST /api/expenses

Submit an expense.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | ALL                      |

**Request Body:**

```json
{
  "title": "Client lunch",
  "description": "Business lunch with TechVista",
  "amount": 2500,
  "currency": "INR",
  "category": "FOOD",
  "receipt": "https://example.com/receipt.jpg",
  "expenseDate": "2026-03-15"
}
```

Categories: TRAVEL, FOOD, EQUIPMENT, SOFTWARE, OFFICE, SHOOT, MARKETING, FUEL, MAINTENANCE, OTHER

---

#### PATCH /api/expenses

Update an expense or change its status (approve/reject/reimburse).

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | Submitter (edit draft); CEO, CFO, ADM (approve all); ACC (approve); HR, PO (approve team) |

**Request Body:**

```json
{
  "id": "expense-uuid",
  "status": "APPROVED"
}
```

---

#### DELETE /api/expenses?id=uuid

Delete an expense (DRAFT or SUBMITTED only).

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | Submitter or CEO, CFO, ADM |

---

### Hiring

#### GET /api/hiring

List job postings or get a single job with candidates.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | CEO, CTO, ADM, HR, PO (full); SRD (view + own interviews) |

**Query Parameters:** jobId (for single job detail)

---

#### POST /api/hiring

Create a job posting, add a candidate, schedule an interview, or advance a candidate stage.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | CEO, CTO, ADM, HR, PO   |

**Create Job - Request Body:**

```json
{
  "action": "createJob",
  "title": "Senior React Developer",
  "department": "Engineering",
  "description": "We are looking for...",
  "requirements": "[\"React\", \"TypeScript\", \"3+ years\"]",
  "salaryMin": 100000,
  "salaryMax": 150000,
  "location": "Mumbai, India",
  "type": "Full-time",
  "status": "OPEN"
}
```

**Add Candidate - Request Body:**

```json
{
  "action": "addCandidate",
  "jobId": "job-uuid",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+91 9876543210",
  "resumeUrl": "https://example.com/resume.pdf",
  "linkedinUrl": "https://linkedin.com/in/johndoe",
  "coverLetter": "I am excited to apply..."
}
```

**Schedule Interview - Request Body:**

```json
{
  "action": "scheduleInterview",
  "candidateId": "candidate-uuid",
  "roundNumber": 1,
  "roundName": "Technical Screen",
  "interviewerId": "user-uuid",
  "scheduledAt": "2026-03-25T10:00:00Z"
}
```

---

#### PATCH /api/hiring

Update a job posting or interview result.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | CEO, CTO, ADM, HR, PO   |

---

#### DELETE /api/hiring?jobId=uuid

Delete a job posting (cascades to candidates and interviews).

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | CEO, CTO, ADM, HR, PO   |

---

### Careers (Public)

#### GET /api/careers

List all open job postings. Public endpoint for the careers page.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | No                     |
| Role Access | Public                   |

**Success Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Senior React Developer",
      "department": "Engineering",
      "description": "We are looking for...",
      "location": "Mumbai, India",
      "type": "Full-time",
      "salaryMin": 100000,
      "salaryMax": 150000,
      "currency": "INR",
      "createdAt": "2026-03-01T00:00:00.000Z"
    }
  ]
}
```

---

#### POST /api/careers

Submit a public job application.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | No                     |
| Role Access | Public                   |

**Request Body:**

```json
{
  "jobId": "job-uuid",
  "name": "Jane Applicant",
  "email": "jane@example.com",
  "phone": "+91 9876543210",
  "resumeUrl": "https://example.com/resume.pdf",
  "linkedinUrl": "https://linkedin.com/in/jane",
  "portfolioUrl": "https://jane.dev",
  "coverLetter": "I am excited to apply..."
}
```

---

### Clients

#### GET /api/clients

List clients.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | CEO, CTO, ADM, PO, BF, BP (varies) |

**Query Parameters:** search, industry

---

#### POST /api/clients

Create a client.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | CEO, CTO, ADM, PO, BF, BP |

**Request Body:**

```json
{
  "name": "Acme Corp",
  "email": "contact@acme.com",
  "phone": "+91 9876543210",
  "company": "Acme Corporation",
  "address": "123 Main St, Mumbai",
  "website": "https://acme.com",
  "industry": "Technology",
  "notes": "Enterprise client"
}
```

---

#### PATCH /api/clients

Update a client.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | CEO, CTO, ADM, PO, BF, BP |

---

#### DELETE /api/clients?id=uuid

Delete a client.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | CEO, CTO, ADM            |

---

### Leads

#### GET /api/leads

List leads.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | CEO, CTO, ADM, PO, BF, BP (varies) |

**Query Parameters:** status, assigneeId, clientId, search

---

#### POST /api/leads

Create a lead.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | CEO, CTO, ADM, PO, BF, BP |

**Request Body:**

```json
{
  "title": "New Website Project",
  "value": 500000,
  "status": "NEW",
  "source": "LinkedIn",
  "clientId": "client-uuid",
  "assigneeId": "user-uuid",
  "notes": "Interested in full redesign",
  "nextFollowUp": "2026-03-25"
}
```

Lead statuses: NEW, CONTACTED, QUALIFIED, PROPOSAL, NEGOTIATION, WON, LOST

---

#### PATCH /api/leads

Update a lead.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | Assignee or CEO, CTO, ADM, PO |

---

#### DELETE /api/leads?id=uuid

Delete a lead.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | CEO, CTO, ADM            |

---

### Invoices

#### GET /api/invoices

List invoices.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | CEO, CFO, ADM, ACC, PO (view only for PO) |

**Query Parameters:** status, search, clientId

---

#### POST /api/invoices

Create an invoice.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | CEO, CFO, ADM, ACC       |

**Request Body:**

```json
{
  "clientName": "TechVista Solutions",
  "clientEmail": "contact@techvista.in",
  "clientPhone": "+91 9876543210",
  "clientAddress": "Mumbai, India",
  "clientId": "client-uuid",
  "items": "[{\"description\":\"Web Development\",\"quantity\":1,\"rate\":100000,\"amount\":100000}]",
  "subtotal": 100000,
  "tax": 18000,
  "discount": 0,
  "total": 118000,
  "currency": "INR",
  "dueDate": "2026-04-15",
  "notes": "Payment due within 30 days"
}
```

---

#### PATCH /api/invoices

Update an invoice.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | CEO, CFO, ADM, ACC       |

**Request Body:**

```json
{
  "id": "invoice-uuid",
  "status": "PAID",
  "paidOn": "2026-03-20"
}
```

Invoice statuses: DRAFT, SENT, PAID, OVERDUE, CANCELLED

---

#### DELETE /api/invoices?id=uuid

Delete an invoice.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | CEO, CFO, ADM, ACC       |

---

### Chat

#### GET /api/chat

List chat rooms, get messages for a room, or search.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | ALL                      |

**Query Parameters:** roomId (get messages), action (search, etc.)

---

#### POST /api/chat

Create a chat room or send a message.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | ALL                      |

**Create Room - Request Body:**

```json
{
  "action": "createRoom",
  "name": "Project Alpha",
  "type": "group",
  "memberIds": ["uuid1", "uuid2"]
}
```

Room types: dm, group, project, department

**Send Message - Request Body:**

```json
{
  "action": "sendMessage",
  "roomId": "room-uuid",
  "content": "Hello team!",
  "type": "text",
  "replyToId": "message-uuid"
}
```

Message types: text, file, system, ai

---

#### PATCH /api/chat

Update a chat room (rename, etc.).

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | Room creator or ADM      |

---

#### DELETE /api/chat?roomId=uuid

Delete a chat room.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | Room creator or ADM      |

---

### Email

#### GET /api/email

Get email history, analytics, or template list.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | ALL (history); Executives (analytics) |

**Query Parameters:**

| Param    | Type   | Description                               |
|----------|--------|-------------------------------------------|
| action   | string | history (default), analytics, templates   |
| folder   | string | sent (default), inbox                     |
| type     | string | Filter by: CUSTOM, INVOICE, NEWSLETTER    |
| page     | number | Page number                               |
| pageSize | number | Results per page (default: 50, max: 100)  |

---

#### POST /api/email

Send emails via different actions.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | ALL (custom); Executives (invoice, newsletter); HR/Managers (templates) |

**Send Custom Email:**

```json
{
  "action": "sendCustom",
  "to": "recipient@example.com",
  "subject": "Hello",
  "body": "<p>Email body in HTML</p>"
}
```

**Send Invoice:**

```json
{
  "action": "sendInvoice",
  "invoiceId": "invoice-uuid"
}
```

**Send Newsletter:**

```json
{
  "action": "sendNewsletter",
  "subject": "Monthly Update",
  "body": "<p>Newsletter content</p>"
}
```

**Send from Template:**

```json
{
  "action": "sendTemplate",
  "to": "employee@knowai.com",
  "templateName": "welcome",
  "templateParams": {
    "recipientName": "Jane Doe",
    "loginUrl": "https://erp.knowai.com"
  }
}
```

Available templates: welcome, invoice, leave_approval, task_assigned, payroll_processed

---

### Email Dashboard

#### GET /api/email-dashboard

Get email analytics and statistics.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | CEO, CTO, CFO, ADM      |

---

#### POST /api/email-dashboard

Perform email dashboard actions.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | CEO, CTO, CFO, ADM      |

---

### Calendar

#### GET /api/calendar

List calendar events.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | ALL                      |

**Query Parameters:** month, year, calendarType

---

#### POST /api/calendar

Create a calendar event.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | ALL                      |

**Request Body:**

```json
{
  "title": "Team Standup",
  "description": "Daily standup meeting",
  "startDate": "2026-03-20T09:00:00Z",
  "endDate": "2026-03-20T09:30:00Z",
  "color": "#3b82f6",
  "calendarType": "meeting"
}
```

---

#### PATCH /api/calendar

Update a calendar event.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | Event creator or ADM     |

---

#### DELETE /api/calendar?id=uuid

Delete a calendar event.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | Event creator or ADM     |

---

### Files

#### GET /api/files

List files and folders.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | ALL (varies by role)     |

**Query Parameters:** folderId, search, fileType

---

#### POST /api/files

Create a file entry or folder.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | ALL (varies)             |

**Request Body:**

```json
{
  "name": "Project Docs",
  "isFolder": true,
  "folderId": "parent-folder-uuid"
}
```

---

#### PATCH /api/files

Rename or move a file.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | Uploader or ADM          |

---

#### DELETE /api/files?id=uuid

Delete a file or folder.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | Uploader or ADM          |

---

### Docs

#### GET /api/docs

List docs/wiki pages.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | ALL (varies)             |

**Query Parameters:** projectId, parentId, search

---

#### POST /api/docs

Create a doc.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | Roles with docs access   |

**Request Body:**

```json
{
  "title": "API Documentation",
  "content": "# API Docs\n\nContent here...",
  "icon": "book",
  "parentId": "parent-doc-uuid",
  "projectId": "project-uuid",
  "isPublished": false
}
```

---

#### PATCH /api/docs

Update a doc.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | Doc creator or ADM       |

---

#### DELETE /api/docs?id=uuid

Delete a doc.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | Doc creator or ADM       |

---

### Time Tracking

#### GET /api/time-tracking

List time entries.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | ALL (own entries); Managers see team entries |

**Query Parameters:** projectId, taskId, startDate, endDate, billable

---

#### POST /api/time-tracking

Create a time entry.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | Roles with time tracking access |

**Request Body:**

```json
{
  "taskId": "task-uuid",
  "projectId": "project-uuid",
  "description": "Working on login feature",
  "startTime": "2026-03-17T09:00:00Z",
  "endTime": "2026-03-17T12:30:00Z",
  "duration": 210,
  "billable": true
}
```

---

#### PATCH /api/time-tracking

Update a time entry.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | Entry creator            |

---

#### DELETE /api/time-tracking?id=uuid

Delete a time entry.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | Entry creator or ADM     |

---

### Goals

#### GET /api/goals

List goals/OKRs.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | Roles with goals access  |

**Query Parameters:** parentId, status, ownerId, type

---

#### POST /api/goals

Create a goal.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | Roles with goals access  |

**Request Body:**

```json
{
  "title": "Increase Revenue by 30%",
  "description": "Q2 2026 revenue target",
  "type": "OBJECTIVE",
  "parentId": null,
  "startDate": "2026-04-01",
  "endDate": "2026-06-30",
  "metricType": "PERCENTAGE",
  "metricTarget": 30
}
```

Goal types: OBJECTIVE, KEY_RESULT, TARGET
Status values: ON_TRACK, AT_RISK, BEHIND, COMPLETED

---

#### PATCH /api/goals

Update a goal's progress, status, or details.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | Goal owner or ADM        |

**Request Body:**

```json
{
  "id": "goal-uuid",
  "progress": 65,
  "status": "ON_TRACK",
  "metricCurrent": 19.5
}
```

---

#### DELETE /api/goals?id=uuid

Delete a goal.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | Goal owner or ADM        |

---

### Spaces

#### GET /api/spaces

List spaces or get a single space with projects.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | Roles with project access |

**Query Parameters:** id (single space detail)

---

#### POST /api/spaces

Create a space.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | CEO, CTO, ADM, PO       |

**Request Body:**

```json
{
  "name": "Engineering",
  "description": "All engineering projects",
  "color": "#3b82f6",
  "icon": "code"
}
```

---

#### PATCH /api/spaces

Update a space or add/remove projects.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | Space creator or ADM     |

---

#### DELETE /api/spaces?id=uuid

Delete a space (projects are unlinked, not deleted).

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | Space creator or ADM     |

---

### Canvas

#### GET /api/canvas

List canvases or get a single canvas.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | Roles with canvas access |

**Query Parameters:** id, projectId

---

#### POST /api/canvas

Create a canvas.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | Roles with canvas access |

**Request Body:**

```json
{
  "title": "Architecture Diagram",
  "projectId": "project-uuid",
  "data": "{}"
}
```

---

#### PATCH /api/canvas

Update a canvas (title or data).

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | Canvas creator or ADM    |

---

#### DELETE /api/canvas?id=uuid

Delete a canvas.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | Canvas creator or ADM    |

---

### Contacts

#### GET /api/contacts

List contacts.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | ALL                      |

**Query Parameters:** search, label

Contact labels: CLIENT, PARTNER, VENDOR, INVESTOR, LEAD

---

#### POST /api/contacts

Create a contact.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | ALL                      |

**Request Body:**

```json
{
  "name": "John Smith",
  "email": "john@example.com",
  "phone": "+91 9876543210",
  "title": "CTO",
  "company": "Acme Corp",
  "label": "CLIENT"
}
```

---

#### PATCH /api/contacts

Update a contact.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | Contact creator or ADM   |

---

#### DELETE /api/contacts?id=uuid

Delete a contact.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | Contact creator or ADM   |

---

### Notifications

#### GET /api/notifications

List notifications for the current user.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | ALL                      |

**Query Parameters:** read (true/false), page, pageSize

**Success Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "type": "TASK_ASSIGNED",
      "title": "New Task Assigned",
      "message": "Admin User assigned you: Build dashboard UI",
      "read": false,
      "linkUrl": "/tasks",
      "createdAt": "2026-03-17T10:00:00.000Z"
    }
  ],
  "total": 5,
  "unreadCount": 3
}
```

---

#### PATCH /api/notifications

Mark notifications as read.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | ALL                      |

**Request Body:**

```json
{
  "action": "markRead",
  "ids": ["uuid1", "uuid2"]
}
```

Or mark all as read:

```json
{
  "action": "markAllRead"
}
```

---

#### DELETE /api/notifications?id=uuid

Delete a notification.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | ALL (own notifications)  |

---

### Favorites

#### GET /api/favorites

List the current user's favorites.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | ALL                      |

---

#### POST /api/favorites

Add a favorite.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | ALL                      |

**Request Body:**

```json
{
  "entityType": "project",
  "entityId": "project-uuid",
  "entityName": "Know AI ERP Platform"
}
```

Entity types: project, task, client, contact, canvas, goal

---

#### PATCH /api/favorites

Reorder favorites.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | ALL                      |

---

#### DELETE /api/favorites?id=uuid

Remove a favorite.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | ALL                      |

---

### Settings

#### GET /api/settings

Get the current user's profile and system settings.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | ALL                      |

---

#### PATCH /api/settings

Update profile settings (name, phone, avatar, password).

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | ALL                      |

**Request Body:**

```json
{
  "firstName": "Admin",
  "lastName": "User",
  "phone": "+91 9876543210",
  "avatar": "https://example.com/avatar.jpg"
}
```

---

### Preferences

#### GET /api/settings/preferences

Get the current user's UI preferences.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | ALL                      |

---

#### POST /api/settings/preferences

Create initial preferences for a user.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | ALL                      |

**Request Body:**

```json
{
  "theme": "dark",
  "accentColor": "#10b981",
  "sidebarStyle": "collapsed",
  "compactMode": true,
  "fontSize": "small",
  "language": "en",
  "dateFormat": "DD/MM/YYYY",
  "currency": "INR",
  "timezone": "Asia/Kolkata",
  "emailNotifications": true,
  "pushNotifications": true,
  "weeklyDigest": true,
  "desktopNotifs": true,
  "soundEnabled": true,
  "dataScope": "team"
}
```

---

#### PATCH /api/settings/preferences

Update existing preferences.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | ALL                      |

Same body as POST, with only the fields you want to update.

---

### Analytics

#### GET /api/analytics

Get workspace-wide analytics data.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | CEO, CTO, ADM, CFO, HR, PO, BF, CS, SRD (varies by role scope) |

---

### Reports

#### GET /api/reports

Generate reports (financial, team, project).

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | CEO, CTO, CFO, ADM, HR, ACC, PO, BF |

**Query Parameters:** type (financial, team, project, time), dateFrom, dateTo

---

### Audit Log

#### GET /api/audit

List audit log entries.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | CEO, CTO, CFO, ADM      |

**Query Parameters:**

| Param   | Type   | Description                                      |
|---------|--------|--------------------------------------------------|
| action  | string | CREATE, UPDATE, DELETE, LOGIN, LOGOUT, EXPORT, IMPORT |
| entity  | string | USER, PROJECT, TASK, FILE, etc.                  |
| userId  | string | Filter by user ID                                |
| search  | string | Search entity name or description                |
| page    | number | Page number                                      |
| pageSize| number | Results per page                                 |

**Success Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "action": "CREATE",
      "entity": "PROJECT",
      "entityId": "uuid",
      "entityName": "Know AI ERP Platform",
      "description": "Created project",
      "userId": "uuid",
      "userName": "Ravi Kumar",
      "createdAt": "2026-03-17T10:00:00.000Z"
    }
  ],
  "total": 50,
  "page": 1,
  "pageSize": 20,
  "totalPages": 3
}
```

---

#### POST /api/audit

Create an audit log entry (typically called internally by other APIs).

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | ALL (internal use)       |

**Request Body:**

```json
{
  "action": "CREATE",
  "entity": "PROJECT",
  "entityId": "uuid",
  "entityName": "New Project",
  "description": "Created a new project"
}
```

---

### Complaints

#### GET /api/complaints

List complaints.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | CEO, CTO, ADM, HR (all); Others (own complaints only) |

**Query Parameters:** status, category

---

#### POST /api/complaints

File a complaint or perform complaint actions.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | ALL (file); CEO, CTO, ADM, HR (manage) |

**File Complaint - Request Body:**

```json
{
  "category": "MISCONDUCT",
  "subject": "Unprofessional behavior",
  "description": "Detailed description of the incident...",
  "againstId": "user-uuid",
  "isAnonymous": false
}
```

Categories: HARASSMENT, DISCRIMINATION, MISCONDUCT, POLICY_VIOLATION, PERFORMANCE, LEAVE_DISPUTE, SALARY_DISPUTE, WORKPLACE_SAFETY, OTHER

---

#### PATCH /api/complaints

Update complaint status, assign, escalate, or resolve.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | CEO, CTO, ADM, HR       |

**Request Body:**

```json
{
  "id": "complaint-uuid",
  "status": "UNDER_REVIEW",
  "assignedToId": "hr-user-uuid",
  "resolution": "Issue has been addressed with the employee."
}
```

Statuses: OPEN, UNDER_REVIEW, ESCALATED, RESOLVED, DISMISSED
Escalation levels: HR, PROJECT_MANAGER, CEO, CTO

---

### Credentials

#### GET /api/credentials

List credentials from the vault (filtered by access level based on role).

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | ALL (filtered by access level) |

---

#### POST /api/credentials

Add a credential to the vault.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | CEO, CTO, ADM            |

**Request Body:**

```json
{
  "title": "GitHub Org Account",
  "username": "knowai-org",
  "password": "encrypted-password",
  "url": "https://github.com/knowai",
  "category": "API",
  "notes": "Organization-level access",
  "accessLevel": "TEAM_AND_ABOVE"
}
```

Access levels: ADMIN_ONLY, MANAGER_AND_ABOVE, TEAM_AND_ABOVE, ALL_STAFF

---

#### PATCH /api/credentials

Update a credential.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | CEO, CTO, ADM            |

---

#### DELETE /api/credentials?id=uuid

Delete a credential.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | CEO, CTO, ADM            |

---

### HR Dashboard

#### GET /api/hr

Get HR-specific dashboard data (employee stats, leave summaries, document statuses).

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | CEO, CTO, ADM, HR       |

---

#### PATCH /api/hr

Perform HR actions (update employee details, manage onboarding).

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | CEO, CTO, ADM, HR       |

---

### Admin

#### GET /api/admin

Get admin dashboard data (system stats, user management, workspace config).

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | CEO, CTO, ADM            |

---

#### PUT /api/admin

Update system configuration.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | CEO, CTO, ADM            |

---

#### PATCH /api/admin

Perform admin actions (manage users, reset passwords, update workspace).

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | CEO, CTO, ADM            |

---

### API Keys

#### GET /api/api-keys

List API keys for the current user.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | ALL                      |

---

#### POST /api/api-keys

Create a new API key.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | ALL                      |

**Request Body:**

```json
{
  "name": "CI/CD Pipeline",
  "scopes": "read:projects,write:tasks",
  "expiresAt": "2027-03-17"
}
```

---

#### PATCH /api/api-keys

Update an API key (rename, update scopes).

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | Key owner                |

---

#### DELETE /api/api-keys?id=uuid

Revoke an API key.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | Key owner or ADM         |

---

### Webhooks

#### GET /api/webhooks

List configured webhooks.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | CEO, CTO, ADM            |

---

#### POST /api/webhooks

Create a webhook.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | CEO, CTO, ADM            |

---

#### GET /api/webhooks/:id

Get a single webhook's details.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | CEO, CTO, ADM            |

---

#### PUT /api/webhooks/:id

Update a webhook.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | CEO, CTO, ADM            |

---

#### DELETE /api/webhooks/:id

Delete a webhook.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | CEO, CTO, ADM            |

---

#### POST /api/webhooks/:id/test

Send a test payload to a webhook URL.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | CEO, CTO, ADM            |

---

### SOPs

#### GET /api/sops

List Standard Operating Procedures.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | CEO, CTO, ADM, HR       |

---

#### POST /api/sops

Create an SOP.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | CEO, CTO, ADM, HR       |

---

#### PATCH /api/sops

Update an SOP.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | CEO, CTO, ADM, HR       |

---

#### DELETE /api/sops?id=uuid

Delete an SOP.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | CEO, CTO, ADM, HR       |

---

### Chatbot

#### GET /api/chatbot

List conversations or get messages from a conversation.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | ALL                      |

**Query Parameters:** conversationId (get messages for a specific conversation)

---

#### POST /api/chatbot

Create a new conversation or send a message.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | ALL                      |

**Request Body:**

```json
{
  "conversationId": "conv-uuid",
  "message": "How do I create a project?"
}
```

If `conversationId` is omitted, a new conversation is created.

---

#### DELETE /api/chatbot?conversationId=uuid

Delete a conversation and all its messages.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | ALL (own conversations)  |

---

### Employee Documents

#### GET /api/documents

List employee documents.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | CEO, CTO, ADM, HR (all); Others (own only) |

---

#### POST /api/documents

Upload an employee document.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | ALL                      |

**Request Body:**

```json
{
  "type": "RESUME",
  "fileName": "resume.pdf",
  "fileUrl": "https://storage.example.com/resume.pdf",
  "fileSize": 245000,
  "notes": "Latest resume"
}
```

Document types: PASSPORT, PAN_CARD, AADHAAR, PROFILE_PHOTO, ID_PROOF, OFFER_LETTER, BANK_DETAILS, RESUME, OTHER

---

#### PATCH /api/documents

Verify, reject, or update a document.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | CEO, CTO, ADM, HR (verify/reject); Doc owner (update) |

**Request Body:**

```json
{
  "id": "doc-uuid",
  "status": "VERIFIED"
}
```

Document statuses: PENDING, UNDER_REVIEW, VERIFIED, REJECTED

---

#### DELETE /api/documents?id=uuid

Delete a document.

| Field       | Value                    |
|-------------|--------------------------|
| Auth Required | Yes                    |
| Role Access | Doc owner or CEO, CTO, ADM, HR |
