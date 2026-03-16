<div align="center">

# Know AI ERP

### Empowering people to work with AI

The enterprise management platform that runs an entire company — from hiring to payroll, CRM to project management — in one unified system.

![React](https://img.shields.io/badge/React_19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Next.js](https://img.shields.io/badge/Next.js_15-000000?style=for-the-badge&logo=next.js&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL_16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma_7-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)

![Version](https://img.shields.io/badge/version-1.0.0-146DF7?style=for-the-badge)
![License](https://img.shields.io/badge/license-ISC-green?style=for-the-badge)
![Lines of Code](https://img.shields.io/badge/lines_of_code-56,365-blueviolet?style=for-the-badge)
![Tables](https://img.shields.io/badge/DB_tables-46-orange?style=for-the-badge)

---

[Quick Start](#-quick-start) · [Architecture](#-architecture) · [Features](#-features) · [API Reference](#-api-reference) · [Roles](#-role-hierarchy) · [Contributing](#-contributing)

</div>

---

## What is Know AI ERP?

Know AI ERP is a **full-stack enterprise resource planning platform** built for modern teams. It consolidates 20+ business functions into a single application — CRM, HR, payroll, project management, hiring, chat, email, file storage, docs, goals, time tracking, analytics, and more.

Built with **175 files** and **56,365 lines of code**, it ships with **46 PostgreSQL tables**, **40+ REST API endpoints**, **34 pages**, and a **25-role permission system** out of the box.

<!-- Add your screenshot here -->
<!-- ![Know AI ERP Dashboard](docs/screenshots/dashboard.png) -->

> **Brand Color:** `#146DF7` · **Multi-Currency:** USD, INR, HKD, CAD, GBP, AUD, AED · **17 Seeded Users** across all roles

---

## Features

| | Module | Capabilities |
|:--|:--|:--|
| **Core Engine** | Platform Foundation | React 19 + Vite 8 frontend, Next.js 15 API backend, Prisma 7 ORM, PostgreSQL 16, JWT auth, Redux state management |
| **CRM & Sales** | Clients, Leads, Invoices | Client management, lead pipeline with tasks, invoice generation with multi-currency, contact directory |
| **HR & People** | Payroll, Leaves, Hiring, Complaints | Monthly salary processing, leave requests/approvals, HireFlow (job postings, candidates, interview rounds), employee documents, complaints & escalation |
| **Project Management** | Projects, Tasks, Kanban | Project lifecycle (Planning > Active > Review > Complete), task dependencies, priority levels, assignees, time tracking, Kanban boards |
| **Communication** | Chat, Email, Calendar | Real-time chat rooms & DMs, email client with SMTP, calendar events, system notifications, AI chatbot |
| **Security** | Auth, RBAC, Vault, Audit | JWT authentication, 25-role hierarchy, encrypted password vault with access levels, full audit logging, account lockout |
| **Analytics** | Dashboard, Reports, Financial | Executive dashboard, team performance, employee behavioral analytics, expense reports, payroll logs |
| **AI & Growth** | Personality Test, Onboarding, Goals | Carl Jung MBTI personality assessment, guided onboarding tours, OKR goal tracking, accountability alerts |
| **Workspace** | Spaces, Docs, Canvas, Files | Multi-workspace (Engineering, Design, Content, Finance), wiki docs, whiteboard canvas, file management with preview |
| **Admin** | Config, Subscriptions, API Keys | System configuration, subscription management, API key provisioning, user preferences, favorites |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          BROWSER (:5173)                            │
│                                                                     │
│   React 19 + Vite 8 + Redux + React Router 7 + Bootstrap 5         │
│   ┌──────────┬──────────┬──────────┬──────────┬──────────────┐      │
│   │Dashboard │ Projects │   CRM    │    HR    │  Admin Panel │      │
│   │Analytics │  Tasks   │  Leads   │ Payroll  │  Settings    │      │
│   │Calendar  │  Kanban  │ Clients  │ Hiring   │  Audit Log   │      │
│   └──────────┴──────────┴──────────┴──────────┴──────────────┘      │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ Vite Proxy (/api → :3001)
┌──────────────────────────▼──────────────────────────────────────────┐
│                     NEXT.JS API SERVER (:3001)                       │
│                                                                      │
│   40+ Route Handlers  ·  JWT Middleware  ·  RBAC Guards              │
│   ┌────────────┬──────────────┬──────────────┬───────────────┐       │
│   │   Auth     │  Projects    │    HR        │   Finance     │       │
│   │  /login    │  /projects   │  /hr         │  /payroll     │       │
│   │  /signup   │  /tasks      │  /hiring     │  /invoices    │       │
│   │  /logout   │  /calendar   │  /leaves     │  /expenses    │       │
│   └────────────┴──────────────┴──────────────┴───────────────┘       │
└──────────────────────────┬───────────────────────────────────────────┘
                           │ Prisma 7 Client
┌──────────────────────────▼───────────────────────────────────────────┐
│                     POSTGRESQL 16 (Alpine)                            │
│                                                                       │
│   46 Tables  ·  25 Roles (Enum)  ·  UUID Primary Keys                │
│   Users · Projects · Tasks · Payrolls · Invoices · Chat · Leads      │
│   Backup/Restore Scripts  ·  Docker Volume Persistence                │
└───────────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Purpose |
|:--|:--|:--|
| **Frontend** | React 19, Vite 8, React Router 7 | SPA with hot reload, file-based routing |
| **UI** | Bootstrap 5, React-Bootstrap, Lucide Icons | Responsive component library |
| **State** | Redux + Redux Thunk | Global state management |
| **Charts** | ApexCharts + react-apexcharts | Dashboard analytics & reports |
| **Rich Text** | React Quill | Document & email editor |
| **Drag & Drop** | @hello-pangea/dnd | Kanban boards, task reordering |
| **Onboarding** | React Joyride | Guided product tours |
| **Backend** | Next.js 15 (API Routes) | REST API server on port 3001 |
| **ORM** | Prisma 7 + @prisma/adapter-pg | Type-safe database queries |
| **Database** | PostgreSQL 16 Alpine | Relational data store |
| **Auth** | jose + jsonwebtoken + bcryptjs | JWT tokens, password hashing |
| **Email** | Nodemailer | SMTP email delivery |
| **Dates** | date-fns | Date formatting & manipulation |
| **Alerts** | SweetAlert2 + React Toastify | User notifications |
| **Styles** | Sass (sass-embedded) | SCSS preprocessing |
| **Container** | Docker Compose 3.8 | Multi-service orchestration |

---

## Role Hierarchy

The system implements **25 granular roles** with numeric permission levels. Higher values grant broader access.

```
CTO ─────────────────────────────────────────────── 100
CEO ───────────────────────────────────────────── 98
CFO ─────────────────────────────────────────── 90
BRAND_FACE ────────────────────────────────── 85
ADMIN ───────────────────────────────────── 80
HR ────────────────────────────────────── 78
PRODUCT_OWNER ───────────────────────── 75
BRAND_PARTNER ─────────────────────── 70
SR_ACCOUNTANT ───────────────────── 65
SR_DEVELOPER ──────────────────── 60
SR_GRAPHIC_DESIGNER ─────────── 58
SR_EDITOR ───────────────────── 56
SR_CONTENT_STRATEGIST ─────── 54
SR_BRAND_STRATEGIST ─────── 52
SR_SCRIPT_WRITER ──────── 50
JR_ACCOUNTANT ─────────── 45
JR_DEVELOPER ────────── 40
JR_GRAPHIC_DESIGNER ── 38
JR_EDITOR ──────────── 36
JR_CONTENT_STRATEGIST  34
JR_BRAND_STRATEGIST ── 32
JR_SCRIPT_WRITER ──── 30
DRIVER ──────────── 20
GUY ─────────── 15
OFFICE_BOY ── 10
```

---

## Quick Start

### Prerequisites

- **Node.js** 20+
- **PostgreSQL** 16+ (or Docker)

### Option A: Docker (Recommended)

```bash
# Clone the repo
git clone https://github.com/darshjme/knowai-erp.git
cd knowai-erp

# Start all services (PostgreSQL + Backend + Frontend)
docker compose up -d

# Run migrations & seed (first time)
docker exec knowai-erp-backend npx prisma migrate deploy
docker exec knowai-erp-backend npx prisma db seed

# Open http://localhost:5173
```

### Option B: Manual Setup

```bash
# Clone the repo
git clone https://github.com/darshjme/knowai-erp.git
cd knowai-erp

# Install dependencies
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# Configure environment
cp .env.example backend/.env

# Set up database
cd backend
npx prisma migrate deploy
npx prisma generate
npx prisma db seed

# Start backend (terminal 1)
npm run dev          # → http://localhost:3001

# Start frontend (terminal 2)
cd ../frontend
npm run dev          # → http://localhost:5173
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

## API Reference

All endpoints are served under `/api/` by Next.js route handlers. Authentication is via `Bearer <JWT>` header.

### Authentication

| Method | Endpoint | Description |
|:--|:--|:--|
| `POST` | `/api/auth/login` | Authenticate user, returns JWT |
| `POST` | `/api/auth/signup` | Register new user |
| `POST` | `/api/auth/logout` | Invalidate session |

### Core Modules

| Method | Endpoint | Description |
|:--|:--|:--|
| `GET/POST` | `/api/dashboard` | Dashboard stats & widgets |
| `GET/POST` | `/api/team` | Team members CRUD |
| `GET/POST` | `/api/notifications` | User notifications |
| `GET/POST` | `/api/settings` | System settings |
| `GET/PUT` | `/api/settings/preferences` | User preferences |
| `GET/POST` | `/api/favorites` | User favorites |

### Project Management

| Method | Endpoint | Description |
|:--|:--|:--|
| `GET/POST` | `/api/projects` | Projects CRUD |
| `GET/POST` | `/api/tasks` | Tasks with priorities & dependencies |
| `GET/POST` | `/api/calendar` | Calendar events |
| `GET/POST` | `/api/time-tracking` | Time entries & billable hours |
| `GET/POST` | `/api/goals` | OKR goal tracking |
| `GET/POST` | `/api/change-requests` | Change request workflow |

### CRM & Sales

| Method | Endpoint | Description |
|:--|:--|:--|
| `GET/POST` | `/api/clients` | Client management |
| `GET/POST` | `/api/leads` | Lead pipeline & tasks |
| `GET/POST` | `/api/contacts` | Contact directory |
| `GET/POST` | `/api/invoices` | Invoice generation (multi-currency) |
| `GET/POST` | `/api/subscriptions` | Subscription management |

### HR & People

| Method | Endpoint | Description |
|:--|:--|:--|
| `GET/POST` | `/api/hr` | HR dashboard & analytics |
| `GET` | `/api/hr/employee-analytics` | Behavioral scores & performance |
| `GET/POST` | `/api/hr/password-management` | Password resets & lockouts |
| `GET/POST` | `/api/payroll` | Salary processing & logs |
| `GET/POST` | `/api/leaves` | Leave requests & approvals |
| `GET/POST` | `/api/hiring` | Job postings, candidates, interviews |
| `GET/POST` | `/api/documents` | Employee document verification |
| `GET/POST` | `/api/complaints` | Complaint filing & escalation |
| `GET/POST` | `/api/onboarding` | Employee onboarding flow |
| `GET/POST` | `/api/expenses` | Expense submission & approval |

### Communication

| Method | Endpoint | Description |
|:--|:--|:--|
| `GET/POST` | `/api/chat` | Chat rooms, DMs, messages |
| `GET/POST` | `/api/email` | Email composition via SMTP |
| `GET` | `/api/email-dashboard` | Email analytics |
| `GET/POST` | `/api/chatbot` | AI chatbot conversations |

### Content & Workspace

| Method | Endpoint | Description |
|:--|:--|:--|
| `GET/POST` | `/api/docs` | Wiki / knowledge base |
| `GET/POST` | `/api/files` | File upload & management |
| `GET` | `/api/files/serve/[filename]` | Serve file by name |
| `GET` | `/api/files/preview/[id]` | File preview |
| `GET/POST` | `/api/canvas` | Whiteboard canvas |
| `GET/POST` | `/api/spaces` | Workspace spaces |
| `GET/POST` | `/api/sops` | Standard operating procedures |
| `GET/POST` | `/api/careers` | Public careers page |

### Security & Admin

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

### Analytics & Reporting

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

# Visual database browser → http://localhost:5555
cd backend && npx prisma studio

# Backup database
./scripts/backup-db.sh

# Restore from backup
./scripts/restore-db.sh /backups/knowai_erp_20260317_120000.sql.gz
```

---

## Screenshots

<!-- Replace with actual screenshots -->

| Dashboard | Projects | CRM |
|:-:|:-:|:-:|
| *Dashboard view* | *Project management* | *Client pipeline* |

| HR & Payroll | Chat | Admin Panel |
|:-:|:-:|:-:|
| *Payroll processing* | *Team messaging* | *System config* |

---

## Documentation

| Document | Description |
|:--|:--|
| [`docs/SETUP-GUIDE.md`](docs/SETUP-GUIDE.md) | Detailed installation & configuration |
| [`docs/API-REFERENCE.md`](docs/API-REFERENCE.md) | Full API endpoint documentation |
| [`docs/USER-MANUAL.md`](docs/USER-MANUAL.md) | End-user guide for all modules |

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
│   │   ├── pages/            # 34 page components
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
├── docs/                     # Documentation
├── docker-compose.yml        # Multi-service orchestration
└── README.md
```

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

<sub>Built with React 19, Next.js 15, PostgreSQL 16, and Prisma 7</sub>

<sub>Developed with [Claude Code](https://claude.ai/code) by Anthropic</sub>

**[Know AI](https://knowai.com)** · Empowering people to work with AI

</div>
