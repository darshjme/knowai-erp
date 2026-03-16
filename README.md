# Know AI ERP

Internal ERP system built with Next.js (backend API), React + Vite (frontend), PostgreSQL, and Prisma ORM.

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 16+
- Docker & Docker Compose (optional)

### Docker Setup (Recommended)

1. Clone the repository and copy the environment file:

```bash
cp .env.example .env
```

2. Start all services:

```bash
docker compose up -d
```

This starts:
- **PostgreSQL** on port `5432`
- **Backend API** on port `3001`
- **Frontend** on port `5173`

3. Run database migrations (first time only):

```bash
docker exec knowai-erp-backend npx prisma migrate deploy
```

4. Seed the database (optional):

```bash
docker exec knowai-erp-backend npx prisma db seed
```

5. Open `http://localhost:5173` in your browser.

To stop:

```bash
docker compose down
```

To stop and remove all data:

```bash
docker compose down -v
```

### Manual Setup

1. Install dependencies:

```bash
cd backend && npm install
cd ../frontend && npm install
```

2. Configure environment:

```bash
cp .env.example backend/.env
```

3. Set up the database:

```bash
cd backend
npx prisma migrate deploy
npx prisma generate
```

4. Start the backend:

```bash
cd backend
npx next dev -p 3001
```

5. Start the frontend (in a separate terminal):

```bash
cd frontend
npm run dev
```

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/knowai_erp` |
| `JWT_SECRET` | Secret key for JWT token signing | (required) |
| `NEXTAUTH_SECRET` | NextAuth.js session secret | (required) |
| `NEXTAUTH_URL` | Backend URL for NextAuth | `http://localhost:3001` |
| `SMTP_HOST` | SMTP server hostname | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP server port | `587` |
| `SMTP_USER` | SMTP username/email | (optional) |
| `SMTP_PASSWORD` | SMTP password or app password | (optional) |
| `NODE_ENV` | Runtime environment | `development` |
| `VITE_API_URL` | Backend API URL for frontend | `http://localhost:3001` |

## Database Commands

### Migrations

```bash
# Create a new migration
cd backend && npx prisma migrate dev --name <migration_name>

# Apply pending migrations (production)
cd backend && npx prisma migrate deploy

# Reset database (drops all data)
cd backend && npx prisma migrate reset
```

### Prisma Studio

```bash
cd backend && npx prisma studio
```

Opens a visual database browser at `http://localhost:5555`.

### Backup & Restore

Backup the database (inside Docker or with local PostgreSQL):

```bash
# Run backup (saves to /backups/ with timestamp, keeps last 30)
./scripts/backup-db.sh

# Via Docker
docker exec knowai-erp-db /backups/backup-db.sh
```

Restore from a backup:

```bash
# List available backups and restore
./scripts/restore-db.sh /backups/knowai_erp_20260317_120000.sql.gz
```

## Available Roles

The system supports 16 user roles with hierarchical permissions:

| Role | Description |
|---|---|
| `CEO` | Full system access, company oversight |
| `CTO` | Technical leadership, full dev access |
| `CFO` | Financial oversight, payroll, invoices |
| `BRAND_FACE` | Brand representation, content approval |
| `ADMIN` | System administration, user management |
| `HR` | Human resources, hiring, leave management |
| `ACCOUNTING` | Financial records, expenses, payroll |
| `PRODUCT_OWNER` | Product roadmap, project management |
| `CONTENT_STRATEGIST` | Content planning and strategy |
| `BRAND_PARTNER` | External brand partnerships |
| `SR_DEVELOPER` | Senior development, code reviews |
| `EDITOR` | Content editing and publishing |
| `GRAPHIC_DESIGNER` | Design assets and branding |
| `JR_DEVELOPER` | Junior development tasks |
| `GUY` | General staff member (default role) |
| `OFFICE_BOY` | Office support operations |

## API Overview

The backend exposes REST API endpoints under `/api/`. All routes are served by Next.js API route handlers.

### Core Modules

- **Auth** - Login, registration, JWT token management
- **Users** - User CRUD, profile management, status updates
- **Projects** - Project lifecycle management with status tracking
- **Tasks** - Task management with priorities, dependencies, and assignments
- **Calendar** - Event scheduling and calendar views
- **Contacts** - Client/partner/vendor contact directory
- **Files** - File and folder management
- **Chat** - Real-time messaging with rooms and DMs
- **Notifications** - System and user notifications

### HR & Finance

- **Payroll** - Monthly salary processing, payment logs, attendance
- **Leave** - Leave requests, approvals, and tracking
- **Expenses** - Expense submission, approval workflow, reimbursements
- **Invoices** - Invoice generation, tracking, and client billing
- **Employee Documents** - Document upload, verification workflow

### Organization

- **Workspaces** - Multi-workspace support (Engineering, Design, Content, etc.)
- **Spaces** - Project groupings within workspaces
- **Goals/OKRs** - Objective tracking with key results
- **Time Tracking** - Billable hours and time entries
- **Canvases** - Whiteboard/canvas collaboration
- **Docs/Wiki** - Internal documentation and knowledge base

### Operations

- **Clients** - Client relationship management
- **Leads** - Sales pipeline and lead tracking
- **Hiring (HireFlow)** - Job postings, candidates, interview rounds
- **Complaints** - Internal complaint filing and escalation
- **Credentials** - Encrypted password/credential vault
- **Audit Logs** - System-wide activity tracking
- **Sent Emails** - Email tracking and history
- **Chatbot** - AI assistant conversations
- **User Preferences** - Per-user dashboard, theme, and notification settings
