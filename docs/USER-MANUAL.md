# Know AI ERP - User Manual

A comprehensive guide for all users of the Know AI ERP platform.

---

## Table of Contents

- [Getting Started](#getting-started)
- [Role Overview](#role-overview)
- [Role Access Matrix](#role-access-matrix)
- [Dashboard](#dashboard)
- [Module Guides](#module-guides)
  - [Projects](#projects)
  - [Tasks](#tasks)
  - [Team](#team)
  - [Payroll](#payroll)
  - [Leaves](#leaves)
  - [Expenses](#expenses)
  - [Hiring (HireFlow)](#hiring-hireflow)
  - [Clients and Leads (CRM)](#clients-and-leads-crm)
  - [Invoices](#invoices)
  - [Chat](#chat)
  - [Email](#email)
  - [Calendar](#calendar)
  - [Files and Docs](#files-and-docs)
  - [Time Tracking](#time-tracking)
  - [Goals (OKRs)](#goals-okrs)
  - [Settings](#settings)
  - [Reports and Analytics](#reports-and-analytics)
  - [Audit Log](#audit-log)
  - [Complaints](#complaints)
  - [Credentials Vault](#credentials-vault)
  - [Spaces](#spaces)
  - [Canvas (Whiteboard)](#canvas-whiteboard)
  - [Favorites](#favorites)
  - [Notifications](#notifications)
  - [Chatbot](#chatbot)
- [Interactive Help Tour](#interactive-help-tour)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [FAQ and Troubleshooting](#faq-and-troubleshooting)

---

## Getting Started

### Logging In

1. Open your browser and navigate to the application URL (default: `http://localhost:5173`)
2. Enter your email and password
3. Click "Login"

**Default admin credentials:** `admin@knowai.com` / `admin123`

After the database is seeded, 16 users are available (all share password `admin123`):

| Email                  | Role                | Name             |
|------------------------|---------------------|------------------|
| admin@knowai.com       | ADMIN               | Admin User       |
| darsh@knowai.com       | CEO                 | Darsh Mehta      |
| ravi@knowai.com        | CTO                 | Ravi Kumar       |
| priya@knowai.com       | CFO                 | Priya Sharma     |
| ananya@knowai.com      | BRAND_FACE          | Ananya Patel     |
| sneha@knowai.com       | HR                  | Sneha Reddy      |
| vikram@knowai.com      | ACCOUNTING          | Vikram Singh     |
| meera@knowai.com       | PRODUCT_OWNER       | Meera Nair       |
| arjun@knowai.com       | CONTENT_STRATEGIST  | Arjun Desai      |
| kavya@knowai.com       | BRAND_PARTNER       | Kavya Iyer       |
| rohit@knowai.com       | SR_DEVELOPER        | Rohit Gupta      |
| neha@knowai.com        | EDITOR              | Neha Joshi       |
| aditya@knowai.com      | GRAPHIC_DESIGNER    | Aditya Verma     |
| ishaan@knowai.com      | JR_DEVELOPER        | Ishaan Malhotra  |
| tanvi@knowai.com       | GUY                 | Tanvi Chopra     |
| amit@knowai.com        | OFFICE_BOY          | Amit Tiwari      |

### First Login

After your first login:
1. Navigate to **Settings** to update your profile, change your password, and configure notification preferences
2. Review your **Dashboard** for assigned tasks, upcoming events, and team activity
3. Explore the sidebar to see which modules are available for your role

### Session and Security

- Sessions last 7 days (JWT-based authentication stored in an httpOnly cookie)
- After 5 failed login attempts, your account is locked for 15 minutes (brute-force protection)
- Logging out sets your status to OFFLINE and clears the session cookie

---

## Role Overview

Know AI ERP has 16 roles organized into four tiers:

### C-Suite (Full Access)

| Role       | Department  | Description                                    |
|------------|-------------|------------------------------------------------|
| CEO        | Executive   | Chief Executive Officer. Full unrestricted access to all modules, data, and settings. Can assign any role including C-suite. |
| CTO        | Executive   | Chief Technology Officer. Full access to all modules. Manages technology, projects, and hiring. |
| CFO        | Executive   | Chief Financial Officer. Access to financial modules (payroll, expenses, invoices, reports), team, calendar, email, chat, docs, clients, leads, and audit logs. |

### Management

| Role               | Department     | Description                                                   |
|--------------------|----------------|---------------------------------------------------------------|
| ADMIN              | Operations     | System administrator. Full unrestricted access. Manages users, roles, workspaces, settings, and credentials. |
| HR                 | Human Resources| Human Resources manager. Manages team, payroll, leaves, hiring, documents, complaints, expenses, contacts, SOPs, and reports. |
| ACCOUNTING         | Finance        | Senior Accountant. Manages payroll (read), expenses, invoices, and financial reports.   |
| PRODUCT_OWNER      | Product        | Product Owner. Manages projects, tasks, clients, leads, invoices, reports, goals, hiring, and time tracking. |
| BRAND_FACE         | Marketing      | Brand Ambassador. Manages clients, leads, email, calendar, chat, docs, files, analytics, and reports. |

### Senior Individual Contributors

| Role                | Department | Description                                                      |
|---------------------|------------|------------------------------------------------------------------|
| CONTENT_STRATEGIST  | Content    | Content Strategist. Access to tasks, docs, calendar, email, files, analytics, chat, goals, and time tracking. |
| BRAND_PARTNER       | Marketing  | Brand Partnership Manager. Access to clients, leads, docs, files, calendar, chat, and activity. |
| SR_DEVELOPER        | Engineering| Senior Full-Stack Developer. Access to projects, tasks, time tracking, docs, files, goals, calendar, chat, expenses, leaves, and analytics. |
| EDITOR              | Content    | Lead Video Editor. Access to tasks, docs, files, calendar, email, chat, expenses, leaves, and time tracking. |
| GRAPHIC_DESIGNER    | Design     | Senior Graphic Designer. Access to tasks, files, docs, calendar, chat, time tracking, expenses, and leaves. |

### Junior

| Role          | Department  | Description                                                           |
|---------------|-------------|-----------------------------------------------------------------------|
| JR_DEVELOPER  | Engineering | Junior React Developer. Access to tasks, time tracking, docs (read), files (read), calendar, chat, expenses, and leaves. |
| GUY           | Operations  | Operations Associate. Access to tasks, calendar, chat, files, expenses, and leaves. |
| OFFICE_BOY    | Operations  | Office Assistant. Minimal access: tasks, calendar, chat, and leaves.  |

---

## Role Access Matrix

The following table shows which modules each role can access. A check mark means the role has access.

| Module           | CEO | CTO | CFO | BRAND_FACE | ADMIN | HR | ACCT | PO | CS | BP | SR_DEV | EDITOR | GD | JR_DEV | GUY | OB |
|------------------|-----|-----|-----|------------|-------|----|------|----|----|----|--------|--------|----|--------|-----|----|
| Dashboard        |  Y  |  Y  |  Y  |     Y      |   Y   |  Y |  Y   |  Y |  Y |  Y |   Y    |   Y    |  Y |   Y    |  Y  |  Y |
| Projects         |  Y  |  Y  |     |            |   Y   |    |      |  Y |    |    |   Y    |        |    |        |     |    |
| Tasks            |  Y  |  Y  |     |            |   Y   |    |      |  Y |  Y |    |   Y    |   Y    |  Y |   Y    |  Y  |  Y |
| Team             |  Y  |  Y  |     |            |   Y   |  Y |      |  Y |    |    |        |        |    |        |     |    |
| Payroll          |  Y  |  Y  |  Y  |            |   Y   |  Y |  Y   |    |    |    |        |        |    |        |     |    |
| Leaves           |  Y  |  Y  |  Y  |            |   Y   |  Y |      |  Y |    |    |   Y    |   Y    |  Y |   Y    |  Y  |  Y |
| Expenses         |  Y  |  Y  |  Y  |            |   Y   |  Y |  Y   |  Y |    |    |   Y    |   Y    |  Y |   Y    |  Y  |    |
| Hiring           |  Y  |  Y  |     |            |   Y   |  Y |      |  Y |    |    |        |        |    |        |     |    |
| Clients          |  Y  |  Y  |  Y  |     Y      |   Y   |    |      |  Y |    |  Y |        |        |    |        |     |    |
| Leads            |  Y  |  Y  |  Y  |     Y      |   Y   |    |      |  Y |    |  Y |        |        |    |        |     |    |
| Invoices         |  Y  |  Y  |  Y  |            |   Y   |    |  Y   |  Y |    |    |        |        |    |        |     |    |
| Chat             |  Y  |  Y  |  Y  |     Y      |   Y   |  Y |  Y   |  Y |  Y |  Y |   Y    |   Y    |  Y |   Y    |  Y  |  Y |
| Email            |  Y  |  Y  |  Y  |     Y      |   Y   |  Y |  Y   |  Y |  Y |    |        |   Y    |    |        |     |    |
| Calendar         |  Y  |  Y  |  Y  |     Y      |   Y   |  Y |  Y   |  Y |  Y |  Y |   Y    |   Y    |  Y |   Y    |  Y  |  Y |
| Files            |  Y  |  Y  |  Y  |     Y      |   Y   |  Y |  Y   |  Y |  Y |  Y |   Y    |   Y    |  Y |   Y    |  Y  |    |
| Docs / Wiki      |  Y  |  Y  |  Y  |     Y      |   Y   |  Y |  Y   |  Y |  Y |  Y |   Y    |   Y    |  Y |   Y    |     |    |
| Time Tracking    |  Y  |  Y  |     |            |   Y   |    |      |  Y |  Y |    |   Y    |   Y    |  Y |   Y    |     |    |
| Goals            |  Y  |  Y  |     |            |   Y   |    |      |  Y |  Y |    |   Y    |        |    |        |     |    |
| Reports          |  Y  |  Y  |  Y  |     Y      |   Y   |  Y |  Y   |  Y |    |    |        |        |    |        |     |    |
| Analytics        |  Y  |  Y  |  Y  |     Y      |   Y   |  Y |      |  Y |  Y |    |   Y    |        |    |        |     |    |
| Settings         |  Y  |  Y  |  Y  |     Y      |   Y   |  Y |  Y   |  Y |  Y |  Y |   Y    |   Y    |  Y |   Y    |  Y  |  Y |
| Audit Log        |  Y  |  Y  |  Y  |            |   Y   |    |      |    |    |    |        |        |    |        |     |    |
| Complaints       |  Y  |  Y  |     |            |   Y   |  Y |      |    |    |    |        |        |    |        |     |    |
| Credentials      |  Y  |  Y  |     |            |   Y   |    |      |    |    |    |        |        |    |        |     |    |
| HR Dashboard     |  Y  |  Y  |     |            |   Y   |  Y |      |    |    |    |        |        |    |        |     |    |
| Admin Panel      |  Y  |  Y  |     |            |   Y   |    |      |    |    |    |        |        |    |        |     |    |

**Legend:** CEO=CEO, CTO=CTO, CFO=CFO, ACCT=ACCOUNTING, PO=PRODUCT_OWNER, CS=CONTENT_STRATEGIST, BP=BRAND_PARTNER, SR_DEV=SR_DEVELOPER, GD=GRAPHIC_DESIGNER, JR_DEV=JR_DEVELOPER, OB=OFFICE_BOY

---

## Dashboard

The Dashboard is every user's landing page after login. It adapts based on your role.

### Common Elements (All Roles)

- **Greeting:** Time-of-day greeting (Good Morning/Afternoon/Evening) in IST, with today's date
- **Motivational Quote:** A randomly selected productivity quote
- **Today's Tasks:** Tasks due today, sorted by priority
- **In Progress Tasks:** Tasks you are currently working on
- **In Review Tasks:** Tasks awaiting review
- **Upcoming Tasks:** Tasks due in the next 7 days
- **Backlog/Overdue:** Tasks past their due date
- **Recently Completed:** Tasks completed in the last 7 days
- **Task Pipeline:** Visual breakdown of your tasks by status (Todo, In Progress, In Review, Completed)
- **KPI Metrics:**
  - Tasks completed this week vs. last week
  - Average completion time (days)
  - On-time completion rate (%)
  - Current streak (consecutive days with at least one completed task)
  - Weekly trend chart (Mon-Sun)
- **Upcoming Events:** Next 3 calendar events
- **Activity Feed:** Recent workspace notifications
- **Overdue Alerts:** Deadline alerts for overdue tasks
- **Today's Leaves:** Team members on leave today
- **Notifications:** Unread notification count and recent notifications

### Admin/Manager Dashboard (Additional)

Admin and manager roles see extra widgets:
- **Team Stats:** Total members, active projects, total tasks, completed tasks, revenue, expenses
- **Revenue vs. Expenses Chart:** 6-month trend chart
- **Task Status Distribution:** Pie chart of workspace task statuses
- **Team Performance:** Top 10 team members by completed tasks with completion rates

### HR Dashboard (Additional)

- **Pending Leave Requests:** Count of leaves awaiting approval
- **Headcount:** Total workspace members

---

## Module Guides

### Projects

**Access:** CEO, CTO, ADMIN, PRODUCT_OWNER (full); CFO, HR (view all); SR_DEVELOPER (own + assigned); Others (task-based)

Projects are the top-level organizational unit for work. Each project has a manager, status, progress percentage, and due date.

#### Creating a Project

1. Navigate to **Projects** in the sidebar
2. Click **New Project**
3. Fill in:
   - **Name** (required): The project title
   - **Description:** A summary of the project's purpose
   - **Status:** PLANNING, ACTIVE, IN_REVIEW, COMPLETED, or ON_HOLD
   - **Due Date:** The project deadline
4. Click **Create**

The creator automatically becomes the project manager.

**Who can create:** CEO, CTO, ADMIN, PRODUCT_OWNER

#### Managing Projects

- **Edit:** Click on a project to open the detail view. Update name, description, status, or due date.
- **Delete:** Only the project manager or an ADMIN can delete a project. Deleting a project cascades to all its tasks.
- **View Detail:** The project detail page shows all tasks, team members (derived from task assignees), and task dependencies.

#### Filtering and Search

- Filter by status (Planning, Active, In Review, Completed, On Hold)
- Filter by manager
- Filter by department
- Search by project name
- Paginated list (20 per page)

#### Kanban View

The project detail page displays tasks in a Kanban board with columns for each status: TODO, IN_PROGRESS, IN_REVIEW, COMPLETED.

---

### Tasks

**Access:** All roles (scope varies by role)

Tasks are individual work items within a project.

#### Task Visibility by Role

- **CEO, CTO, ADMIN:** See all tasks in the workspace
- **PRODUCT_OWNER:** See all tasks in projects they manage
- **HR:** See tasks they created or are assigned to
- **SR_DEVELOPER:** See tasks in projects where they have assignments
- **JR_DEVELOPER, GUY, OFFICE_BOY:** See only their own assigned tasks
- **Others:** See own tasks plus tasks in projects they manage or created

#### Creating a Task

1. Navigate to **Tasks** or open a project
2. Click **New Task**
3. Fill in:
   - **Title** (required): The task name
   - **Description:** Detailed instructions
   - **Project** (required): Which project this belongs to
   - **Assignee:** Who will work on this task (defaults to you)
   - **Priority:** LOW, MEDIUM, HIGH, or URGENT
   - **Status:** TODO, IN_PROGRESS, IN_REVIEW, or COMPLETED
   - **Due Date:** The task deadline
   - **Dependencies (Depends On):** Select tasks that must be completed before this one can start
4. Click **Create**

#### Task Dependencies

Tasks can have blocking relationships:
- A task can be **blocked by** one or more other tasks
- A task can be **blocking** other tasks
- View blocked tasks with the "Blocked" view filter
- Dependencies are shown in the task detail view

#### Bulk Operations

Select multiple tasks to perform bulk actions:
- **Bulk Update:** Change status, assignee, or priority for multiple tasks at once
- **Bulk Delete:** Remove multiple tasks at once

#### Views and Filters

- **My Tasks:** Only your assigned tasks
- **Team:** Tasks in your team's projects
- **Blocked:** Tasks that are blocked by your incomplete work
- **Calendar:** Tasks filtered by date range
- Filter by: status, priority, assignee, project, due date range
- Sort by: title, priority, due date, created date, status
- Search by title or description

#### Notifications

- When you are assigned a task, you receive a notification
- When a task's status changes, relevant parties are notified
- When a task is marked as COMPLETED, the creator and assignee are notified

---

### Team

**Access:** CEO, CTO, ADMIN, HR (full detail + management); PRODUCT_OWNER (department-scoped); Others (limited directory)

#### Viewing Team Members

- **Full access roles** (CEO, CTO, ADMIN, HR) see: name, email, role, department, phone, status, task count, project count
- **PRODUCT_OWNER** sees full details for members in their department
- **Other roles** see a limited directory: name, role, department only

#### Member Detail View

Click on a team member to see:
- Profile information
- Recent tasks (last 10)
- Recent projects (last 5)
- Performance metrics: completed tasks, total tasks, completion rate percentage

#### Onboarding New Members

1. Navigate to **Team**
2. Click **Add Member**
3. Fill in: email, password, first name, last name, role, department, phone
4. Click **Create**

**Who can onboard:**
- **CEO:** Can create all roles except CEO
- **CTO:** Can create all roles except CEO and CTO
- **ADMIN:** Can create all roles except CEO, CTO, CFO
- **HR:** Can create all roles except CEO, CTO, CFO, BRAND_FACE, ADMIN

#### Updating Members

Full access roles can update a member's role, status, department, and phone. Restrictions:
- Cannot change your own role
- Cannot promote anyone to CEO
- Only CEO can promote someone to CTO

#### Removing Members

Full access roles can delete team members. You cannot delete yourself.

---

### Payroll

**Access:** CEO, CFO, ADMIN, ACCOUNTING (full); HR (create, no process)

Payroll tracks monthly salary records for each employee.

#### Payroll Record Fields

- **Employee:** The team member
- **Month/Year:** The pay period
- **Basic Pay, HRA, Transport, Bonus, Deductions:** Salary components
- **Total Pay:** Calculated total
- **Currency:** Default INR
- **Working Days, Present Days, Absent Days, Leave Days:** Attendance
- **Status:** PENDING or PAID
- **Notes:** Additional remarks

#### Creating a Payroll Record

1. Navigate to **Payroll**
2. Click **Create Payroll**
3. Select the employee, month, and year
4. Enter salary components (basic pay, HRA, transport, bonus, deductions)
5. Enter attendance details
6. Click **Create**

Each employee can have only one payroll record per month/year.

#### Processing Payments

1. Open a payroll record
2. Click **Record Payment**
3. Enter: amount, payment mode (CASH, BANK_TRANSFER, UPI, CHEQUE), bank reference, purpose, remarks
4. Submit

When total payments reach the total pay amount, the payroll status automatically changes to PAID.

**Who can process:** CEO, CFO, ADMIN, ACCOUNTING

#### Viewing Payroll

- Filter by month, year, employee, status
- Employees can view their own payroll records
- Managers see all payroll records in the workspace

---

### Leaves

**Access:** All roles can request leaves; CEO, ADMIN, HR can view and approve all

#### Leave Types

| Type           | Description                     |
|----------------|---------------------------------|
| PAID           | Paid time off                   |
| UNPAID         | Unpaid leave                    |
| SICK           | Sick leave                      |
| HALF_DAY       | Half-day leave                  |
| WORK_FROM_HOME | Working from home               |

#### Requesting Leave

1. Navigate to **Leaves**
2. Click **Request Leave**
3. Fill in: leave type, start date, end date, reason
4. Click **Submit**

Your request starts in PENDING status.

#### Approving/Rejecting Leave

Roles CEO, ADMIN, and HR can:
1. View all pending leave requests
2. Click on a request
3. Select **Approve** or **Reject**
4. Optionally add an approver note
5. The employee receives a notification of the decision

#### Calendar View

The leaves module shows a calendar view with approved leaves overlaid. The dashboard also displays who is on leave today.

#### Filtering

- Filter by status (PENDING, APPROVED, REJECTED, CANCELLED)
- Filter by employee
- Filter by month and year

---

### Expenses

**Access:** All roles can submit; CEO, CFO, ADMIN (full approve); ACCOUNTING (view all + approve); HR, PRODUCT_OWNER (team approve)

#### Expense Categories

TRAVEL, FOOD, EQUIPMENT, SOFTWARE, OFFICE, SHOOT, MARKETING, FUEL, MAINTENANCE, OTHER

#### Submitting an Expense

1. Navigate to **Expenses**
2. Click **New Expense**
3. Fill in: title, description, amount, currency, category, receipt (URL), expense date
4. Click **Submit**

Expenses start in DRAFT status. Change to SUBMITTED when ready for approval.

#### Expense Workflow

```
DRAFT -> SUBMITTED -> APPROVED -> REIMBURSED
                   -> REJECTED
```

#### Approving Expenses

1. View submitted expenses
2. Click on an expense
3. Select **Approve** or **Reject** (with optional rejection note)

**Approval hierarchy:**
- CEO, CFO, ADMIN: Can approve any expense
- ACCOUNTING: Can view all and approve
- HR, PRODUCT_OWNER: Can approve team expenses

---

### Hiring (HireFlow)

**Access:** CEO, CTO, ADMIN, HR, PRODUCT_OWNER (full); SR_DEVELOPER (view + interviews)

HireFlow is the recruitment pipeline for managing job postings, candidates, and interviews.

#### Job Postings

1. Navigate to **Hiring**
2. Click **Post Job**
3. Fill in: title, department, description, requirements, salary range, location, type (Full-time/Part-time/Contract/Intern)
4. Set status: DRAFT, OPEN, ON_HOLD, or CLOSED

#### Candidate Pipeline

Candidates progress through stages:

```
APPLIED -> RESUME_REVIEW -> INTERVIEW_ROUND_1 -> PRACTICAL_TASK -> INTERVIEW_ROUND_2 -> FINAL_INTERVIEW -> OFFERED -> HIRED
                                                                                                       -> REJECTED (at any stage)
```

For each candidate, track: name, email, phone, WhatsApp, resume URL, LinkedIn, portfolio, cover letter, reviewer, notes, practical task submission.

#### Interview Rounds

1. Open a candidate
2. Click **Schedule Interview**
3. Assign an interviewer, set the round number and name, schedule date/time
4. After the interview, record: result (PASSED/FAILED), feedback, score (1-10)

#### Careers Page (Public)

The `/careers` endpoint is publicly accessible (no authentication required). It lists all OPEN job postings with a public application form.

---

### Clients and Leads (CRM)

**Access:** CEO, CTO, ADMIN, PRODUCT_OWNER, BRAND_FACE, BRAND_PARTNER (varies by role)

#### Clients

Clients represent organizations or individuals you do business with.

**Creating a Client:**
1. Navigate to **Clients**
2. Click **Add Client**
3. Fill in: name, email, phone, company, address, website, industry, notes
4. Click **Create**

**CSV Import:** Bulk import clients from a CSV file using the import feature.

#### Leads

Leads are potential business opportunities linked to clients.

**Lead Pipeline Stages:**

```
NEW -> CONTACTED -> QUALIFIED -> PROPOSAL -> NEGOTIATION -> WON
                                                         -> LOST
```

**Creating a Lead:**
1. Navigate to **Leads**
2. Click **Add Lead**
3. Fill in: title, value (deal amount), status, source, client, assignee, notes, next follow-up date
4. Click **Create**

**Managing Leads:**
- Drag leads between pipeline stages in the Kanban view
- Filter by status, assignee, client
- Sort by value, created date, or follow-up date
- Link tasks to leads for follow-up actions

---

### Invoices

**Access:** CEO, CFO, ADMIN, ACCOUNTING (full CRUD); PRODUCT_OWNER (view only)

#### Creating an Invoice

1. Navigate to **Invoices**
2. Click **New Invoice**
3. Fill in:
   - **Client:** Select an existing client or enter details manually
   - **Items:** Add line items with description, quantity, rate (amount is auto-calculated)
   - **Subtotal, Tax, Discount:** Calculated fields
   - **Due Date**
   - **Notes**
4. Click **Create**

An invoice number is automatically generated.

#### Invoice Status Flow

```
DRAFT -> SENT -> PAID
              -> OVERDUE
              -> CANCELLED
```

#### Sending Invoices

1. Open an invoice
2. Click **Send via Email**
3. The invoice is emailed to the client using a professional HTML template
4. Status automatically changes from DRAFT to SENT

#### Tracking Payments

Mark invoices as PAID when payment is received. The paid date is recorded.

---

### Chat

**Access:** All roles

The chat system supports direct messages, group chats, project chats, and department channels.

#### Chat Room Types

| Type       | Description                              |
|------------|------------------------------------------|
| dm         | Direct message between two users         |
| group      | Group chat with multiple members         |
| project    | Chat room linked to a specific project   |
| department | Chat room for a department               |

#### Creating a Chat Room

1. Navigate to **Chat**
2. Click **New Chat**
3. Select type (DM, Group, Project, Department)
4. Add members
5. Optionally set a room name
6. Click **Create**

#### Messaging

- Send text messages
- Reply to specific messages (threaded replies)
- Send files (file type, name, and size are tracked)
- System messages for room events
- AI-generated messages (integration with chatbot)

#### Chat Moderation

Admins can mute users in chat by updating the `chatMuted` flag on their user profile.

---

### Email

**Access:** All authenticated users can send custom emails; specific templates require specific roles

#### Composing Email

1. Navigate to **Email**
2. Click **Compose**
3. Enter: recipient email(s), subject, body (HTML supported)
4. Click **Send**

#### Email Templates

The system provides pre-built templates:

| Template          | Description                        | Required Role                      |
|-------------------|------------------------------------|------------------------------------|
| Welcome           | Onboarding email for new members   | All authenticated users            |
| Invoice           | Send invoice to clients            | Executives, Managers               |
| Leave Approval    | Notify employee of leave decision  | HR, Managers, Executives           |
| Task Assigned     | Notify task assignment             | All authenticated users            |
| Payroll Processed | Notify salary processing           | HR, Accounting, Executives         |

#### Sending a Newsletter

1. Navigate to **Email**
2. Click **Newsletter**
3. Enter subject and body
4. Click **Send to All**

The newsletter is sent to all team members in the workspace.

**Who can send newsletters:** Executives only (CEO, CTO, CFO, ADMIN)

#### Email History

View sent and received emails with filters:
- **Sent folder:** Emails you sent
- **Inbox folder:** Emails sent to your address
- Filter by type: CUSTOM, INVOICE, NEWSLETTER, NOTIFICATION

#### Email Analytics (Executives Only)

Dashboard showing:
- Total emails sent (all time, last 30 days, last 7 days)
- Breakdown by type (Custom, Invoice, Newsletter, etc.)
- Breakdown by status (Sent, Failed, Bounced)
- Top 10 senders

---

### Calendar

**Access:** All roles

#### Creating Events

1. Navigate to **Calendar**
2. Click on a date or click **New Event**
3. Fill in: title, description, start date/time, end date/time, color, calendar type
4. Click **Create**

#### Views

- **Month View:** Overview of all events in a month
- **Week View:** Detailed weekly schedule
- **Day View:** Hour-by-hour view

#### Integration

- Task due dates appear on the calendar
- Leave requests (approved) appear on the calendar
- Upcoming events are shown on the Dashboard

---

### Files and Docs

#### Files

**Access:** Most roles (see access matrix)

The file manager supports a hierarchical folder structure.

**Uploading Files:**
1. Navigate to **Files**
2. Click **Upload** or drag and drop files
3. Optionally select a destination folder

**Creating Folders:**
1. Click **New Folder**
2. Enter a name
3. Click **Create**

**File Operations:** Rename, move to folder, delete

#### Docs (Wiki)

**Access:** Most roles (see access matrix)

Docs is a wiki-style documentation system with hierarchical pages.

**Creating a Doc:**
1. Navigate to **Docs**
2. Click **New Doc**
3. Enter a title, write content, select an icon
4. Optionally nest under a parent doc or link to a project
5. Toggle **Published** when ready to share

**Features:**
- Nested document hierarchy (parent-child relationships)
- Project-linked docs
- Published/draft status
- Rich text content

---

### Time Tracking

**Access:** CEO, CTO, ADMIN, PRODUCT_OWNER, CONTENT_STRATEGIST, SR_DEVELOPER, EDITOR, GRAPHIC_DESIGNER, JR_DEVELOPER

#### Logging Time

1. Navigate to **Time Tracking**
2. Click **New Entry** or start the timer
3. Fill in: task (optional), project (optional), description, start time, end time
4. Duration is calculated automatically
5. Toggle **Billable** as needed
6. Click **Save**

#### Timer

Start a live timer to track time in real-time. When you stop the timer, a time entry is created automatically.

#### Reports

View time entries with filters:
- By date range
- By project
- By task
- By billable status

---

### Goals (OKRs)

**Access:** CEO, CTO, ADMIN, PRODUCT_OWNER, CONTENT_STRATEGIST, SR_DEVELOPER

#### Goal Types

| Type        | Description                                |
|-------------|--------------------------------------------|
| OBJECTIVE   | High-level objective                       |
| KEY_RESULT  | Measurable result under an objective       |
| TARGET      | Specific numeric target                    |

#### Creating a Goal

1. Navigate to **Goals**
2. Click **New Goal**
3. Fill in: title, description, type, parent goal (for Key Results), start/end date
4. Set metric tracking: type (Percentage, Number, Currency, Boolean), current value, target value
5. Click **Create**

#### Tracking Progress

- Progress is tracked as 0-100%
- Status: ON_TRACK, AT_RISK, BEHIND, COMPLETED
- Update `metricCurrent` as you make progress toward `metricTarget`

#### Hierarchy

Goals support parent-child relationships. An Objective can have multiple Key Results, each with its own progress and metrics.

---

### Settings

**Access:** All roles

#### Profile Settings

- Update first name, last name, phone, avatar
- Change password
- View your role and department

#### Theme and Appearance

| Setting        | Options                            |
|----------------|------------------------------------|
| Theme          | Light, Dark                        |
| Accent Color   | Custom hex color                   |
| Sidebar Style  | Full, Collapsed, Mini              |
| Compact Mode   | Dense table/card view on/off       |
| Font Size      | Small, Medium, Large               |

#### Localization

| Setting       | Default         | Options                   |
|---------------|-----------------|---------------------------|
| Language      | English (en)    | Various languages         |
| Date Format   | DD/MM/YYYY      | DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD |
| Currency      | INR             | INR, USD, EUR, GBP, etc.  |
| Timezone      | Asia/Kolkata    | All standard timezones    |

#### Notification Preferences

| Setting              | Default | Description                        |
|----------------------|---------|------------------------------------|
| Email Notifications  | On      | Receive email alerts               |
| Push Notifications   | On      | Browser push notifications         |
| Weekly Digest        | On      | Weekly summary email               |
| Desktop Notifications| On      | Desktop notification popups        |
| Sound Enabled        | On      | Notification sounds                |

#### Dashboard Customization

- **Sidebar Order:** Rearrange sidebar sections
- **Collapsed Groups:** Choose which sidebar groups start collapsed
- **Dashboard Layout:** Show/hide/reorder dashboard widgets
- **Pinned Pages:** Quick navigation shortcuts
- **Default Page:** Landing page after login
- **Data Scope:** own, team, department, or all (capped by role permissions)

---

### Reports and Analytics

**Access:** CEO, CTO, CFO, ADMIN, HR, ACCOUNTING, PRODUCT_OWNER, BRAND_FACE (varies)

#### Report Types

- **Financial Reports:** Revenue, expenses, invoices, payroll summaries
- **Team Reports:** Headcount, department breakdown, performance metrics
- **Project Reports:** Status distribution, progress, task completion rates
- **Time Tracking Reports:** Hours by project, by team member, billable vs. non-billable

#### Analytics Dashboard

The analytics module provides workspace-wide insights:
- Task completion trends
- Project status distribution
- Team productivity metrics
- Revenue and expense charts

---

### Audit Log

**Access:** CEO, CTO, CFO, ADMIN

The audit log tracks all significant actions in the system.

#### Tracked Actions

| Action  | Description                     |
|---------|---------------------------------|
| CREATE  | A new entity was created        |
| UPDATE  | An entity was modified          |
| DELETE  | An entity was removed           |
| LOGIN   | A user logged in                |
| LOGOUT  | A user logged out               |
| EXPORT  | Data was exported               |
| IMPORT  | Data was imported               |

#### Tracked Entities

USER, PROJECT, TASK, FILE, CONTACT, CALENDAR_EVENT, WORKSPACE, SETTINGS, PAYROLL, EXPENSE, CREDENTIAL

#### Filtering

- Filter by action type
- Filter by entity type
- Filter by user
- Filter by date range
- Search by entity name or description

---

### Complaints

**Access:** CEO, CTO, ADMIN, HR

The complaint system manages workplace grievances with escalation support.

#### Complaint Categories

HARASSMENT, DISCRIMINATION, MISCONDUCT, POLICY_VIOLATION, PERFORMANCE, LEAVE_DISPUTE, SALARY_DISPUTE, WORKPLACE_SAFETY, OTHER

#### Filing a Complaint

1. Navigate to **Complaints**
2. Click **File Complaint**
3. Fill in: category, subject, description, against (which employee), anonymous flag
4. Click **Submit**

A unique ticket number is generated.

#### Complaint Workflow

```
OPEN -> UNDER_REVIEW -> ESCALATED -> RESOLVED
                                   -> DISMISSED
```

#### Escalation Levels

Complaints can be escalated through: HR -> PROJECT_MANAGER -> CEO -> CTO

#### Timeline

Each complaint has a timeline tracking all actions: status changes, assignments, notes, and resolutions.

---

### Credentials Vault

**Access:** CEO, CTO, ADMIN (full); Others based on access level

A secure vault for storing shared passwords and API keys.

#### Access Levels

| Level             | Who Can View                          |
|-------------------|---------------------------------------|
| ADMIN_ONLY        | CEO, CTO, ADMIN only                  |
| MANAGER_AND_ABOVE | Above + HR, PRODUCT_OWNER, etc.       |
| TEAM_AND_ABOVE    | Above + Senior ICs                    |
| ALL_STAFF         | All authenticated users               |

#### Managing Credentials

1. Navigate to **Credentials**
2. Click **Add Credential**
3. Fill in: title, username, password, URL, category, notes, access level
4. Click **Save**

Categories include: Social Media, Hosting, API, Email, Banking, etc.

---

### Spaces

**Access:** CEO, CTO, ADMIN, PRODUCT_OWNER, and roles with project access

Spaces are groupings for organizing related projects.

#### Creating a Space

1. Navigate to **Spaces**
2. Click **New Space**
3. Enter: name, description, color, icon
4. Click **Create**

#### Managing Spaces

- Add existing projects to a space
- View all projects within a space
- Delete a space (projects are unlinked, not deleted)

---

### Canvas (Whiteboard)

**Access:** Roles with canvas:manage or project access

A collaborative whiteboard for visual brainstorming.

#### Creating a Canvas

1. Navigate to **Canvas** or open from a project
2. Click **New Canvas**
3. Enter a title
4. Optionally link to a project
5. Start drawing/designing

Canvas data is stored as JSON, supporting various drawing elements.

---

### Favorites

**Access:** All authenticated users

Pin frequently accessed items for quick navigation.

#### Adding a Favorite

Click the star/pin icon on any:
- Project
- Task
- Client
- Contact
- Canvas
- Goal

Favorites appear in the sidebar for quick access. You can reorder favorites by dragging.

---

### Notifications

**Access:** All authenticated users

#### Notification Types

| Type               | Trigger                                        |
|--------------------|------------------------------------------------|
| TASK_ASSIGNED      | A task is assigned to you                      |
| TASK_COMPLETED     | A task you created or are assigned to is done  |
| TASK_OVERDUE       | A task is past its due date                    |
| TASK_COMMENT       | Someone comments on your task                  |
| LEAVE_APPROVED     | Your leave request is approved                 |
| LEAVE_REJECTED     | Your leave request is rejected                 |
| DOCUMENT_VERIFIED  | Your uploaded document is verified             |
| LEAD_ASSIGNED      | A lead is assigned to you                      |
| CHAT_MENTION       | You are mentioned in chat                      |
| COMPLAINT_FILED    | A complaint involves you                       |
| COMPLAINT_RESOLVED | A complaint you filed is resolved              |
| SYSTEM             | System-level notification                      |

#### Managing Notifications

- View all notifications in the Notifications page
- Mark individual notifications as read
- Mark all as read
- Delete notifications
- Filter by read/unread status

---

### Chatbot

**Access:** All authenticated users

The built-in chatbot provides an AI assistant interface.

#### Using the Chatbot

1. Click the chatbot icon or navigate to **Chatbot**
2. Start a new conversation or continue an existing one
3. Type your question or request
4. The chatbot responds with contextual help

#### Conversation Management

- Create new conversations
- View conversation history
- Delete conversations

---

## Interactive Help Tour

When you first log in (or when triggered from Settings), an interactive guided tour walks you through the key features of the application. The tour highlights:

1. The sidebar navigation and how to find modules
2. The Dashboard and its widgets
3. How to create your first project
4. How to create and assign tasks
5. How to use the chat system
6. How to configure your settings

You can restart the tour at any time from the Settings page.

---

## Keyboard Shortcuts

| Shortcut          | Action                          |
|-------------------|---------------------------------|
| `/`               | Focus search bar                |
| `Ctrl+K` / `Cmd+K` | Open command palette          |
| `N`               | New item (context-dependent)    |
| `Esc`             | Close modal/dialog              |
| `Ctrl+Enter`      | Submit form / send message      |
| `Ctrl+S` / `Cmd+S` | Save current item             |
| `?`               | Show keyboard shortcuts help    |

---

## FAQ and Troubleshooting

### I forgot my password. How do I reset it?

Contact your system administrator (ADMIN or HR role). They can update your account through the Team module. There is no self-service password reset currently.

### I cannot access a module. The sidebar link is missing.

Your role does not have permission for that module. See the [Role Access Matrix](#role-access-matrix) to understand which modules your role can access. Contact your administrator if you believe you need access.

### I am locked out after too many login attempts.

The system locks accounts after 5 failed login attempts for 15 minutes. Wait 15 minutes and try again with the correct credentials.

### My tasks page is empty but I know I have tasks.

Check which view you are on. If you are on "My Tasks," you will only see tasks assigned to you. Junior roles (JR_DEVELOPER, GUY, OFFICE_BOY) can only see their own assigned tasks. Switch to a different view or check with your project manager.

### Emails are showing as "simulated" and not actually sending.

SMTP is not configured. Ask your administrator to set up the SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASSWORD environment variables. See the Setup Guide for details.

### I created a payroll record but cannot process a payment.

Only CEO, CFO, ADMIN, and ACCOUNTING roles can process payroll payments. HR can create payroll records but cannot process payments.

### How do I change the application theme?

Navigate to **Settings** > **Appearance**. You can switch between Light and Dark themes, change the accent color, adjust sidebar style, enable compact mode, and change the font size.

### How do I import clients from a CSV file?

Navigate to **Clients** and click the **Import CSV** button. The CSV should have columns matching client fields (name, email, phone, company, etc.). Map the columns and confirm the import.

### Can I export data?

Reports and certain modules support data export. Navigate to the relevant module and look for the Export button. Exports are tracked in the Audit Log.

### The Dashboard data seems outdated.

The Dashboard fetches live data on each page load. Refresh the page to get the latest data. If numbers seem wrong, check if tasks/records have been updated by other users.

### I see a 403 "Access Denied" error.

Your role does not have permission for the requested action. This can happen if:
- You try to access an API endpoint your role cannot use
- You try to create/edit/delete a resource that requires a higher role
- You try to assign a task to someone outside your role hierarchy

### How do I change my notification preferences?

Navigate to **Settings** > **Notifications**. Toggle email notifications, push notifications, weekly digest, desktop notifications, and notification sounds on or off.

### How are task dependencies enforced?

Task dependencies are informational. A task marked as "blocked by" another task does not prevent status changes, but the dependency is visible to all team members. Use the "Blocked" view to see tasks you are blocking.

### What happens when I delete a project?

Deleting a project cascades to all its tasks, which are permanently removed. Time entries, docs, and canvases linked to the project are unlinked (not deleted). This action cannot be undone.
