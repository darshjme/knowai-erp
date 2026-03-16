# Know AI ERP - Setup Guide

Complete setup instructions for developing, testing, and deploying the Know AI ERP platform.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Clone and Install](#clone-and-install)
- [Environment Variables](#environment-variables)
- [PostgreSQL Setup](#postgresql-setup)
- [Backend Setup](#backend-setup)
- [Frontend Setup](#frontend-setup)
- [Docker Setup](#docker-setup)
- [Email Server Setup (SMTP)](#email-server-setup-smtp)
- [Production Deployment](#production-deployment)

---

## Prerequisites

Before starting, ensure you have the following software installed:

| Software       | Minimum Version | Purpose                              |
|----------------|-----------------|--------------------------------------|
| Node.js        | 20.x+           | JavaScript runtime for backend/frontend |
| npm             | 10.x+           | Package manager (ships with Node.js) |
| PostgreSQL     | 16+             | Primary database                     |
| Git            | 2.x+            | Version control                      |
| Docker (optional) | 24.x+       | Container-based deployment           |

### Verify installations

```bash
node --version    # Should print v20.x.x or higher
npm --version     # Should print 10.x.x or higher
psql --version    # Should print psql (PostgreSQL) 16.x or higher
git --version     # Should print git version 2.x.x or higher
```

---

## Clone and Install

```bash
# Clone the repository
git clone <your-repo-url> knowai-erp
cd knowai-erp

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install

# Return to project root
cd ..
```

---

## Environment Variables

Create a `.env` file in the `backend/` directory:

```bash
cp backend/.env.example backend/.env   # if .env.example exists
# Otherwise, create it manually:
touch backend/.env
```

Add the following variables to `backend/.env`:

```env
# ── Database ────────────────────────────────────────────────────
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/knowai_erp

# ── Authentication ──────────────────────────────────────────────
JWT_SECRET=your-super-secret-jwt-key-here

# ── Email (SMTP) ────────────────────────────────────────────────
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# ── Environment ─────────────────────────────────────────────────
NODE_ENV=development
```

### Variable Reference

| Variable         | Required | Description                                                                 |
|------------------|----------|-----------------------------------------------------------------------------|
| `DATABASE_URL`   | Yes      | PostgreSQL connection string. Format: `postgresql://USER:PASSWORD@HOST:PORT/DATABASE`. In development, the default is `postgresql://postgres:postgres@localhost:5432/knowai_erp`. |
| `JWT_SECRET`     | Yes      | Secret key used to sign and verify JSON Web Tokens for authentication. Must be a strong, random string. **Never commit this to version control.** |
| `SMTP_HOST`      | No       | SMTP server hostname for sending emails (e.g., `smtp.gmail.com`, `smtp.office365.com`). If not set, emails are logged to the console instead of being sent. |
| `SMTP_PORT`      | No       | SMTP server port. Common values: `587` (STARTTLS), `465` (SSL), `25` (unencrypted). Default: `587`. |
| `SMTP_USER`      | No       | SMTP authentication username. Typically your full email address.            |
| `SMTP_PASSWORD`  | No       | SMTP authentication password. For Gmail, use an App Password (not your account password). |
| `NODE_ENV`       | No       | Runtime environment. Set to `development` for local work, `production` for deployed instances. Affects cookie security (httpOnly, secure flags) and logging verbosity. Default: `development`. |

### Generating a Secure JWT_SECRET

Use OpenSSL to generate a cryptographically secure random string:

```bash
openssl rand -base64 32
```

This outputs a 32-byte base64-encoded string like `aG9sYW1lbnRlLWVzLXVuYS1idWVuYS1jbGF2ZQ==`. Copy the output and paste it as your `JWT_SECRET` value.

Alternatively, use Node.js:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## PostgreSQL Setup

### Install PostgreSQL (macOS)

```bash
# Install PostgreSQL 16 via Homebrew
brew install postgresql@16

# Start the PostgreSQL service
brew services start postgresql@16

# Verify it is running
brew services list
# You should see postgresql@16 with status "started"
```

### Install PostgreSQL (Ubuntu/Debian)

```bash
# Add PostgreSQL 16 repository
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt-get update

# Install
sudo apt-get install postgresql-16

# Start the service
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Create the Database

```bash
# Create the knowai_erp database (default postgres user)
createdb knowai_erp

# Verify it was created
psql -l | grep knowai_erp
```

If you need to create a user with a password:

```bash
# Connect to PostgreSQL
psql postgres

# Inside the psql shell:
CREATE USER knowai WITH PASSWORD 'your_password';
CREATE DATABASE knowai_erp OWNER knowai;
GRANT ALL PRIVILEGES ON DATABASE knowai_erp TO knowai;
\q
```

Then update your `DATABASE_URL` accordingly:

```env
DATABASE_URL=postgresql://knowai:your_password@localhost:5432/knowai_erp
```

---

## Backend Setup

The backend is a Next.js 15 application running on port 3001. It uses Prisma as the ORM.

### Step 1: Install Dependencies

```bash
cd backend
npm install
```

### Step 2: Generate Prisma Client

This generates the TypeScript Prisma client from the schema:

```bash
npx prisma generate
```

### Step 3: Push Schema to Database

This creates all tables in your PostgreSQL database based on the Prisma schema. It does not use migrations; it directly syncs the schema:

```bash
npx prisma db push
```

You should see output confirming that all models were created (users, projects, tasks, payrolls, etc.).

### Step 4: Seed the Database

The seed script creates a default workspace, 16 sample users (one per role), 3 projects, 12 tasks, 3 clients, and 4 leads:

```bash
node prisma/seed.js
```

Expected output:

```
Seeding database...
Cleaning existing data...
Creating workspace...
Creating users...
  Created user: Admin User (ADMIN)
  Created user: Darsh Mehta (CEO)
  Created user: Ravi Kumar (CTO)
  ...
Creating projects...
Creating tasks...
Creating clients...
Creating leads...
Seed completed successfully!

Created:
  - 1 workspace
  - 16 users (all roles)
  - 3 projects with 12 tasks
  - 3 clients
  - 4 leads

Admin login: admin@knowai.com / admin123
All users share password: admin123
```

**Default admin credentials:** `admin@knowai.com` / `admin123`

All 16 seeded users share the password `admin123`. See the User Manual for the full list of seeded users and their roles.

### Step 5: Start the Development Server

```bash
npm run dev
```

The backend starts on **http://localhost:3001**. You should see:

```
  ▲ Next.js 15.x.x
  - Local:        http://localhost:3001
```

### Optional: Prisma Studio

To browse and edit your database visually:

```bash
npx prisma studio
```

This opens a web UI at http://localhost:5555.

### Available Backend Scripts

| Command               | Description                                    |
|-----------------------|------------------------------------------------|
| `npm run dev`         | Start development server on port 3001          |
| `npm run build`       | Build for production                           |
| `npm start`           | Start production server on port 3001           |
| `npm run db:push`     | Push Prisma schema to database                 |
| `npm run db:seed`     | Run the seed script                            |
| `npm run db:studio`   | Open Prisma Studio                             |

---

## Frontend Setup

The frontend is a React 19 + Vite 8 single-page application.

### Step 1: Install Dependencies

```bash
cd frontend
npm install
```

### Step 2: Start the Development Server

```bash
npm run dev
```

The frontend starts on **http://localhost:5173**.

The Vite dev server is preconfigured to proxy all `/api` requests to `http://localhost:3001`, so the backend must be running simultaneously.

### Available Frontend Scripts

| Command           | Description                                    |
|-------------------|------------------------------------------------|
| `npm run dev`     | Start Vite dev server on port 5173             |
| `npm run build`   | Build for production (outputs to `dist/`)      |
| `npm run preview` | Preview production build locally               |
| `npm run lint`    | Run ESLint                                     |

---

## Docker Setup

Docker Compose is the simplest way to run the entire stack. It provisions three containers: PostgreSQL, Backend, and Frontend.

### Step 1: Set Environment Variables (Optional)

Create a `.env` file in the project root to override defaults:

```env
JWT_SECRET=my-super-secure-production-secret
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
NODE_ENV=production
```

If you skip this step, the `docker-compose.yml` uses built-in defaults (suitable for local testing only).

### Step 2: Build and Start

```bash
docker-compose up -d
```

This builds all three images and starts the containers:

| Container                | Port Mapping   | Description                        |
|--------------------------|----------------|------------------------------------|
| `knowai-erp-db`          | 5432:5432      | PostgreSQL 16 with `knowai_erp` database |
| `knowai-erp-backend`     | 3001:3001      | Next.js backend API                |
| `knowai-erp-frontend`    | 5173:80        | Nginx serving the built React app  |

### Step 3: Verify

```bash
# Check all containers are running
docker-compose ps

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

The application is available at:
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3001

### Step 4: Seed the Database (First Run)

After the first `docker-compose up`, run the seed script inside the backend container:

```bash
docker-compose exec backend node prisma/seed.js
```

### Step 5: Stop

```bash
docker-compose down
```

To remove all data (including the database volume):

```bash
docker-compose down -v
```

### Docker Compose Services Reference

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: knowai_erp
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck: pg_isready -U postgres -d knowai_erp

  backend:
    build: ./backend
    ports: 3001:3001
    depends_on: postgres (healthy)
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/knowai_erp

  frontend:
    build: ./frontend
    ports: 5173:80 (nginx)
    depends_on: backend
```

---

## Email Server Setup (SMTP)

Know AI ERP uses Nodemailer to send emails (invoices, leave approvals, task notifications, newsletters). If SMTP is not configured, emails are logged to the console (simulated mode).

### Gmail App Password Setup (Recommended for Development)

Gmail requires an App Password when 2-Step Verification is enabled. Regular passwords do not work.

1. **Enable 2-Step Verification on your Google Account:**
   - Go to https://myaccount.google.com/security
   - Under "How you sign in to Google," click "2-Step Verification"
   - Follow the prompts to enable it

2. **Generate an App Password:**
   - Go to https://myaccount.google.com/apppasswords
   - Select app: "Mail"
   - Select device: "Other (Custom name)" and type "KnowAI ERP"
   - Click "Generate"
   - Copy the 16-character password (e.g., `abcd efgh ijkl mnop`)

3. **Update your `.env`:**
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASSWORD=abcdefghijklmnop
   ```

   Note: Remove spaces from the App Password when pasting.

### Office365 / Outlook SMTP Settings

```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=your-email@yourdomain.com
SMTP_PASSWORD=your-password
```

For Microsoft 365 accounts with MFA enabled, you may need to create an App Password at https://mysignins.microsoft.com/security-info.

### Custom SMTP Server

```env
SMTP_HOST=mail.yourdomain.com
SMTP_PORT=587
SMTP_USER=noreply@yourdomain.com
SMTP_PASSWORD=your-smtp-password
```

Common port configurations:
- **587** - STARTTLS (recommended)
- **465** - SSL/TLS
- **25** - Unencrypted (not recommended, often blocked by ISPs)

### Testing Email Configuration

After configuring SMTP, test it by sending a custom email through the API:

```bash
# First, log in to get an auth cookie
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@knowai.com","password":"admin123"}' \
  -c cookies.txt

# Send a test email
curl -X POST http://localhost:3001/api/email \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "action": "sendCustom",
    "to": "test@example.com",
    "subject": "KnowAI ERP - SMTP Test",
    "body": "<p>If you received this, SMTP is configured correctly.</p>"
  }'
```

A successful response looks like:

```json
{
  "success": true,
  "message": "Email sent to test@example.com",
  "simulated": false
}
```

If `"simulated": true`, SMTP is not configured and the email was only logged to the server console.

---

## Production Deployment

### Frontend Deployment

The frontend builds to a static `dist/` folder that can be served by any static file server.

#### Build

```bash
cd frontend
npm run build
```

This creates a `dist/` directory with optimized HTML, CSS, and JavaScript files.

#### Deploy to Nginx

```nginx
server {
    listen 80;
    server_name erp.yourdomain.com;
    root /var/www/knowai-erp/dist;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;

    # Cache static assets for 1 year
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA fallback - serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to the backend
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### Deploy to Vercel

```bash
cd frontend
npx vercel --prod
```

When using Vercel, configure the API proxy in `vercel.json`:

```json
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://api.yourdomain.com/api/:path*" }
  ]
}
```

### Backend Deployment

#### Build and Start

```bash
cd backend
npm run build
npm start
```

The backend starts on port 3001 in production mode.

#### Process Manager (PM2)

For production, use PM2 to keep the backend running:

```bash
npm install -g pm2

cd backend
npm run build
pm2 start npm --name "knowai-erp-backend" -- start
pm2 save
pm2 startup    # Configure auto-start on system reboot
```

### Database: Production PostgreSQL

For production, use a managed PostgreSQL service or a dedicated server. Update `DATABASE_URL`:

```env
DATABASE_URL=postgresql://knowai_user:strong_password@db.yourdomain.com:5432/knowai_erp?sslmode=require
```

Key considerations:
- Enable SSL (`?sslmode=require`)
- Use a strong, unique password
- Restrict network access to your backend server's IP only
- Set up automated backups
- Use connection pooling (e.g., PgBouncer) for high traffic

### SSL/HTTPS Setup

Use Let's Encrypt with Certbot for free SSL certificates:

```bash
# Install Certbot (Ubuntu)
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d erp.yourdomain.com

# Auto-renewal is set up automatically. Test it:
sudo certbot renew --dry-run
```

### Reverse Proxy Configuration (Nginx with SSL)

Complete production Nginx configuration with SSL, the frontend, and API proxy:

```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name erp.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name erp.yourdomain.com;

    # SSL certificates (managed by Certbot)
    ssl_certificate /etc/letsencrypt/live/erp.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/erp.yourdomain.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Frontend (static files)
    root /var/www/knowai-erp/dist;
    index index.html;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;

    # Static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API proxy to backend
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
```

### Production Environment Variables

```env
# Database
DATABASE_URL=postgresql://knowai_user:strong_password@db.yourdomain.com:5432/knowai_erp?sslmode=require

# Authentication
JWT_SECRET=<output of: openssl rand -base64 32>

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@yourdomain.com
SMTP_PASSWORD=<app-password>

# Environment
NODE_ENV=production
```

### Production Checklist

- [ ] PostgreSQL is running with SSL enabled
- [ ] `DATABASE_URL` points to production database
- [ ] `JWT_SECRET` is a strong random value (not the default)
- [ ] SMTP is configured and tested
- [ ] `NODE_ENV=production` is set
- [ ] Backend is built and running via PM2 or Docker
- [ ] Frontend is built and served via Nginx
- [ ] Nginx reverse proxy is configured with SSL
- [ ] Database backups are automated
- [ ] Firewall restricts direct access to ports 3001 and 5432
- [ ] Default admin password has been changed from `admin123`
