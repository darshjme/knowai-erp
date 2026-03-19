<div align="center">

<!-- HERO BANNER -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 180" width="800" height="180">
  <defs>
    <linearGradient id="heroBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0d1117"/>
      <stop offset="50%" style="stop-color:#101820"/>
      <stop offset="100%" style="stop-color:#161b22"/>
    </linearGradient>
    <linearGradient id="titleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#0066FF">
        <animate attributeName="stop-color" values="#0066FF;#1a8cff;#0066FF" dur="5s" repeatCount="indefinite"/>
      </stop>
      <stop offset="100%" style="stop-color:#003399">
        <animate attributeName="stop-color" values="#003399;#0055cc;#003399" dur="5s" repeatCount="indefinite"/>
      </stop>
    </linearGradient>
    <linearGradient id="accentLine" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#0066FF" stop-opacity="0"/>
      <stop offset="50%" style="stop-color:#0066FF" stop-opacity="0.8"/>
      <stop offset="100%" style="stop-color:#003399" stop-opacity="0"/>
    </linearGradient>
    <pattern id="gridPat" width="40" height="40" patternUnits="userSpaceOnUse">
      <rect width="40" height="40" fill="none"/>
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#21262d" stroke-width="0.5">
        <animate attributeName="stroke-opacity" values="0.2;0.5;0.2" dur="8s" repeatCount="indefinite"/>
      </path>
    </pattern>
    <pattern id="dotPat" width="50" height="50" patternUnits="userSpaceOnUse">
      <circle cx="25" cy="25" r="0.8" fill="#0066FF" opacity="0.12">
        <animate attributeName="opacity" values="0.08;0.22;0.08" dur="6s" repeatCount="indefinite"/>
      </circle>
    </pattern>
    <filter id="glow">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <!-- Background layers -->
  <rect width="800" height="180" fill="url(#heroBg)" rx="12"/>
  <rect width="800" height="180" fill="url(#gridPat)" rx="12"/>
  <rect width="800" height="180" fill="url(#dotPat)" rx="12"/>
  <!-- Geometric dashboard shapes - left -->
  <rect x="60" y="110" width="8" height="28" rx="2" fill="#0066FF" opacity="0.08">
    <animate attributeName="height" values="28;38;28" dur="4s" repeatCount="indefinite"/>
    <animate attributeName="y" values="110;100;110" dur="4s" repeatCount="indefinite"/>
  </rect>
  <rect x="72" y="100" width="8" height="38" rx="2" fill="#0066FF" opacity="0.1">
    <animate attributeName="height" values="38;22;38" dur="5s" repeatCount="indefinite"/>
    <animate attributeName="y" values="100;116;100" dur="5s" repeatCount="indefinite"/>
  </rect>
  <rect x="84" y="105" width="8" height="33" rx="2" fill="#003399" opacity="0.08">
    <animate attributeName="height" values="33;42;33" dur="6s" repeatCount="indefinite"/>
    <animate attributeName="y" values="105;96;105" dur="6s" repeatCount="indefinite"/>
  </rect>
  <rect x="96" y="115" width="8" height="23" rx="2" fill="#0066FF" opacity="0.06">
    <animate attributeName="height" values="23;35;23" dur="3.5s" repeatCount="indefinite"/>
    <animate attributeName="y" values="115;103;115" dur="3.5s" repeatCount="indefinite"/>
  </rect>
  <!-- Geometric shapes - right -->
  <rect x="640" y="28" width="52" height="36" rx="5" fill="none" stroke="#0066FF" stroke-width="0.7" opacity="0.15">
    <animate attributeName="opacity" values="0.1;0.25;0.1" dur="7s" repeatCount="indefinite"/>
  </rect>
  <rect x="700" y="42" width="42" height="52" rx="5" fill="none" stroke="#003399" stroke-width="0.7" opacity="0.12">
    <animate attributeName="opacity" values="0.08;0.2;0.08" dur="5.5s" repeatCount="indefinite"/>
  </rect>
  <rect x="660" y="78" width="62" height="28" rx="5" fill="none" stroke="#0066FF" stroke-width="0.6" opacity="0.1">
    <animate attributeName="opacity" values="0.06;0.18;0.06" dur="9s" repeatCount="indefinite"/>
  </rect>
  <!-- Node connections -->
  <circle cx="730" cy="24" r="2.5" fill="#0066FF" opacity="0.18"/>
  <circle cx="760" cy="38" r="2" fill="#003399" opacity="0.15"/>
  <line x1="730" y1="24" x2="760" y2="38" stroke="#0066FF" stroke-width="0.4" opacity="0.12"/>
  <circle cx="748" cy="58" r="1.8" fill="#0066FF" opacity="0.12"/>
  <line x1="760" y1="38" x2="748" y2="58" stroke="#003399" stroke-width="0.4" opacity="0.1"/>
  <!-- Floating hexagon left -->
  <polygon points="40,40 50,34 60,40 60,52 50,58 40,52" fill="none" stroke="#0066FF" stroke-width="0.5" opacity="0.1">
    <animate attributeName="opacity" values="0.06;0.15;0.06" dur="10s" repeatCount="indefinite"/>
  </polygon>
  <!-- Title -->
  <text x="400" y="72" font-family="'Segoe UI','Helvetica Neue',Arial,sans-serif" font-size="54" font-weight="800" fill="url(#titleGrad)" text-anchor="middle" letter-spacing="-1.5" filter="url(#glow)">KnowAI<tspan font-weight="300" fill="#c9d1d9" letter-spacing="2"> ERP</tspan></text>
  <!-- Subtitle -->
  <text x="400" y="106" font-family="'Segoe UI','Helvetica Neue',Arial,sans-serif" font-size="15" fill="#8b949e" text-anchor="middle" letter-spacing="4">AI-Powered Enterprise Intelligence</text>
  <!-- Accent line -->
  <rect x="280" y="120" width="240" height="1.5" rx="1" fill="url(#accentLine)">
    <animate attributeName="width" values="240;280;240" dur="6s" repeatCount="indefinite"/>
    <animate attributeName="x" values="280;260;280" dur="6s" repeatCount="indefinite"/>
  </rect>
  <!-- Version badge -->
  <rect x="340" y="134" width="120" height="24" rx="12" fill="#0d1117" stroke="#30363d" stroke-width="1"/>
  <text x="400" y="150" font-family="'Segoe UI Mono','SF Mono',monospace" font-size="10.5" fill="#8b949e" text-anchor="middle">v1.0.0 Production</text>
