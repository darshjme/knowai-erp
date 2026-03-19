<div align="center">

# KnowAI ERP

### AI-Powered Enterprise Management Platform

One platform to run your entire company — hiring, payroll, CRM, projects, inventory, workflow automation, and AI-driven insights — unified under a single roof.

[![React](https://img.shields.io/badge/React_19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Next.js](https://img.shields.io/badge/Next.js_15-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL_16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://postgresql.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://docker.com)
[![License: ISC](https://img.shields.io/badge/License-ISC-green?style=for-the-badge)](LICENSE)

![Version](https://img.shields.io/badge/version-1.0.0-146DF7?style=flat-square)
![Lines of Code](https://img.shields.io/badge/lines_of_code-56,365+-blueviolet?style=flat-square)
![DB Tables](https://img.shields.io/badge/database_tables-46-orange?style=flat-square)
![API Routes](https://img.shields.io/badge/API_routes-40+-blue?style=flat-square)
![Pages](https://img.shields.io/badge/pages-34+-teal?style=flat-square)

---

[Features](#features) · [Architecture](#architecture) · [Quick Start](#quick-start) · [Tech Stack](#tech-stack) · [Role Hierarchy](#role-hierarchy) · [API Reference](#api-reference) · [Documentation](#documentation)

</div>

---

## Overview

KnowAI ERP is a **production-grade, multi-tenant enterprise resource planning platform** engineered for modern organizations. It consolidates 20+ business functions — CRM, HR, payroll, project management, hiring pipelines, real-time inventory, order management, workflow automation, and AI-powered analytics — into a single, cohesive application.

Built across **56,365+ lines of production code**, the platform ships with **46 PostgreSQL tables**, **40+ REST API endpoints**, **34+ pages**, a **25-role permission hierarchy**, **multi-currency support** (USD, INR, HKD, CAD, GBP, AUD, AED), and **17 seeded users** across all roles out of the box.

> **Brand Color:** `#146DF7`

---

## Features

### Core Platform

- **Multi-Tenant Architecture** — Workspace isolation with membership controls, department segmentation, and tenant-aware data access
- **25-Role Permission Hierarchy** — Granular numeric permission levels from Office Boy (10) to CTO (100), enforced across every API route and UI surface
- **Widgetised Dashboard** — Customizable executive dashboard with drag-and-drop widgets, KPI cards, and dark theme support
- **Two-Factor Authentication** — Identity verification, account lockout policies, encrypted password vault with role-based access logs

### HireFlow Hiring Pipeline

- **End-to-End Recruitment** — Job postings, candidate tracking, multi-round interview scheduling, scoring rubrics, and offer management
- **Video Review Engine** — Candidate video submission review with structured feedback and rating workflows
- **Identity Verification** — Document verification pipeline with approval states for onboarding compliance

### Real-Time Inventory and Order Management

- **Inventory Tracking** — Real-time stock levels, reorder alerts, SKU management, and warehouse segmentation
- **Order Lifecycle** — Order creation, fulfillment tracking, invoice generation with multi-currency support, and status automation

### Workflow Automation and AI Insights

- **Workflow Engine** — Automated approval chains, change request workflows, escalation rules, and accountability alerts
- **AI-Powered Analytics** — Executive dashboards, team performance scoring, employee behavioral analytics, and predictive insights
- **AI Chatbot** — Conversational assistant for platform navigation, data queries, and operational support

### Project and Task Management

- **Full Project Lifecycle** — Planning, Active, Review, Complete stages with task dependencies, priority levels, and assignee management
- **Kanban Boards** — Drag-and-drop task boards with real-time state synchronization
- **Time Tracking** — Billable hours, time entries per task, and utilization reports
- **OKR Goal Tracking** — Objective and key result management with progress indicators

### HR, Payroll, and People Operations

- **Payroll Processing** — Monthly salary computation, payroll logs, expense submission, and multi-currency disbursement
- **Leave Management** — Request/approval workflows with calendar integration and balance tracking
- **Complaint and Escalation** — Filing, timeline tracking, and resolution workflows
- **Profile Management** — Employee profiles, document management, and preference controls
- **Personality Assessment** — Carl Jung MBTI-based personality evaluation for team dynamics

### CRM and Sales

- **Client Management** — Client lifecycle tracking, contact directory, and relationship history
- **Lead Pipeline** — Stage-based lead progression with associated tasks and conversion analytics
- **Invoice Generation** — Multi-currency invoice creation, line items, tax computation, and PDF export

### Communication and Collaboration

- **Real-Time Chat** — Chat rooms, direct messages, and threaded conversations
- **Email Client** — SMTP-based email composition, inbox management, and analytics dashboard
- **Calendar** — Event scheduling, team availability, and deadline tracking
- **Notifications** — System-wide notification engine with read/unread state management

### Content and Workspace

- **Spaces** — Multi-workspace environments (Engineering, Design, Content, Finance) with isolated resources
- **Wiki and Docs** — Knowledge base with rich-text editing via React Quill
- **Canvas** — Whiteboard for visual collaboration and brainstorming
- **File Management** — Upload, preview, serve, and organize files with metadata tracking
- **SOPs** — Standard operating procedure management and distribution

---

## Architecture

```
+---------------------------------------------------------------------+
|                        BROWSER (:5173)                              |
|                                                                     |
|   React 19 + Vite 8 + Redux + React Router 7 + Bootstrap 5         |
|   +----------+----------+----------+----------+--------------+      |
|   |Dashboard | Projects |   CRM    |    HR    |  Admin Panel |      |
|   |Analytics |  Tasks   |  Leads   | Payroll  |  Settings    |      |
|   |Calendar  |  Kanban  | Clients  | Hiring   |  Audit Log   |      |
|   +----------+----------+----------+----------+--------------+      |
+----------------------------+----------------------------------------+
                             | Vite Proxy (/api -> :3001)
+----------------------------v----------------------------------------+
|                    NEXT.JS API SERVER (:3001)                       |
|                                                                     |
|   40+ Route Handlers  .  JWT Middleware  .  RBAC Guards             |
|   +------------+--------------+--------------+---------------+      |
|   |   Auth     |  Projects    |    HR        |   Finance     |      |
|   |  /login    |  /projects   |  /hr         |  /payroll     |      |
|   |  /signup   |  /tasks      |  /hiring     |  /invoices    |      |
|   |  /logout   |  /calendar   |  /leaves     |  /expenses    |      |
|   +------------+--------------+--------------+---------------+      |
+----------------------------+----------------------------------------+
                             | Prisma 7 ORM
+----------------------------v----------------------------------------+
|                    POSTGRESQL 16 (Alpine)                           |
|                                                                     |
|   46 Tables  .  25 Roles (Enum)  .  UUID Primary Keys              |
|   Users . Projects . Tasks . Payrolls . Invoices . Chat . Leads    |
|   Backup/Restore Scripts  .  Docker Volume Persistence             |
+--------------------------------------------------------------------+
```

**Data flow:** Browser SPA communicates with the Next.js API server via a Vite dev proxy (or direct in production). Every API route is guarded by JWT authentication middleware and role-based access control. Prisma 7 provides type-safe, auto-generated queries against PostgreSQL 16.

---

## Tech Stack

| Layer | Technology | Purpose |
|:--|:--|:--|
| **Frontend** | React 19, Vite 8, React Router 7 | SPA with hot module reload and file-based routing |
| **UI Framework** | Bootstrap 5, React-Bootstrap, Lucide Icons | Responsive component library with dark theme |
| **State Management** | Redux + Redux Thunk | Global state with async action creators |
| **Charts** | ApexCharts + react-apexcharts | Dashboard analytics, reports, and visualizations |
| **Rich Text** | React Quill | Document and email editor |
| **Drag and Drop** | @hello-pangea/dnd | Kanban boards, widget reordering |
| **Onboarding** | React Joyride | Guided product tours for new users |
| **Backend** | Next.js 15 (API Routes) | REST API server on port 3001 |
| **ORM** | Prisma 7 + @prisma/adapter-pg | Type-safe database queries with migrations |
| **Database** | PostgreSQL 16 Alpine | Relational data store with UUID keys |
| **Auth** | jose + jsonwebtoken + bcryptjs | JWT tokens, 2FA, password hashing |
| **Email** | Nodemailer | SMTP email delivery |
| **Dates** | date-fns | Date formatting and manipulation |
| **Styles** | Sass (SCSS) | Modular stylesheet preprocessing |
| **Containers** | Docker Compose 3.8 | Multi-service orchestration |

---

## Quick Start

### Prerequisites

- **Node.js** 20+
- **PostgreSQL** 16+ (or Docker)
- **Docker** and **Docker Compose** (for containerized setup)

### Option A: Docker (Recommended)

```bash
git clone https://github.com/darshjme/knowai-erp.git
cd knowai-erp

# Start all services — PostgreSQL, Backend, Frontend
docker compose up -d

# Run migrations and seed the database (first time only)
docker exec knowai-erp-backend npx prisma migrate deploy
docker exec knowai-erp-backend npx prisma db seed

# Open http://localhost:5173
```

### Option B: Manual Setup

```bash
git clone https://github.com/darshjme/knowai-erp.git
cd knowai-erp

# Install dependencies
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# Configure environment
cp .env.example backend/.env
# Edit backend/.env with your DATABASE_URL, JWT_SECRET, and SMTP credentials

# Set up the database
cd backend
npx prisma migrate deploy
npx prisma generate
npx prisma db seed

# Start the backend (terminal 1)
npm run dev          # http://localhost:3001

# Start the frontend (terminal 2)
cd ../frontend
npm run dev          # http://localhost:5173
```

### Default Login Credentials

All seeded users share the password **`admin123`**.

| Email | Role | Department |
|:--|:--|:--|
| `admin@knowai.com` | ADMIN | Operations |
| `darsh@knowai.com` | CEO | Executive |
| `ravi@knowai.com` | CTO | Engineering |
| `priya@knowai.com` | CFO | Finance |
| `neha@knowai.com` | BRAND_FACE | Marketing |
| `anjali@knowai.com` | HR | Human Resources |
| `arjun@knowai.com` | PRODUCT_OWNER | Product |
| `aditya@knowai.com` | SR_DEVELOPER | Engineering |
| `pooja@knowai.com` | JR_DEVELOPER | Engineering |
| `kavya@knowai.com` | EDITOR | Content |
| `sanjay@knowai.com` | GRAPHIC_DESIGNER | Design |
| `vikram@knowai.com` | ACCOUNTING | Finance |
| `meera@knowai.com` | CONTENT_STRATEGIST | Content |
| `rahul@knowai.com` | BRAND_PARTNER | Marketing |
| `amit@knowai.com` | GUY | Operations |
| `deepak@knowai.com` | OFFICE_BOY | Operations |

---

## Role Hierarchy

KnowAI ERP implements **25 granular roles** with numeric permission levels. Higher values grant broader access across the platform.

```
CTO ................................................ 100
CEO ................................................  98
CFO ................................................  90
BRAND_FACE .........................................  85
ADMIN ..............................................  80
HR .................................................  78
PRODUCT_OWNER ......................................  75
BRAND_PARTNER ......................................  70
SR_ACCOUNTANT ......................................  65
SR_DEVELOPER .......................................  60
SR_GRAPHIC_DESIGNER ................................  58
SR_EDITOR ..........................................  56
SR_CONTENT_STRATEGIST ..............................  54
SR_BRAND_STRATEGIST ................................  52
SR_SCRIPT_WRITER ...................................  50
JR_ACCOUNTANT ......................................  45
JR_DEVELOPER .......................................  40
JR_GRAPHIC_DESIGNER ................................  38
JR_EDITOR ..........................................  36
JR_CONTENT_STRATEGIST ..............................  34
JR_BRAND_STRATEGIST ................................  32
JR_SCRIPT_WRITER ...................................  30
DRIVER .............................................  20
GUY ................................................  15
OFFICE_BOY .........................................  10
```

Every API route and frontend component checks the requesting user's role level before granting access. Role enforcement is handled at the middleware layer, ensuring consistent authorization across all 40+ endpoints.

---

## API Reference

All endpoints are served under `/api/` by Next.js route handlers. Authentication is via `Bearer <JWT>` header.

Full documentation is available at [`docs/API-REFERENCE.md`](docs/API-REFERENCE.md).

### Authentication

| Method | Endpoint | Description |
|:--|:--|:--|
| `POST` | `/api/auth/login` | Authenticate user, returns JWT |
| `POST` | `/api/auth/signup` | Register new user |
| `POST` | `/api/auth/logout` | Invalidate session |

### Core Modules

| Method | Endpoint | Description |
|:--|:--|:--|
| `GET/POST` | `/api/dashboard` | Dashboard stats and widgets |
| `GET/POST` | `/api/team` | Team members CRUD |
| `GET/POST` | `/api/notifications` | User notifications |
| `GET/POST` | `/api/settings` | System settings |
| `GET/PUT` | `/api/settings/preferences` | User preferences |
| `GET/POST` | `/api/favorites` | User favorites |

### Project Management

| Method | Endpoint | Description |
|:--|:--|:--|
| `GET/POST` | `/api/projects` | Projects CRUD |
| `GET/POST` | `/api/tasks` | Tasks with priorities and dependencies |
| `GET/POST` | `/api/calendar` | Calendar events |
| `GET/POST` | `/api/time-tracking` | Time entries and billable hours |
| `GET/POST` | `/api/goals` | OKR goal tracking |
| `GET/POST` | `/api/change-requests` | Change request workflow |

### CRM and Sales

| Method | Endpoint | Description |
|:--|:--|:--|
| `GET/POST` | `/api/clients` | Client management |
| `GET/POST` | `/api/leads` | Lead pipeline and tasks |
| `GET/POST` | `/api/contacts` | Contact directory |
| `GET/POST` | `/api/invoices` | Invoice generation (multi-currency) |
| `GET/POST` | `/api/subscriptions` | Subscription management |

### HR and People

| Method | Endpoint | Description |
|:--|:--|:--|
| `GET/POST` | `/api/hr` | HR dashboard and analytics |
| `GET` | `/api/hr/employee-analytics` | Behavioral scores and performance |
| `GET/POST` | `/api/hr/password-management` | Password resets and lockouts |
| `GET/POST` | `/api/payroll` | Salary processing and logs |
| `GET/POST` | `/api/leaves` | Leave requests and approvals |
| `GET/POST` | `/api/hiring` | Job postings, candidates, interviews |
| `GET/POST` | `/api/documents` | Employee document verification |
| `GET/POST` | `/api/complaints` | Complaint filing and escalation |
| `GET/POST` | `/api/onboarding` | Employee onboarding flow |
| `GET/POST` | `/api/expenses` | Expense submission and approval |

### Communication

| Method | Endpoint | Description |
|:--|:--|:--|
| `GET/POST` | `/api/chat` | Chat rooms, DMs, messages |
| `GET/POST` | `/api/email` | Email composition via SMTP |
| `GET` | `/api/email-dashboard` | Email analytics |
| `GET/POST` | `/api/chatbot` | AI chatbot conversations |

### Content and Workspace

| Method | Endpoint | Description |
|:--|:--|:--|
| `GET/POST` | `/api/docs` | Wiki / knowledge base |
| `GET/POST` | `/api/files` | File upload and management |
| `GET` | `/api/files/serve/[filename]` | Serve file by name |
| `GET` | `/api/files/preview/[id]` | File preview |
| `GET/POST` | `/api/canvas` | Whiteboard canvas |
| `GET/POST` | `/api/spaces` | Workspace spaces |
| `GET/POST` | `/api/sops` | Standard operating procedures |
| `GET/POST` | `/api/careers` | Public careers page |

### Security and Admin

| Method | Endpoint | Description |
|:--|:--|:--|
| `GET/POST` | `/api/credentials` | Encrypted password vault |
| `GET/POST` | `/api/audit` | Audit log entries |
| `GET/POST` | `/api/admin` | Admin panel operations |
| `GET/POST` | `/api/admin/config` | System configuration |
| `GET` | `/api/admin/stats` | System-wide statistics |
| `GET/POST` | `/api/api-keys` | API key management |
| `GET/POST` | `/api/webhooks` | Webhook CRUD |
| `POST` | `/api/webhooks/[id]/test` | Test webhook delivery |
| `GET/POST` | `/api/accountability` | Accountability alerts |

### Analytics and Reporting

| Method | Endpoint | Description |
|:--|:--|:--|
| `GET` | `/api/analytics` | Platform analytics |
| `GET` | `/api/reports` | Generated reports |
| `GET/POST` | `/api/personality-test` | MBTI personality assessment |

---

## Database Schema

**46 tables** organized across the following domains:

| Domain | Tables |
|:--|:--|
| **Identity** | User, Workspace, WorkspaceMember, Department, UserPreference, UserFavorite |
| **Projects** | Project, Task, TaskDependency, CalendarEvent, Goal, TimeEntry, Space, Canvas, Doc |
| **CRM** | Client, Lead, LeadTask, Contact, Invoice |
| **HR** | Payroll, PayrollLog, LeaveRequest, EmployeeDocument, Complaint, ComplaintTimeline |
| **Hiring** | JobPosting, JobCandidate, InterviewRound |
| **Finance** | Expense, Subscription |
| **Communication** | ChatRoom, ChatRoomMember, ChatMessage, SentEmail, Notification, ChatBotConversation, ChatBotMessage |
| **Security** | Credential, CredentialAccess, CredentialAccessLog, AuditLog, ApiKey |
| **System** | File, ChangeRequest, SystemConfig |

---

## Environment Variables

| Variable | Description | Default |
|:--|:--|:--|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/knowai_erp` |
| `JWT_SECRET` | Secret key for JWT signing | *(required)* |
| `NEXTAUTH_SECRET` | NextAuth session secret | *(required)* |
| `NEXTAUTH_URL` | Backend URL | `http://localhost:3001` |
| `SMTP_HOST` | Mail server hostname | `smtp.gmail.com` |
| `SMTP_PORT` | Mail server port | `587` |
| `SMTP_USER` | Mail username | *(optional)* |
| `SMTP_PASSWORD` | Mail password | *(optional)* |
| `NODE_ENV` | Runtime environment | `development` |
| `VITE_API_URL` | Backend API URL for frontend | `http://localhost:3001` |

---

## Database Commands

```bash
# Create a new migration
cd backend && npx prisma migrate dev --name <migration_name>

# Apply migrations (production)
cd backend && npx prisma migrate deploy

# Reset database (drops all data)
cd backend && npx prisma migrate reset

# Visual database browser -> http://localhost:5555
cd backend && npx prisma studio

# Backup database
./scripts/backup-db.sh

# Restore from backup
./scripts/restore-db.sh /backups/knowai_erp_20260317_120000.sql.gz
```

---

## Project Structure

```
knowai-erp/
├── backend/
│   ├── src/app/api/          # 40+ Next.js API route handlers
│   ├── prisma/
│   │   ├── schema.prisma     # 46-table database schema
│   │   └── seed.js           # 17 seeded users + sample data
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/            # 34+ page components
│   │   ├── components/       # Shared UI components
│   │   ├── services/         # API service layer (Axios)
│   │   ├── store/            # Redux store & slices
│   │   ├── hooks/            # Custom React hooks
│   │   └── utils/            # Helpers & constants
│   └── vite.config.js        # Vite + proxy config
├── scripts/
│   ├── backup-db.sh          # Database backup
│   ├── restore-db.sh         # Database restore
│   ├── build.sh              # Production build
│   ├── start-prod.sh         # Production start
│   └── package.sh            # Packaging script
├── docs/
│   ├── API-REFERENCE.md      # Full API documentation
│   ├── SETUP-GUIDE.md        # Installation & configuration
│   └── USER-MANUAL.md        # End-user guide
├── docker-compose.yml        # Multi-service orchestration
└── README.md
```

---

## Documentation

| Document | Description |
|:--|:--|
| [`docs/SETUP-GUIDE.md`](docs/SETUP-GUIDE.md) | Detailed installation and configuration guide |
| [`docs/API-REFERENCE.md`](docs/API-REFERENCE.md) | Full API endpoint documentation with examples |
| [`docs/USER-MANUAL.md`](docs/USER-MANUAL.md) | End-user guide for all modules |

---

## Contributing

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/your-feature`
3. **Commit** your changes: `git commit -m "feat: add your feature"`
4. **Push** to the branch: `git push origin feature/your-feature`
5. **Open** a Pull Request

Please follow the existing code style and include relevant tests for new features.

---

## License

This project is licensed under the **ISC License**. See the [LICENSE](LICENSE) file for details.

---

<div align="center">

**KnowAI ERP** — AI-Powered Enterprise Management

Built with React 19 + Next.js 15 + PostgreSQL 16 + Prisma 7

Created by **[Darshankumar Joshi](https://darshj.me)**

</div>