</svg>

<br/>

[![React 19](https://img.shields.io/badge/React_19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Next.js 15](https://img.shields.io/badge/Next.js_15-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org)
[![PostgreSQL 16](https://img.shields.io/badge/PostgreSQL_16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://postgresql.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://docker.com)
[![License: ISC](https://img.shields.io/badge/License-ISC-22c55e?style=for-the-badge)](LICENSE)

</div>

---

## What is KnowAI

**KnowAI ERP** is a production-grade, multi-tenant enterprise resource planning platform that replaces your entire SaaS stack with a single deployment. Hiring pipelines, payroll processing, CRM, project management, real-time inventory, time tracking, workflow automation, and predictive analytics -- unified under one roof with a 25-role permission hierarchy enforced across every surface.

Most companies run 12 to 15 disconnected tools. KnowAI runs one.

Built across **56,365+ lines of production code**, the platform ships with **46 PostgreSQL tables**, **40+ REST API endpoints**, **34+ fully-realized pages**, and **17 seeded users** ready to demo out of the box. Multi-currency support (USD, INR, HKD, CAD, GBP, AUD, AED), system-wide dark theme, two-factor authentication, video review workflows, and Docker-based deployment are included -- not upsold.

---

<div align="center">

<!-- STATS BAR -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 50" width="800" height="50">
  <defs>
    <linearGradient id="statPillBg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#161b22"/>
      <stop offset="100%" style="stop-color:#0d1117"/>
    </linearGradient>
    <linearGradient id="statBorder" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#0066FF"/>
      <stop offset="100%" style="stop-color:#003399"/>
    </linearGradient>
  </defs>
  <!-- Pill 1: LOC -->
  <rect x="12" y="5" width="142" height="40" rx="20" fill="url(#statPillBg)" stroke="url(#statBorder)" stroke-width="1.2"/>
  <text x="83" y="30" font-family="'Segoe UI','Helvetica Neue',Arial,sans-serif" font-size="14" font-weight="700" fill="#58a6ff" text-anchor="middle">56K+ LOC</text>
  <!-- Pill 2: Tables -->
  <rect x="168" y="5" width="142" height="40" rx="20" fill="url(#statPillBg)" stroke="url(#statBorder)" stroke-width="1.2"/>
  <text x="239" y="30" font-family="'Segoe UI','Helvetica Neue',Arial,sans-serif" font-size="14" font-weight="700" fill="#58a6ff" text-anchor="middle">46 Tables</text>
  <!-- Pill 3: APIs -->
  <rect x="324" y="5" width="142" height="40" rx="20" fill="url(#statPillBg)" stroke="url(#statBorder)" stroke-width="1.2"/>
  <text x="395" y="30" font-family="'Segoe UI','Helvetica Neue',Arial,sans-serif" font-size="14" font-weight="700" fill="#58a6ff" text-anchor="middle">40+ APIs</text>
  <!-- Pill 4: Pages -->
  <rect x="480" y="5" width="142" height="40" rx="20" fill="url(#statPillBg)" stroke="url(#statBorder)" stroke-width="1.2"/>
  <text x="551" y="30" font-family="'Segoe UI','Helvetica Neue',Arial,sans-serif" font-size="14" font-weight="700" fill="#58a6ff" text-anchor="middle">34+ Pages</text>
  <!-- Pill 5: Roles -->
  <rect x="636" y="5" width="152" height="40" rx="20" fill="url(#statPillBg)" stroke="url(#statBorder)" stroke-width="1.2"/>
  <text x="712" y="30" font-family="'Segoe UI','Helvetica Neue',Arial,sans-serif" font-size="14" font-weight="700" fill="#58a6ff" text-anchor="middle">25 Roles</text>
</svg>

</div>

---

## Platform Capabilities

<div align="center">

<!-- FEATURE GRID -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 200" width="800" height="200">
  <defs>
    <linearGradient id="featCardBg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#161b22"/>
      <stop offset="100%" style="stop-color:#0d1117"/>
    </linearGradient>
    <linearGradient id="featIconGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0066FF"/>
      <stop offset="100%" style="stop-color:#003399"/>
    </linearGradient>
  </defs>
  <!-- Row 1 -->
  <!-- Card 1: Inventory Management -->
  <rect x="10" y="8" width="245" height="82" rx="10" fill="url(#featCardBg)" stroke="#21262d" stroke-width="1"/>
  <rect x="24" y="24" width="36" height="36" rx="8" fill="url(#featIconGrad)" opacity="0.15"/>
  <rect x="33" y="32" width="18" height="3.5" rx="1" fill="#0066FF"/>
  <rect x="33" y="38" width="18" height="3.5" rx="1" fill="#0066FF" opacity="0.7"/>
  <rect x="33" y="44" width="12" height="3.5" rx="1" fill="#0066FF" opacity="0.4"/>
  <text x="72" y="39" font-family="'Segoe UI','Helvetica Neue',Arial,sans-serif" font-size="13" font-weight="700" fill="#c9d1d9">Inventory Management</text>
  <text x="72" y="56" font-family="'Segoe UI','Helvetica Neue',Arial,sans-serif" font-size="11" fill="#8b949e">Real-time stock, SKU, reorder alerts</text>
  <!-- Card 2: HR & Hiring -->
  <rect x="275" y="8" width="245" height="82" rx="10" fill="url(#featCardBg)" stroke="#21262d" stroke-width="1"/>
  <rect x="289" y="24" width="36" height="36" rx="8" fill="url(#featIconGrad)" opacity="0.15"/>
  <circle cx="303" cy="36" r="5" fill="none" stroke="#0066FF" stroke-width="1.5"/>
  <path d="M295 50 Q303 44 311 50" fill="none" stroke="#0066FF" stroke-width="1.5"/>
  <text x="337" y="39" font-family="'Segoe UI','Helvetica Neue',Arial,sans-serif" font-size="13" font-weight="700" fill="#c9d1d9">HR & Hiring</text>
  <text x="337" y="56" font-family="'Segoe UI','Helvetica Neue',Arial,sans-serif" font-size="11" fill="#8b949e">HireFlow pipeline, payroll, leaves</text>
  <!-- Card 3: Project Tracking -->
  <rect x="540" y="8" width="245" height="82" rx="10" fill="url(#featCardBg)" stroke="#21262d" stroke-width="1"/>
  <rect x="554" y="24" width="36" height="36" rx="8" fill="url(#featIconGrad)" opacity="0.15"/>
  <rect x="562" y="34" width="8" height="17" rx="2" fill="#0066FF" opacity="0.5"/>
  <rect x="573" y="29" width="8" height="22" rx="2" fill="#0066FF" opacity="0.75"/>
  <rect x="584" y="37" width="8" height="14" rx="2" fill="#0066FF" opacity="0.4"/>
  <text x="602" y="39" font-family="'Segoe UI','Helvetica Neue',Arial,sans-serif" font-size="13" font-weight="700" fill="#c9d1d9">Project Tracking</text>
  <text x="602" y="56" font-family="'Segoe UI','Helvetica Neue',Arial,sans-serif" font-size="11" fill="#8b949e">Kanban, tasks, dependencies, OKRs</text>
  <!-- Row 2 -->
  <!-- Card 4: Time Management -->
  <rect x="10" y="108" width="245" height="82" rx="10" fill="url(#featCardBg)" stroke="#21262d" stroke-width="1"/>
  <rect x="24" y="124" width="36" height="36" rx="8" fill="url(#featIconGrad)" opacity="0.15"/>
  <circle cx="42" cy="142" r="10" fill="none" stroke="#0066FF" stroke-width="1.5"/>
  <line x1="42" y1="142" x2="42" y2="135" stroke="#0066FF" stroke-width="1.5"/>
  <line x1="42" y1="142" x2="48" y2="142" stroke="#0066FF" stroke-width="1.2"/>
  <text x="72" y="139" font-family="'Segoe UI','Helvetica Neue',Arial,sans-serif" font-size="13" font-weight="700" fill="#c9d1d9">Time Management</text>
  <text x="72" y="156" font-family="'Segoe UI','Helvetica Neue',Arial,sans-serif" font-size="11" fill="#8b949e">Billable hours, entries, utilization</text>
  <!-- Card 5: AI Analytics -->
  <rect x="275" y="108" width="245" height="82" rx="10" fill="url(#featCardBg)" stroke="#21262d" stroke-width="1"/>
  <rect x="289" y="124" width="36" height="36" rx="8" fill="url(#featIconGrad)" opacity="0.15"/>
  <path d="M298 148 L305 138 L312 143 L319 132" fill="none" stroke="#0066FF" stroke-width="1.8" stroke-linecap="round"/>
  <circle cx="319" cy="132" r="2.5" fill="#0066FF"/>
  <text x="337" y="139" font-family="'Segoe UI','Helvetica Neue',Arial,sans-serif" font-size="13" font-weight="700" fill="#c9d1d9">AI Analytics</text>
  <text x="337" y="156" font-family="'Segoe UI','Helvetica Neue',Arial,sans-serif" font-size="11" fill="#8b949e">Predictive insights, performance scoring</text>
  <!-- Card 6: Role-Based Access -->
  <rect x="540" y="108" width="245" height="82" rx="10" fill="url(#featCardBg)" stroke="#21262d" stroke-width="1"/>
  <rect x="554" y="124" width="36" height="36" rx="8" fill="url(#featIconGrad)" opacity="0.15"/>
  <rect x="563" y="133" width="18" height="12" rx="3" fill="none" stroke="#0066FF" stroke-width="1.5"/>
  <circle cx="572" cy="131" r="3" fill="none" stroke="#0066FF" stroke-width="1.2"/>
  <line x1="572" y1="138" x2="572" y2="148" stroke="#0066FF" stroke-width="1.5"/>
  <text x="602" y="139" font-family="'Segoe UI','Helvetica Neue',Arial,sans-serif" font-size="13" font-weight="700" fill="#c9d1d9">Role-Based Access</text>
  <text x="602" y="156" font-family="'Segoe UI','Helvetica Neue',Arial,sans-serif" font-size="11" fill="#8b949e">25-level RBAC on every endpoint</text>
</svg>

</div>

---

## Feature Breakdown

### Core Platform
- **Multi-Tenant Architecture** -- Workspace isolation with membership controls, department segmentation, and tenant-aware data access across every module
- **25-Role Permission Hierarchy** -- Granular numeric permission levels from Office Boy (10) to CTO (100), enforced at the middleware layer across all API routes and UI surfaces
- **Widgetised Dashboard** -- Customizable executive dashboard with drag-and-drop widgets, KPI cards, department-scoped analytics, and full dark theme support
- **Two-Factor Authentication** -- Identity verification via TOTP, account lockout policies, encrypted password vault, and role-based access logs

### HireFlow Hiring Pipeline
- **End-to-End Recruitment** -- Job postings with public careers page, candidate tracking, multi-round interview scheduling, scoring rubrics, and offer management
- **Video Review Engine** -- Candidate video submission review with structured feedback, rating workflows, and hiring committee collaboration
- **Identity Verification** -- Document verification pipeline with multi-stage approval states for onboarding compliance

### Inventory and Order Management
- **Inventory Tracking** -- Real-time stock levels, reorder point alerts, SKU management, and warehouse segmentation
- **Order Lifecycle** -- Order creation, fulfillment tracking, invoice generation with multi-currency support (6 currencies), and automated status transitions

### Workflow Automation and Analytics
- **Workflow Engine** -- Automated approval chains, change request workflows, escalation rules, and accountability alerts with audit trails
- **Predictive Analytics** -- Executive dashboards, team performance scoring, employee behavioral analytics, and trend-based predictive insights
- **Conversational Assistant** -- Platform navigation, data queries, and operational support through a built-in conversational interface

### Project and Task Management
- **Full Project Lifecycle** -- Planning, Active, Review, and Complete stages with task dependencies, priority levels, and multi-assignee management
- **Kanban Boards** -- Drag-and-drop task boards with real-time state synchronization via @hello-pangea/dnd
- **Time Tracking** -- Billable hours, time entries per task, utilization reports, and project-level cost analysis
- **OKR Goal Tracking** -- Objective and key result management with progress indicators and team alignment views

### HR, Payroll, and People Operations
- **Payroll Processing** -- Monthly salary computation, payroll ledger, expense submission, and multi-currency disbursement
- **Leave Management** -- Request/approval workflows with calendar integration, balance tracking, and policy enforcement
- **Complaint and Escalation** -- Filing, timeline tracking, and resolution workflows with escalation rules
- **Personality Assessment** -- Carl Jung MBTI-based evaluation for team dynamics and hiring insights

### CRM and Sales
- **Client Management** -- Client lifecycle tracking, contact directory, relationship history, and revenue attribution
- **Lead Pipeline** -- Stage-based lead progression with associated tasks, conversion analytics, and pipeline forecasting
- **Invoice Generation** -- Multi-currency invoice creation, line items, tax computation, and export-ready formatting

### Communication and Collaboration
- **Real-Time Chat** -- Chat rooms, direct messages, and threaded conversations with presence indicators
- **Email Client** -- SMTP-based email composition, inbox management, and email analytics dashboard
- **Calendar** -- Event scheduling, team availability, and deadline tracking with project integration
- **Notification Engine** -- System-wide notifications with read/unread state management and configurable preferences

### Content and Workspace
- **Spaces** -- Multi-workspace environments (Engineering, Design, Content, Finance) with isolated resources and access controls
- **Wiki and Docs** -- Knowledge base with rich-text editing via React Quill
- **Canvas** -- Whiteboard for visual collaboration, brainstorming, and architecture planning
- **SOPs** -- Standard operating procedure management, versioning, and distribution

---

## Tech Stack

| Layer | Technology | Purpose |
|:--|:--|:--|
| **Frontend** | React 19, Vite 8, React Router 7 | SPA with hot module reload and file-based routing |
| **UI Framework** | Bootstrap 5, React-Bootstrap, Lucide Icons | Responsive component library with dark theme |
| **State** | Redux + Redux Thunk | Global state management with async action creators |
| **Charts** | ApexCharts + react-apexcharts | Dashboard analytics, reports, and real-time visualizations |
| **Rich Text** | React Quill | Document, wiki, and email editor |
| **Drag and Drop** | @hello-pangea/dnd | Kanban boards, widget reordering, dashboard customization |
| **Onboarding** | React Joyride | Guided product tours for new users |
| **Backend** | Next.js 15 (API Routes) | REST API server with route handlers on port 3001 |
| **ORM** | Prisma 7 + @prisma/adapter-pg | Type-safe database queries with migrations and seeding |
| **Database** | PostgreSQL 16 Alpine | Relational data store with UUID primary keys |
| **Auth** | jose + jsonwebtoken + bcryptjs | JWT tokens, TOTP 2FA, password hashing |
| **Email** | Nodemailer | SMTP email delivery and composition |
| **Styles** | Sass (SCSS) | Modular stylesheet preprocessing |
| **Containers** | Docker Compose 3.8 | Multi-service orchestration with volume persistence |

---

## Architecture

```
+-----------------------------------------------------------------------+
|                         BROWSER (:5173)                               |
|                                                                       |
|    React 19 + Vite 8 + Redux + React Router 7 + Bootstrap 5          |
|    +-----------+-----------+-----------+-----------+--------------+    |
|    | Dashboard | Projects  |    CRM    |    HR     |  Admin Panel |    |
|    | Analytics |  Tasks    |   Leads   |  Payroll  |  Settings    |    |
|    | Calendar  |  Kanban   |  Clients  |  Hiring   |  Audit Log   |    |
|    +-----------+-----------+-----------+-----------+--------------+    |
+-----------------------------+-----------------------------------------+
                              | Vite Proxy (/api -> :3001)
+-----------------------------v-----------------------------------------+
|                     NEXT.JS API SERVER (:3001)                        |
|                                                                       |
|    40+ Route Handlers  |  JWT Middleware  |  RBAC Guards              |
|    +------------+--------------+--------------+---------------+       |
|    |    Auth    |   Projects   |      HR      |    Finance    |       |
|    |   /login   |  /projects   |     /hr      |   /payroll    |       |
|    |  /signup   |   /tasks     |   /hiring    |  /invoices    |       |
|    |  /logout   |  /calendar   |   /leaves    |  /expenses    |       |
|    |   /2fa     |   /goals     |  /onboarding |  /subscriptions|      |
|    +------------+--------------+--------------+---------------+       |
+-----------------------------+-----------------------------------------+
                              | Prisma 7 ORM
+-----------------------------v-----------------------------------------+
|                     POSTGRESQL 16 (Alpine)                            |
|                                                                       |
|    46 Tables  |  25 Roles (Enum)  |  UUID Primary Keys               |
|    Users . Projects . Tasks . Payrolls . Invoices . Chat . Leads     |
|    Backup/Restore Scripts  |  Docker Volume Persistence              |
+-----------------------------------------------------------------------+
```

**Data flow:** The browser SPA communicates with the Next.js API server via a Vite dev proxy (or direct URL in production). Every API route is guarded by JWT authentication middleware and role-based access control. Prisma 7 provides type-safe, auto-generated queries against PostgreSQL 16 with full migration support.

### Database Schema -- 46 Tables

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

## Quick Start

### Prerequisites

- **Node.js** 20+
- **PostgreSQL** 16+ (or Docker)
- **Docker** and **Docker Compose** (for containerized setup)

### Option A: Docker (Recommended)

```bash
git clone https://github.com/darshjme/knowai-erp.git
cd knowai-erp

# Start all services -- PostgreSQL, Backend, Frontend
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

### Default Credentials

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

### Environment Variables

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

<details>
<summary><strong>Role Hierarchy -- All 25 Roles</strong></summary>

<br/>

KnowAI ERP implements **25 granular roles** with numeric permission levels. Higher values grant broader access across the platform. Every API route and frontend component checks the requesting user's role level before granting access.

| Role | Permission Level | Tier |
|:--|:--:|:--|
| CTO | 100 | Executive |
| CEO | 98 | Executive |
| CFO | 90 | Executive |
| BRAND_FACE | 85 | Leadership |
| ADMIN | 80 | Leadership |
| HR | 78 | Leadership |
| PRODUCT_OWNER | 75 | Leadership |
| BRAND_PARTNER | 70 | Management |
| SR_ACCOUNTANT | 65 | Senior |
| SR_DEVELOPER | 60 | Senior |
| SR_GRAPHIC_DESIGNER | 58 | Senior |
| SR_EDITOR | 56 | Senior |
| SR_CONTENT_STRATEGIST | 54 | Senior |
| SR_BRAND_STRATEGIST | 52 | Senior |
| SR_SCRIPT_WRITER | 50 | Senior |
| JR_ACCOUNTANT | 45 | Junior |
| JR_DEVELOPER | 40 | Junior |
| JR_GRAPHIC_DESIGNER | 38 | Junior |
| JR_EDITOR | 36 | Junior |
| JR_CONTENT_STRATEGIST | 34 | Junior |
| JR_BRAND_STRATEGIST | 32 | Junior |
| JR_SCRIPT_WRITER | 30 | Junior |
| DRIVER | 20 | Support |
| GUY | 15 | Support |
| OFFICE_BOY | 10 | Support |

Role enforcement is handled at the middleware layer, ensuring consistent authorization across all 40+ endpoints.

</details>

---

## API Reference

All endpoints are served under `/api/` by Next.js route handlers. Authentication is via `Bearer <JWT>` header. Full documentation is available at [`docs/API-REFERENCE.md`](docs/API-REFERENCE.md).

<details>
<summary><strong>Authentication</strong></summary>

| Method | Endpoint | Description |
|:--|:--|:--|
| `POST` | `/api/auth/login` | Authenticate user, returns JWT |
| `POST` | `/api/auth/signup` | Register new user |
| `POST` | `/api/auth/logout` | Invalidate session |
| `POST` | `/api/auth/two-factor` | Enable/verify TOTP 2FA |
| `POST` | `/api/auth/change-password` | Change user password |
| `POST` | `/api/auth/forgot-password` | Password reset flow |

</details>

<details>
<summary><strong>Core Modules</strong></summary>

| Method | Endpoint | Description |
|:--|:--|:--|
| `GET/POST` | `/api/dashboard` | Dashboard stats and widgets |
| `GET/POST` | `/api/team` | Team members CRUD |
| `GET/POST` | `/api/notifications` | User notifications |
| `GET/POST` | `/api/settings` | System settings |
| `GET/PUT` | `/api/settings/preferences` | User preferences |
| `GET/POST` | `/api/favorites` | User favorites |

</details>

<details>
<summary><strong>Project Management</strong></summary>

| Method | Endpoint | Description |
|:--|:--|:--|
| `GET/POST` | `/api/projects` | Projects CRUD |
| `GET/POST` | `/api/tasks` | Tasks with priorities and dependencies |
| `GET/POST` | `/api/calendar` | Calendar events |
| `GET/POST` | `/api/time-tracking` | Time entries and billable hours |
| `GET/POST` | `/api/goals` | OKR goal tracking |
| `GET/POST` | `/api/change-requests` | Change request workflow |

</details>

<details>
<summary><strong>CRM and Sales</strong></summary>

| Method | Endpoint | Description |
|:--|:--|:--|
| `GET/POST` | `/api/clients` | Client management |
| `GET/POST` | `/api/leads` | Lead pipeline and tasks |
| `GET/POST` | `/api/contacts` | Contact directory |
| `GET/POST` | `/api/invoices` | Invoice generation (multi-currency) |
| `GET/POST` | `/api/subscriptions` | Subscription management |

</details>

<details>
<summary><strong>HR and People</strong></summary>

| Method | Endpoint | Description |
|:--|:--|:--|
| `GET/POST` | `/api/hr` | HR dashboard and analytics |
| `GET` | `/api/hr/employee-analytics` | Behavioral scores and performance |
| `GET/POST` | `/api/hr/password-management` | Password resets and lockouts |
| `GET/POST` | `/api/payroll` | Salary processing and logs |
| `GET/POST` | `/api/leaves` | Leave requests and approvals |
| `GET/POST` | `/api/hiring` | Job postings, candidates, interviews |
| `GET/POST` | `/api/documents` | Employee document verification |
| `GET/POST` | `/api/document-verification` | Document approval pipeline |
| `GET/POST` | `/api/complaints` | Complaint filing and escalation |
| `GET/POST` | `/api/onboarding` | Employee onboarding flow |
| `GET/POST` | `/api/expenses` | Expense submission and approval |
| `GET/POST` | `/api/video-reviews` | Video submission review workflows |

</details>

<details>
<summary><strong>Communication</strong></summary>

| Method | Endpoint | Description |
|:--|:--|:--|
| `GET/POST` | `/api/chat` | Chat rooms, DMs, messages |
| `GET/POST` | `/api/email` | Email composition via SMTP |
| `GET` | `/api/email-dashboard` | Email analytics |
| `GET/POST` | `/api/chatbot` | Conversational assistant |

</details>

<details>
<summary><strong>Content and Workspace</strong></summary>

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
| `GET/POST` | `/api/content-workspace` | Content workspace management |

</details>

<details>
<summary><strong>Security and Admin</strong></summary>

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

</details>

<details>
<summary><strong>Analytics and Reporting</strong></summary>

| Method | Endpoint | Description |
|:--|:--|:--|
| `GET` | `/api/analytics` | Platform analytics |
| `GET` | `/api/reports` | Generated reports |
| `GET/POST` | `/api/personality-test` | MBTI personality assessment |
| `GET/POST` | `/api/profile-setup` | User profile configuration |
| `GET/POST` | `/api/requests` | General request management |

</details>

---

## Contributing

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/your-feature`
3. **Commit** your changes: `git commit -m "feat: add your feature"`
4. **Push** to the branch: `git push origin feature/your-feature`
5. **Open** a Pull Request

Please follow the existing code style, maintain TypeScript strict mode, and include relevant tests for new features.

---

## License

This project is licensed under the **ISC License**. See the [LICENSE](LICENSE) file for details.

---

<div align="center">

**KnowAI ERP** -- Enterprise Intelligence, Unified

Built with React 19 + Next.js 15 + PostgreSQL 16 + Prisma 7

Created by **[Darshankumar Joshi](https://darshj.me)** -- Co-Founder, CFO & CTO

</div>
