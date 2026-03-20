const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');
const bcrypt = require('bcryptjs');

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/knowai_erp'
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const SAMPLE_USERS = [
  // ─── Executive (4) ─────────────────────────────────────────
  { firstName: 'Darsh', lastName: 'Mehta', email: 'darsh@knowai.biz', role: 'CEO', designation: 'Chief Executive Officer & Founder', department: 'Executive', salary: 250000 },
  { firstName: 'Ravi', lastName: 'Kumar', email: 'ravi@knowai.biz', role: 'CTO', designation: 'Chief Technology Officer', department: 'Engineering', salary: 200000 },
  { firstName: 'Priya', lastName: 'Sharma', email: 'priya@knowai.biz', role: 'CFO', designation: 'Chief Financial Officer', department: 'Finance', salary: 180000 },
  { firstName: 'Neha', lastName: 'Patel', email: 'neha@knowai.biz', role: 'BRAND_FACE', designation: 'Brand Ambassador & Public Face', department: 'Marketing', salary: 150000 },

  // ─── HR & Admin (3) ────────────────────────────────────────
  { firstName: 'Anjali', lastName: 'Singh', email: 'anjali@knowai.biz', role: 'HR', designation: 'HR Manager', department: 'Human Resources', salary: 75000 },
  { firstName: 'Kiran', lastName: 'Thakur', email: 'kiran@knowai.biz', role: 'ADMIN', designation: 'System Administrator / IT Admin', department: 'Operations', salary: 60000 },
  { firstName: 'Deepak', lastName: 'Yadav', email: 'deepak@knowai.biz', role: 'OFFICE_BOY', designation: 'Office Assistant / Reception', department: 'Operations', salary: 15000 },

  // ─── Engineering / AI (8) ──────────────────────────────────
  { firstName: 'Arjun', lastName: 'Reddy', email: 'arjun@knowai.biz', role: 'PRODUCT_OWNER', designation: 'Product Owner, AI Tools', department: 'Engineering', salary: 120000 },
  { firstName: 'Aditya', lastName: 'Verma', email: 'aditya@knowai.biz', role: 'SR_DEVELOPER', designation: 'Senior Full-Stack Developer (React/Next.js)', department: 'Engineering', salary: 100000 },
  { firstName: 'Harsh', lastName: 'Pandey', email: 'harsh@knowai.biz', role: 'SR_DEVELOPER', designation: 'Senior ML Engineer (Python/PyTorch)', department: 'Engineering', salary: 110000 },
  { firstName: 'Pooja', lastName: 'Mishra', email: 'pooja@knowai.biz', role: 'JR_DEVELOPER', designation: 'Junior Frontend Developer', department: 'Engineering', salary: 40000 },
  { firstName: 'Rohit', lastName: 'Chauhan', email: 'rohit@knowai.biz', role: 'JR_DEVELOPER', designation: 'Junior Backend Developer', department: 'Engineering', salary: 42000 },
  { firstName: 'Tanvi', lastName: 'Kulkarni', email: 'tanvi@knowai.biz', role: 'JR_DEVELOPER', designation: 'Junior ML / Data Engineer', department: 'Engineering', salary: 45000 },
  { firstName: 'Vivek', lastName: 'Soni', email: 'vivek@knowai.biz', role: 'SR_DEVELOPER', designation: 'Senior AI/Automation Engineer', department: 'Engineering', salary: 105000 },
  { firstName: 'Ishaan', lastName: 'Bhat', email: 'ishaan@knowai.biz', role: 'JR_DEVELOPER', designation: 'Junior DevOps / Infra Engineer', department: 'Engineering', salary: 38000 },

  // ─── Content & Video Production (10) ───────────────────────
  { firstName: 'Meera', lastName: 'Nair', email: 'meera@knowai.biz', role: 'SR_CONTENT_STRATEGIST', designation: 'Content Strategy Lead', department: 'Content', salary: 70000 },
  { firstName: 'Kavya', lastName: 'Iyer', email: 'kavya@knowai.biz', role: 'SR_EDITOR', designation: 'Senior Video Editor (Premiere Pro)', department: 'Content', salary: 65000 },
  { firstName: 'Aarav', lastName: 'Malik', email: 'aarav@knowai.biz', role: 'SR_EDITOR', designation: 'Senior Video Editor (After Effects)', department: 'Content', salary: 60000 },
  { firstName: 'Diya', lastName: 'Chopra', email: 'diya@knowai.biz', role: 'JR_EDITOR', designation: 'Junior Video Editor / Reels', department: 'Content', salary: 30000 },
  { firstName: 'Sahil', lastName: 'Bhatia', email: 'sahil@knowai.biz', role: 'JR_EDITOR', designation: 'Junior Video Editor / Shorts', department: 'Content', salary: 28000 },
  { firstName: 'Ananya', lastName: 'Desai', email: 'ananya@knowai.biz', role: 'SR_SCRIPT_WRITER', designation: 'Senior Script Writer (AI hooks, viral trends)', department: 'Content', salary: 55000 },
  { firstName: 'Nisha', lastName: 'Rajan', email: 'nisha@knowai.biz', role: 'JR_SCRIPT_WRITER', designation: 'Junior Script Writer', department: 'Content', salary: 25000 },
  { firstName: 'Ritika', lastName: 'Bansal', email: 'ritika@knowai.biz', role: 'JR_CONTENT_STRATEGIST', designation: 'Junior Content Planner / Scheduler', department: 'Content', salary: 30000 },
  { firstName: 'Zara', lastName: 'Sheikh', email: 'zara@knowai.biz', role: 'SR_CONTENT_STRATEGIST', designation: 'Trend Researcher (AI Viral Content)', department: 'Content', salary: 60000 },
  { firstName: 'Manish', lastName: 'Rawat', email: 'manish@knowai.biz', role: 'GUY', designation: 'Video Thumbnail / Caption Designer', department: 'Content', salary: 28000 },

  // ─── Design (3) ────────────────────────────────────────────
  { firstName: 'Sanjay', lastName: 'Das', email: 'sanjay@knowai.biz', role: 'SR_GRAPHIC_DESIGNER', designation: 'Lead Designer / Brand', department: 'Design', salary: 65000 },
  { firstName: 'Swati', lastName: 'Pawar', email: 'swati@knowai.biz', role: 'JR_GRAPHIC_DESIGNER', designation: 'Junior UI/UX Designer', department: 'Design', salary: 35000 },
  { firstName: 'Kunal', lastName: 'Mehta', email: 'kunal@knowai.biz', role: 'JR_GRAPHIC_DESIGNER', designation: 'Junior Motion Graphics Designer', department: 'Design', salary: 32000 },

  // ─── Sales & Marketing (5) ─────────────────────────────────
  { firstName: 'Rahul', lastName: 'Gupta', email: 'rahul@knowai.biz', role: 'BRAND_PARTNER', designation: 'Partnership Manager', department: 'Sales', salary: 80000 },
  { firstName: 'Tanya', lastName: 'Oberoi', email: 'tanya@knowai.biz', role: 'SR_BRAND_STRATEGIST', designation: 'Senior Brand Strategist', department: 'Sales', salary: 72000 },
  { firstName: 'Yash', lastName: 'Agarwal', email: 'yash@knowai.biz', role: 'JR_BRAND_STRATEGIST', designation: 'Junior Sales / Lead Gen', department: 'Sales', salary: 35000 },
  { firstName: 'Simran', lastName: 'Kaur', email: 'simran@knowai.biz', role: 'GUY', designation: 'Sales Coordinator', department: 'Sales', salary: 30000 },
  { firstName: 'Gaurav', lastName: 'Khanna', email: 'gaurav@knowai.biz', role: 'GUY', designation: 'Client Success Manager', department: 'Sales', salary: 45000 },

  // ─── Finance (3) ───────────────────────────────────────────
  { firstName: 'Vikram', lastName: 'Joshi', email: 'vikram@knowai.biz', role: 'SR_ACCOUNTANT', designation: 'Senior Accountant', department: 'Finance', salary: 70000 },
  { firstName: 'Ritu', lastName: 'Agrawal', email: 'ritu@knowai.biz', role: 'JR_ACCOUNTANT', designation: 'Junior Accountant', department: 'Finance', salary: 32000 },
  { firstName: 'Pranav', lastName: 'Saxena', email: 'pranav@knowai.biz', role: 'GUY', designation: 'Billing / Invoice Coordinator', department: 'Finance', salary: 28000 },

  // ─── Operations (1) ────────────────────────────────────────
  { firstName: 'Ramesh', lastName: 'Patil', email: 'ramesh@knowai.biz', role: 'DRIVER', designation: 'Company Driver', department: 'Operations', salary: 18000 },
];

async function main() {
  console.log('Seeding Know AI ERP...');

  // Clean - delete in dependency order
  console.log('Cleaning existing data...');
  const tables = [
    'complaint_timelines', 'complaints', 'chat_messages', 'chat_room_members', 'chat_rooms',
    'chatbot_messages', 'chatbot_conversations', 'notification', 'sent_emails',
    'time_entries', 'task_dependencies', 'lead_tasks', 'tasks', 'projects',
    'payroll_logs', 'payrolls', 'leave_requests', 'employee_documents',
    'expenses', 'invoices', 'leads', 'clients', 'contacts',
    'interview_rounds', 'job_candidates', 'job_postings',
    'calendar_events', 'files', 'goals', 'docs', 'canvases', 'spaces',
    'credentials', 'api_keys', 'audit_logs', 'user_favorites', 'user_preferences',
    'users', 'workspaces'
  ];
  for (const t of tables) {
    try { await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${t}" CASCADE`); } catch(e) {}
  }

  // Create workspace
  const workspace = await prisma.workspace.create({
    data: { name: 'Know AI', type: 'DEFAULT' }
  });
  console.log('Workspace created:', workspace.name);

  // Hash password
  const hash = await bcrypt.hash('admin123', 12);

  // Create users
  const userMap = {};
  for (const u of SAMPLE_USERS) {
    const companyEmail = `${u.firstName.toLowerCase()}.${u.lastName.toLowerCase()}@knowai.biz`;
    const user = await prisma.user.create({
      data: {
        email: u.email,
        password: hash,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        designation: u.designation,
        department: u.department,
        salary: u.salary ? u.salary * 100 : null,
        workspaceId: workspace.id,
        status: 'ONLINE',
        companyEmail,
        onboardingComplete: true,
        onboardingStep: 3,
        profileComplete: true,
      }
    });
    userMap[u.email] = user;
    console.log(`  Created ${u.role}: ${u.firstName} ${u.lastName} (${u.email})`);
  }

  // ─── Shortcuts for user references ──────────────────────────
  const ceo = userMap['darsh@knowai.biz'];
  const cto = userMap['ravi@knowai.biz'];
  const cfo = userMap['priya@knowai.biz'];
  const brandFace = userMap['neha@knowai.biz'];
  const hr = userMap['anjali@knowai.biz'];
  const admin = userMap['kiran@knowai.biz'];
  const officeBoy = userMap['deepak@knowai.biz'];
  const po = userMap['arjun@knowai.biz'];
  const srDevAditya = userMap['aditya@knowai.biz'];
  const srDevHarsh = userMap['harsh@knowai.biz'];
  const jrDevPooja = userMap['pooja@knowai.biz'];
  const jrDevRohit = userMap['rohit@knowai.biz'];
  const jrDevTanvi = userMap['tanvi@knowai.biz'];
  const srDevVivek = userMap['vivek@knowai.biz'];
  const jrDevIshaan = userMap['ishaan@knowai.biz'];
  const contentMeera = userMap['meera@knowai.biz'];
  const editorKavya = userMap['kavya@knowai.biz'];
  const editorAarav = userMap['aarav@knowai.biz'];
  const jrEditorDiya = userMap['diya@knowai.biz'];
  const jrEditorSahil = userMap['sahil@knowai.biz'];
  const scriptAnanya = userMap['ananya@knowai.biz'];
  const scriptNisha = userMap['nisha@knowai.biz'];
  const contentRitika = userMap['ritika@knowai.biz'];
  const contentZara = userMap['zara@knowai.biz'];
  const thumbnailManish = userMap['manish@knowai.biz'];
  const designerSanjay = userMap['sanjay@knowai.biz'];
  const designerSwati = userMap['swati@knowai.biz'];
  const designerKunal = userMap['kunal@knowai.biz'];
  const salesRahul = userMap['rahul@knowai.biz'];
  const salesTanya = userMap['tanya@knowai.biz'];
  const salesYash = userMap['yash@knowai.biz'];
  const salesSimran = userMap['simran@knowai.biz'];
  const salesGaurav = userMap['gaurav@knowai.biz'];
  const accountVikram = userMap['vikram@knowai.biz'];
  const accountRitu = userMap['ritu@knowai.biz'];
  const billingPranav = userMap['pranav@knowai.biz'];
  const driverRamesh = userMap['ramesh@knowai.biz'];

  // ─── PROJECTS (8) ──────────────────────────────────────────
  const project1 = await prisma.project.create({
    data: {
      name: 'Zeel.ai Platform v3.0',
      description: 'Main AI SaaS platform - next-gen AI tools suite with agent framework, RAG pipelines, and multi-modal capabilities',
      status: 'ACTIVE',
      progress: 60,
      managerId: po.id,
      workspaceId: workspace.id,
      dueDate: new Date('2026-06-30'),
      members: [cto.id, srDevAditya.id, srDevHarsh.id, srDevVivek.id, jrDevPooja.id, jrDevRohit.id, jrDevTanvi.id, jrDevIshaan.id],
    }
  });

  const project2 = await prisma.project.create({
    data: {
      name: 'AI Video Automation Engine',
      description: 'Auto-generate short-form video from text/prompt using AI - integrates Sora, Runway, and custom models',
      status: 'ACTIVE',
      progress: 35,
      managerId: srDevVivek.id,
      workspaceId: workspace.id,
      dueDate: new Date('2026-08-15'),
      members: [srDevHarsh.id, jrDevTanvi.id, editorKavya.id, editorAarav.id, scriptAnanya.id],
    }
  });

  const project3 = await prisma.project.create({
    data: {
      name: 'Client: TechVista AI Integration',
      description: 'Custom AI chatbot for TechVista using GPT-4o with RAG pipeline on their knowledge base',
      status: 'ACTIVE',
      progress: 75,
      managerId: po.id,
      workspaceId: workspace.id,
      dueDate: new Date('2026-04-30'),
      members: [srDevAditya.id, jrDevRohit.id, salesGaurav.id],
    }
  });

  const project4 = await prisma.project.create({
    data: {
      name: 'Client: MediCare Health AI',
      description: 'Patient triage AI system for healthcare - symptom analysis, appointment routing, and preliminary assessment',
      status: 'ACTIVE',
      progress: 40,
      managerId: srDevHarsh.id,
      workspaceId: workspace.id,
      dueDate: new Date('2026-07-31'),
      members: [srDevVivek.id, jrDevTanvi.id, jrDevRohit.id],
    }
  });

  const project5 = await prisma.project.create({
    data: {
      name: '100 Reels Challenge - March 2026',
      description: 'Monthly viral content production goal - AI trends, product demos, behind-the-scenes, and educational shorts',
      status: 'ACTIVE',
      progress: 80,
      managerId: contentMeera.id,
      workspaceId: workspace.id,
      dueDate: new Date('2026-03-31'),
      members: [editorKavya.id, editorAarav.id, jrEditorDiya.id, jrEditorSahil.id, scriptAnanya.id, scriptNisha.id, contentRitika.id, contentZara.id, thumbnailManish.id, brandFace.id],
    }
  });

  const project6 = await prisma.project.create({
    data: {
      name: 'KnowAI ERP Internal',
      description: 'This internal ERP system - managing HR, projects, tasks, payroll, and operations',
      status: 'ACTIVE',
      progress: 90,
      managerId: cto.id,
      workspaceId: workspace.id,
      dueDate: new Date('2026-04-15'),
      members: [srDevAditya.id, jrDevPooja.id, jrDevIshaan.id, designerSwati.id],
    }
  });

  const project7 = await prisma.project.create({
    data: {
      name: 'Client: EduVerse LMS AI',
      description: 'AI-powered tutoring system for EduVerse - adaptive learning, auto-grading, and personalized content generation',
      status: 'ACTIVE',
      progress: 20,
      managerId: po.id,
      workspaceId: workspace.id,
      dueDate: new Date('2026-09-30'),
      members: [srDevHarsh.id, jrDevTanvi.id, salesGaurav.id],
    }
  });

  const project8 = await prisma.project.create({
    data: {
      name: 'Brand Campaign: AI Trends Q1',
      description: 'Marketing campaign around AI viral trends - thought leadership, LinkedIn content, and brand positioning',
      status: 'COMPLETED',
      progress: 100,
      managerId: salesTanya.id,
      workspaceId: workspace.id,
      dueDate: new Date('2026-03-15'),
      members: [brandFace.id, contentMeera.id, contentZara.id, designerSanjay.id, salesRahul.id],
    }
  });

  console.log('  Created 8 projects');

  // ─── 1. TASKS (35 total across projects) ───────────────────
  const tasksData = [
    // Project 1: Zeel.ai Platform v3.0
    { title: 'Build RAG pipeline for enterprise knowledge base', description: 'Implement retrieval-augmented generation with pgvector, chunking, and semantic search for Zeel.ai v3', status: 'IN_PROGRESS', priority: 'URGENT', assigneeId: srDevHarsh.id, projectId: project1.id, dueDate: new Date('2026-04-10'), taskType: 'FEATURE' },
    { title: 'Design glassmorphism dashboard for Zeel.ai v3', description: 'Apple-inspired glassmorphism UI with frosted cards, gradient meshes, and smooth micro-animations', status: 'IN_REVIEW', priority: 'HIGH', assigneeId: designerSwati.id, projectId: project1.id, dueDate: new Date('2026-03-25'), taskType: 'FEATURE' },
    { title: 'Integrate GPT-4o API for multi-modal chat', description: 'Add vision, audio, and text support via OpenAI GPT-4o API with streaming responses', status: 'IN_PROGRESS', priority: 'HIGH', assigneeId: srDevAditya.id, projectId: project1.id, dueDate: new Date('2026-04-15'), taskType: 'FEATURE' },
    { title: 'Set up Hetzner GPU server for training', description: 'Provision Hetzner GPU cloud (RTX 4090) for LLaMA fine-tuning and model evaluation runs', status: 'COMPLETED', priority: 'URGENT', assigneeId: jrDevIshaan.id, projectId: project1.id, dueDate: new Date('2026-03-10'), taskType: 'FEATURE' },
    { title: 'Fine-tune LLaMA 3 for video scripts', description: 'QLoRA fine-tune on 50K viral video scripts dataset. Target: hook generation and CTA optimization', status: 'IN_PROGRESS', priority: 'HIGH', assigneeId: srDevHarsh.id, projectId: project1.id, dueDate: new Date('2026-04-20'), taskType: 'FEATURE' },
    { title: 'Implement agent orchestration framework', description: 'Multi-agent system with tool-use, memory, and planning capabilities for Zeel.ai platform', status: 'TODO', priority: 'HIGH', assigneeId: srDevVivek.id, projectId: project1.id, dueDate: new Date('2026-05-01'), taskType: 'FEATURE' },
    { title: 'Build real-time collaboration WebSocket layer', description: 'Socket.io based real-time sync for shared AI workspace sessions', status: 'TODO', priority: 'MEDIUM', assigneeId: jrDevRohit.id, projectId: project1.id, dueDate: new Date('2026-05-15'), taskType: 'FEATURE' },

    // Project 2: AI Video Automation Engine
    { title: 'Build text-to-video pipeline with Sora API', description: 'Integrate OpenAI Sora for automated video generation from text prompts with style controls', status: 'IN_PROGRESS', priority: 'URGENT', assigneeId: srDevVivek.id, projectId: project2.id, dueDate: new Date('2026-04-30'), taskType: 'FEATURE' },
    { title: 'Create AI avatar for brand shorts', description: 'Build a consistent AI avatar using D-ID/HeyGen for brand short-form content', status: 'TODO', priority: 'HIGH', assigneeId: editorAarav.id, projectId: project2.id, dueDate: new Date('2026-04-15'), taskType: 'FEATURE' },
    { title: 'Auto-caption generation with Whisper', description: 'OpenAI Whisper integration for automatic captions, translations, and styled subtitle overlays', status: 'COMPLETED', priority: 'MEDIUM', assigneeId: jrDevTanvi.id, projectId: project2.id, dueDate: new Date('2026-03-08'), taskType: 'FEATURE' },
    { title: 'Research Midjourney v7 for thumbnail generation', description: 'Evaluate Midjourney v7 API for automated YouTube/Instagram thumbnail generation at scale', status: 'IN_PROGRESS', priority: 'MEDIUM', assigneeId: contentZara.id, projectId: project2.id, dueDate: new Date('2026-03-28'), taskType: 'IMPROVEMENT' },

    // Project 3: Client: TechVista AI Integration
    { title: 'Integrate GPT-4o API for chatbot', description: 'Build conversational AI chatbot with context-aware responses using TechVista knowledge base', status: 'COMPLETED', priority: 'URGENT', assigneeId: srDevAditya.id, projectId: project3.id, dueDate: new Date('2026-03-01'), taskType: 'FEATURE' },
    { title: 'Build RAG pipeline for client knowledge base', description: 'Vector embeddings with pgvector, document chunking, and semantic retrieval for TechVista docs', status: 'IN_REVIEW', priority: 'HIGH', assigneeId: jrDevRohit.id, projectId: project3.id, dueDate: new Date('2026-03-20'), taskType: 'FEATURE' },
    { title: 'Deploy chatbot to TechVista staging', description: 'Dockerize and deploy to TechVista AWS environment with CI/CD pipeline', status: 'TODO', priority: 'HIGH', assigneeId: jrDevIshaan.id, projectId: project3.id, dueDate: new Date('2026-04-05'), taskType: 'FEATURE' },
    { title: 'Client UAT feedback fixes', description: 'Address feedback from TechVista user acceptance testing - 12 items in backlog', status: 'IN_PROGRESS', priority: 'MEDIUM', assigneeId: srDevAditya.id, projectId: project3.id, dueDate: new Date('2026-04-10'), taskType: 'BUG' },

    // Project 4: Client: MediCare Health AI
    { title: 'Build symptom analysis NLP model', description: 'Train a medical NLP model for symptom extraction, severity scoring, and triage classification', status: 'IN_PROGRESS', priority: 'URGENT', assigneeId: srDevHarsh.id, projectId: project4.id, dueDate: new Date('2026-05-15'), taskType: 'FEATURE' },
    { title: 'Design patient intake chatbot flow', description: 'Conversational UX for patient intake with multi-language support (Hindi/English)', status: 'TODO', priority: 'HIGH', assigneeId: srDevVivek.id, projectId: project4.id, dueDate: new Date('2026-05-01'), taskType: 'FEATURE' },
    { title: 'HIPAA compliance audit for AI pipeline', description: 'Ensure all data handling meets HIPAA requirements - encryption, access controls, audit logging', status: 'TODO', priority: 'URGENT', assigneeId: jrDevRohit.id, projectId: project4.id, dueDate: new Date('2026-04-20'), taskType: 'IMPROVEMENT' },

    // Project 5: 100 Reels Challenge
    { title: 'Edit 25 reels for Sora AI trend', description: 'Batch edit 25 short reels showcasing Sora AI capabilities with hook-first format', status: 'IN_PROGRESS', priority: 'URGENT', assigneeId: editorKavya.id, projectId: project5.id, dueDate: new Date('2026-03-22'), taskType: 'CONTENT_REVIEW' },
    { title: 'Write 30 viral hooks for AI content', description: 'Script 30 attention-grabbing hooks for AI-related shorts (first 3 seconds critical)', status: 'COMPLETED', priority: 'HIGH', assigneeId: scriptAnanya.id, projectId: project5.id, dueDate: new Date('2026-03-10'), taskType: 'CONTENT_REVIEW' },
    { title: 'Shoot BTS of AI lab for Instagram', description: 'Behind-the-scenes content of the AI team working on models, training runs, and product demos', status: 'IN_PROGRESS', priority: 'MEDIUM', assigneeId: jrEditorDiya.id, projectId: project5.id, dueDate: new Date('2026-03-25'), taskType: 'CONTENT_REVIEW' },
    { title: 'Create 15 YouTube Shorts from long-form', description: 'Repurpose podcast and demo recordings into 15 optimized vertical shorts', status: 'TODO', priority: 'HIGH', assigneeId: jrEditorSahil.id, projectId: project5.id, dueDate: new Date('2026-03-28'), taskType: 'CONTENT_REVIEW' },
    { title: 'Plan April content calendar', description: 'Draft 30-day content calendar for April with themes: AI agents, automation, product launches', status: 'TODO', priority: 'MEDIUM', assigneeId: contentRitika.id, projectId: project5.id, dueDate: new Date('2026-03-30'), taskType: 'REGULAR' },
    { title: 'Design 20 reel thumbnails batch', description: 'Canva/Figma batch design of 20 thumbnails with consistent brand template', status: 'IN_PROGRESS', priority: 'MEDIUM', assigneeId: thumbnailManish.id, projectId: project5.id, dueDate: new Date('2026-03-24'), taskType: 'CONTENT_REVIEW' },
    { title: 'Write trending audio scripts', description: 'Match top 10 trending audios with AI content angles for maximum reach', status: 'IN_PROGRESS', priority: 'HIGH', assigneeId: scriptNisha.id, projectId: project5.id, dueDate: new Date('2026-03-23'), taskType: 'CONTENT_REVIEW' },

    // Project 6: KnowAI ERP Internal
    { title: 'Build payroll auto-calculation module', description: 'Automate salary calculation with HRA, transport, bonus, deductions, and tax computation', status: 'COMPLETED', priority: 'HIGH', assigneeId: srDevAditya.id, projectId: project6.id, dueDate: new Date('2026-03-05'), taskType: 'FEATURE' },
    { title: 'Fix mobile responsive layout issues', description: 'Sidebar, tables, and modals breaking on screens below 768px', status: 'IN_PROGRESS', priority: 'MEDIUM', assigneeId: jrDevPooja.id, projectId: project6.id, dueDate: new Date('2026-03-25'), taskType: 'BUG' },
    { title: 'Set up monitoring with Grafana', description: 'Prometheus + Grafana stack for ERP health monitoring, API latency, and error tracking', status: 'TODO', priority: 'LOW', assigneeId: jrDevIshaan.id, projectId: project6.id, dueDate: new Date('2026-04-15'), taskType: 'IMPROVEMENT' },

    // Project 7: Client: EduVerse LMS AI
    { title: 'Design adaptive learning algorithm', description: 'AI-driven content difficulty adjustment based on student performance and learning patterns', status: 'TODO', priority: 'HIGH', assigneeId: srDevHarsh.id, projectId: project7.id, dueDate: new Date('2026-05-30'), taskType: 'FEATURE' },
    { title: 'Build auto-grading ML pipeline', description: 'NLP-based automated essay grading with rubric alignment and feedback generation', status: 'TODO', priority: 'MEDIUM', assigneeId: jrDevTanvi.id, projectId: project7.id, dueDate: new Date('2026-06-15'), taskType: 'FEATURE' },

    // Project 8: Brand Campaign (completed)
    { title: 'Create LinkedIn thought leadership series', description: '10-part LinkedIn post series on AI trends for Q1 - position Darsh as AI thought leader', status: 'COMPLETED', priority: 'HIGH', assigneeId: salesTanya.id, projectId: project8.id, dueDate: new Date('2026-03-10'), taskType: 'REGULAR' },
    { title: 'Design AI Trends infographic set', description: 'Set of 5 shareable infographics on AI industry trends for social media distribution', status: 'COMPLETED', priority: 'MEDIUM', assigneeId: designerSanjay.id, projectId: project8.id, dueDate: new Date('2026-03-08'), taskType: 'REGULAR' },
    { title: 'Automate invoice follow-ups with AI', description: 'Build AI-powered email automation for overdue invoice reminders with personalized tone', status: 'IN_PROGRESS', priority: 'MEDIUM', assigneeId: srDevVivek.id, projectId: project6.id, dueDate: new Date('2026-04-01'), taskType: 'FEATURE' },
    { title: 'Produce brand anthem video', description: '60-second cinematic brand video for Zeel.ai with AI-generated visuals and original score', status: 'COMPLETED', priority: 'URGENT', assigneeId: editorKavya.id, projectId: project8.id, dueDate: new Date('2026-03-05'), taskType: 'CONTENT_REVIEW' },
  ];

  const createdTasks = [];
  for (const t of tasksData) {
    const task = await prisma.task.create({
      data: { ...t, createdById: ceo.id }
    });
    createdTasks.push(task);
  }
  console.log(`  Created ${createdTasks.length} tasks`);

  // ─── 2. TASK DEPENDENCIES (5 blocking relationships) ───────
  await prisma.taskDependency.create({
    data: { blockedTaskId: createdTasks[5].id, blockingTaskId: createdTasks[0].id } // Agent framework blocked by RAG pipeline
  });
  await prisma.taskDependency.create({
    data: { blockedTaskId: createdTasks[6].id, blockingTaskId: createdTasks[2].id } // WebSocket layer blocked by GPT-4o integration
  });
  await prisma.taskDependency.create({
    data: { blockedTaskId: createdTasks[13].id, blockingTaskId: createdTasks[12].id } // Deploy blocked by RAG pipeline build
  });
  await prisma.taskDependency.create({
    data: { blockedTaskId: createdTasks[16].id, blockingTaskId: createdTasks[15].id } // Patient chatbot flow blocked by NLP model
  });
  await prisma.taskDependency.create({
    data: { blockedTaskId: createdTasks[29].id, blockingTaskId: createdTasks[28].id } // Auto-grading blocked by adaptive learning algo
  });
  console.log('  Created 5 task dependencies');

  // ─── 3. PAYROLL RECORDS (10 employees, March 2026) ─────────
  const payrollData = [
    { employeeId: ceo.id, month: 3, year: 2026, basicPay: 250000, hra: 75000, transport: 5000, bonus: 25000, deductions: 45000, totalPay: 310000, status: 'PAID', paidOn: new Date('2026-03-01'), presentDays: 22, absentDays: 0, leaveDays: 0 },
    { employeeId: cto.id, month: 3, year: 2026, basicPay: 200000, hra: 60000, transport: 5000, bonus: 15000, deductions: 38000, totalPay: 242000, status: 'PAID', paidOn: new Date('2026-03-01'), presentDays: 21, absentDays: 0, leaveDays: 1 },
    { employeeId: cfo.id, month: 3, year: 2026, basicPay: 180000, hra: 54000, transport: 4000, bonus: 10000, deductions: 32000, totalPay: 216000, status: 'PAID', paidOn: new Date('2026-03-01'), presentDays: 22, absentDays: 0, leaveDays: 0 },
    { employeeId: srDevAditya.id, month: 3, year: 2026, basicPay: 100000, hra: 30000, transport: 3000, bonus: 8000, deductions: 15000, totalPay: 126000, status: 'PAID', paidOn: new Date('2026-03-01'), presentDays: 21, absentDays: 0, leaveDays: 1 },
    { employeeId: srDevHarsh.id, month: 3, year: 2026, basicPay: 110000, hra: 33000, transport: 3000, bonus: 10000, deductions: 18000, totalPay: 138000, status: 'PAID', paidOn: new Date('2026-03-01'), presentDays: 22, absentDays: 0, leaveDays: 0 },
    { employeeId: jrDevPooja.id, month: 3, year: 2026, basicPay: 40000, hra: 12000, transport: 2000, bonus: 0, deductions: 5500, totalPay: 48500, status: 'PENDING', presentDays: 20, absentDays: 1, leaveDays: 1 },
    { employeeId: editorKavya.id, month: 3, year: 2026, basicPay: 65000, hra: 19500, transport: 2500, bonus: 5000, deductions: 9500, totalPay: 82500, status: 'PAID', paidOn: new Date('2026-03-01'), presentDays: 21, absentDays: 0, leaveDays: 1 },
    { employeeId: designerSanjay.id, month: 3, year: 2026, basicPay: 65000, hra: 19500, transport: 2500, bonus: 3000, deductions: 9000, totalPay: 81000, status: 'PENDING', presentDays: 18, absentDays: 2, leaveDays: 2 },
    { employeeId: officeBoy.id, month: 3, year: 2026, basicPay: 15000, hra: 4500, transport: 1000, bonus: 0, deductions: 1500, totalPay: 19000, status: 'PAID', paidOn: new Date('2026-03-01'), presentDays: 22, absentDays: 0, leaveDays: 0 },
    { employeeId: driverRamesh.id, month: 3, year: 2026, basicPay: 18000, hra: 5400, transport: 1500, bonus: 0, deductions: 2000, totalPay: 22900, status: 'PAID', paidOn: new Date('2026-03-01'), presentDays: 22, absentDays: 0, leaveDays: 0 },
  ];

  const createdPayrolls = [];
  for (const p of payrollData) {
    const payroll = await prisma.payroll.create({ data: p });
    createdPayrolls.push(payroll);
  }
  console.log(`  Created ${createdPayrolls.length} payroll records`);

  // ─── 4. PAYROLL LOGS (6 payment transactions) ─────────────
  await prisma.payrollLog.create({
    data: { payrollId: createdPayrolls[0].id, amount: 310000, mode: 'BANK_TRANSFER', bankRef: 'UTR2026030100101', purpose: 'salary', remarks: 'March 2026 salary - CEO', paidById: cfo.id }
  });
  await prisma.payrollLog.create({
    data: { payrollId: createdPayrolls[1].id, amount: 242000, mode: 'BANK_TRANSFER', bankRef: 'UTR2026030100102', purpose: 'salary', remarks: 'March 2026 salary - CTO', paidById: cfo.id }
  });
  await prisma.payrollLog.create({
    data: { payrollId: createdPayrolls[3].id, amount: 126000, mode: 'BANK_TRANSFER', bankRef: 'UTR2026030100104', purpose: 'salary', remarks: 'March 2026 salary', paidById: cfo.id }
  });
  await prisma.payrollLog.create({
    data: { payrollId: createdPayrolls[4].id, amount: 138000, mode: 'BANK_TRANSFER', bankRef: 'UTR2026030100105', purpose: 'salary', remarks: 'March 2026 salary', paidById: cfo.id }
  });
  await prisma.payrollLog.create({
    data: { payrollId: createdPayrolls[6].id, amount: 82500, mode: 'UPI', bankRef: 'UPI2026030100106', purpose: 'salary', remarks: 'March 2026 salary via UPI', paidById: accountVikram.id }
  });
  await prisma.payrollLog.create({
    data: { payrollId: createdPayrolls[8].id, amount: 19000, mode: 'CASH', purpose: 'salary', remarks: 'March 2026 salary - cash', paidById: accountVikram.id }
  });
  console.log('  Created 6 payroll logs');

  // ─── 5. LEAVE REQUESTS (12 requests) ──────────────────────
  const leaveData = [
    { employeeId: srDevAditya.id, type: 'PAID', status: 'APPROVED', startDate: new Date('2026-03-20'), endDate: new Date('2026-03-21'), reason: 'Family function - sister wedding in Jaipur', approverId: hr.id, approvedAt: new Date('2026-03-15') },
    { employeeId: jrDevPooja.id, type: 'SICK', status: 'APPROVED', startDate: new Date('2026-03-10'), endDate: new Date('2026-03-11'), reason: 'Fever and cold, doctor visit', approverId: hr.id, approvedAt: new Date('2026-03-10') },
    { employeeId: designerSanjay.id, type: 'PAID', status: 'PENDING', startDate: new Date('2026-03-25'), endDate: new Date('2026-03-28'), reason: 'Planned vacation to Goa with family', approverId: null },
    { employeeId: editorKavya.id, type: 'WORK_FROM_HOME', status: 'APPROVED', startDate: new Date('2026-03-18'), endDate: new Date('2026-03-18'), reason: 'Internet installation at new apartment', approverId: hr.id, approvedAt: new Date('2026-03-17') },
    { employeeId: salesRahul.id, type: 'HALF_DAY', status: 'APPROVED', startDate: new Date('2026-03-19'), endDate: new Date('2026-03-19'), reason: 'Dentist appointment in the afternoon', approverId: hr.id, approvedAt: new Date('2026-03-18') },
    { employeeId: contentMeera.id, type: 'UNPAID', status: 'REJECTED', startDate: new Date('2026-03-16'), endDate: new Date('2026-03-20'), reason: 'Personal travel plans', approverId: hr.id, rejectedAt: new Date('2026-03-14'), approverNote: 'Critical 100 Reels deadline, cannot approve extended leave during March challenge' },
    { employeeId: thumbnailManish.id, type: 'SICK', status: 'PENDING', startDate: new Date('2026-03-17'), endDate: new Date('2026-03-17'), reason: 'Migraine, unable to work today' },
    { employeeId: officeBoy.id, type: 'PAID', status: 'APPROVED', startDate: new Date('2026-03-24'), endDate: new Date('2026-03-24'), reason: 'Holi festival celebration at hometown', approverId: hr.id, approvedAt: new Date('2026-03-20') },
    { employeeId: driverRamesh.id, type: 'PAID', status: 'APPROVED', startDate: new Date('2026-03-24'), endDate: new Date('2026-03-25'), reason: 'Holi - visiting family in village near Nashik', approverId: hr.id, approvedAt: new Date('2026-03-20') },
    { employeeId: jrDevTanvi.id, type: 'WORK_FROM_HOME', status: 'APPROVED', startDate: new Date('2026-03-19'), endDate: new Date('2026-03-19'), reason: 'Gas cylinder delivery scheduled - need to be home', approverId: hr.id, approvedAt: new Date('2026-03-18') },
    { employeeId: scriptAnanya.id, type: 'HALF_DAY', status: 'APPROVED', startDate: new Date('2026-03-21'), endDate: new Date('2026-03-21'), reason: 'Parents visiting from Chennai, picking up from airport', approverId: hr.id, approvedAt: new Date('2026-03-19') },
    { employeeId: srDevHarsh.id, type: 'PAID', status: 'PENDING', startDate: new Date('2026-03-27'), endDate: new Date('2026-03-28'), reason: 'Cousin brother wedding in Lucknow', approverId: null },
  ];

  for (const l of leaveData) {
    await prisma.leaveRequest.create({ data: l });
  }
  console.log(`  Created ${leaveData.length} leave requests`);

  // ─── 6. EXPENSES (15) ─────────────────────────────────────
  const expenseData = [
    { title: 'GPU cloud credits - Hetzner (March)', amount: 45000, category: 'SOFTWARE', status: 'APPROVED', submitterId: jrDevIshaan.id, approverId: cfo.id, approvedAt: new Date('2026-03-05'), expenseDate: new Date('2026-03-01') },
    { title: 'Adobe Creative Cloud - Team (12 seats)', amount: 12000, category: 'SOFTWARE', status: 'REIMBURSED', submitterId: editorKavya.id, approverId: cfo.id, approvedAt: new Date('2026-03-03'), expenseDate: new Date('2026-03-01') },
    { title: 'OpenAI API credits (March quota)', amount: 28000, category: 'SOFTWARE', status: 'APPROVED', submitterId: srDevVivek.id, approverId: cto.id, approvedAt: new Date('2026-03-02'), expenseDate: new Date('2026-03-01') },
    { title: 'Sony ZV-E10 camera for content shoots', amount: 65000, category: 'EQUIPMENT', status: 'APPROVED', submitterId: contentMeera.id, approverId: ceo.id, approvedAt: new Date('2026-03-08'), expenseDate: new Date('2026-03-07') },
    { title: 'Ring lights and studio backdrop setup', amount: 18500, category: 'SHOOT', status: 'REIMBURSED', submitterId: jrEditorDiya.id, approverId: cfo.id, approvedAt: new Date('2026-03-06'), expenseDate: new Date('2026-03-04') },
    { title: 'Team dinner after Zeel.ai v2 launch', amount: 22000, category: 'FOOD', status: 'REIMBURSED', submitterId: po.id, approverId: cfo.id, approvedAt: new Date('2026-03-10'), expenseDate: new Date('2026-03-09') },
    { title: 'Client meeting travel - Mumbai to Pune (TechVista)', amount: 4500, category: 'TRAVEL', status: 'SUBMITTED', submitterId: salesGaurav.id, expenseDate: new Date('2026-03-14') },
    { title: 'Figma annual subscription (Team plan)', amount: 15600, category: 'SOFTWARE', status: 'APPROVED', submitterId: designerSanjay.id, approverId: cfo.id, approvedAt: new Date('2026-03-05'), expenseDate: new Date('2026-03-01') },
    { title: 'Notion Team + Slack Pro (quarterly)', amount: 9800, category: 'SOFTWARE', status: 'APPROVED', submitterId: admin.id, approverId: cfo.id, approvedAt: new Date('2026-03-04'), expenseDate: new Date('2026-03-01') },
    { title: 'Runway ML Pro subscription', amount: 8500, category: 'SOFTWARE', status: 'SUBMITTED', submitterId: srDevVivek.id, expenseDate: new Date('2026-03-12') },
    { title: 'Office stationery and pantry supplies', amount: 3200, category: 'OFFICE', status: 'DRAFT', submitterId: officeBoy.id, expenseDate: new Date('2026-03-15') },
    { title: 'Google Ads campaign - AI tools launch', amount: 50000, category: 'MARKETING', status: 'APPROVED', submitterId: salesTanya.id, approverId: ceo.id, approvedAt: new Date('2026-03-09'), expenseDate: new Date('2026-03-07') },
    { title: 'Petrol - client site visits (weekly)', amount: 3800, category: 'FUEL', status: 'REIMBURSED', submitterId: driverRamesh.id, approverId: cfo.id, approvedAt: new Date('2026-03-06'), expenseDate: new Date('2026-03-04') },
    { title: 'AC servicing for studio and server room', amount: 5500, category: 'MAINTENANCE', status: 'SUBMITTED', submitterId: officeBoy.id, expenseDate: new Date('2026-03-16') },
    { title: 'Microphone (Rode NT-USB) for podcast', amount: 11000, category: 'EQUIPMENT', status: 'APPROVED', submitterId: brandFace.id, approverId: ceo.id, approvedAt: new Date('2026-03-11'), expenseDate: new Date('2026-03-10') },
  ];

  for (const e of expenseData) {
    await prisma.expense.create({ data: e });
  }
  console.log(`  Created ${expenseData.length} expenses`);

  // ─── 7. CLIENTS (10 - AI-focused) ─────────────────────────
  const clientsData = [
    { name: 'TechVista Solutions', email: 'info@techvista.com', company: 'TechVista Solutions Pvt Ltd', industry: 'Technology / SaaS', phone: '+91 9876543210', website: 'https://techvista.com', address: '42, Electronic City, Bengaluru, Karnataka 560100' },
    { name: 'MediCare Health Systems', email: 'admin@medicarehealthai.com', company: 'MediCare Health Systems Pvt Ltd', industry: 'Healthcare', phone: '+91 9876543211', website: 'https://medicarehealthai.com', address: '7th Floor, MG Road, Bengaluru, Karnataka 560001' },
    { name: 'EduVerse Learning', email: 'info@eduverse.co.in', company: 'EduVerse Learning Pvt Ltd', industry: 'Education / EdTech', phone: '+91 9876543212', website: 'https://eduverse.co.in', address: '22, Koramangala, Bengaluru, Karnataka 560034' },
    { name: 'Bharat FinServ', email: 'contact@bharatfinserv.in', company: 'Bharat Financial Services', industry: 'Fintech', phone: '+91 9876543213', website: 'https://bharatfinserv.in', address: '101, Nariman Point, Mumbai, Maharashtra 400021' },
    { name: 'ShopKart India', email: 'tech@shopkart.in', company: 'ShopKart India Pvt Ltd', industry: 'E-Commerce', phone: '+91 9876543214', website: 'https://shopkart.in', address: '15, Sector 62, Noida, UP 201301' },
    { name: 'UrbanNest Realty', email: 'sales@urbannest.com', company: 'UrbanNest Realty', industry: 'Real Estate', phone: '+91 9876543215', website: 'https://urbannest.com', address: '88, Bandra West, Mumbai, Maharashtra 400050' },
    { name: 'MediaPulse Studios', email: 'hello@mediapulse.in', company: 'MediaPulse Studios Pvt Ltd', industry: 'Media & Entertainment', phone: '+91 9876543216', website: 'https://mediapulse.in', address: '5A, Film City Road, Goregaon, Mumbai 400065' },
    { name: 'GovTech India', email: 'projects@govtechindia.gov.in', company: 'GovTech India Initiative', industry: 'Government / Smart City', phone: '+91 9876543217', website: 'https://govtechindia.gov.in', address: 'UIDAI Campus, Aadhaar Bhawan, New Delhi 110001' },
    { name: 'AgriSense AI', email: 'info@agrisense.ai', company: 'AgriSense AI Solutions', industry: 'Agriculture / AgriTech', phone: '+91 9876543218', website: 'https://agrisense.ai', address: '12, APMC Market Road, Pune, Maharashtra 411037' },
    { name: 'CloudNine Logistics', email: 'ops@cloudninelogistics.com', company: 'CloudNine Logistics Pvt Ltd', industry: 'Logistics / Supply Chain', phone: '+91 9876543219', website: 'https://cloudninelogistics.com', address: '34, Whitefield, Bengaluru, Karnataka 560066' },
  ];

  const createdClients = [];
  for (const c of clientsData) {
    const client = await prisma.client.create({
      data: { ...c, createdById: ceo.id, workspaceId: workspace.id }
    });
    createdClients.push(client);
  }
  console.log(`  Created ${createdClients.length} clients`);

  // ─── 8. LEADS (12 across pipeline stages) ─────────────────
  const leadsData = [
    { title: 'AI Chatbot for TechVista Customer Support', value: 1500000, status: 'WON', source: 'Referral', clientId: createdClients[0].id, assigneeId: salesRahul.id, notes: 'Signed 12-month contract. Phase 1 delivered, Phase 2 in progress.' },
    { title: 'Patient Triage AI - MediCare', value: 3500000, status: 'WON', source: 'Conference', clientId: createdClients[1].id, assigneeId: salesGaurav.id, notes: 'Won at HealthTech Summit. Active development.' },
    { title: 'AI Tutoring Platform - EduVerse', value: 2000000, status: 'NEGOTIATION', source: 'LinkedIn', clientId: createdClients[2].id, assigneeId: salesRahul.id, nextFollowUp: new Date('2026-03-22'), notes: 'Pricing discussion in progress. They want phased delivery.' },
    { title: 'Fraud Detection AI - Bharat FinServ', value: 5000000, status: 'PROPOSAL', source: 'Tender Portal', clientId: createdClients[3].id, assigneeId: salesTanya.id, nextFollowUp: new Date('2026-03-25'), notes: 'Submitted RFP. Competing with 3 other vendors.' },
    { title: 'AI-powered Product Recommendations - ShopKart', value: 1800000, status: 'QUALIFIED', source: 'Cold Email', clientId: createdClients[4].id, assigneeId: salesYash.id, nextFollowUp: new Date('2026-03-21') },
    { title: 'Smart Property Valuation AI - UrbanNest', value: 800000, status: 'CONTACTED', source: 'Website', clientId: createdClients[5].id, assigneeId: salesYash.id, nextFollowUp: new Date('2026-03-23') },
    { title: 'Automated Video Generation Platform - MediaPulse', value: 4500000, status: 'PROPOSAL', source: 'Referral', clientId: createdClients[6].id, assigneeId: salesTanya.id, nextFollowUp: new Date('2026-03-24'), notes: 'They want to use our AI Video Engine as white-label.' },
    { title: 'Smart City AI Dashboard - GovTech', value: 5000000, status: 'CONTACTED', source: 'Tender Portal', clientId: createdClients[7].id, assigneeId: ceo.id, nextFollowUp: new Date('2026-03-28'), notes: 'Government tender. Deadline for submission: April 15.' },
    { title: 'Crop Disease Detection AI - AgriSense', value: 1200000, status: 'NEW', source: 'Conference', clientId: createdClients[8].id, assigneeId: null, notes: 'Met at AgriTech Expo. Very interested in computer vision.' },
    { title: 'Route Optimization AI - CloudNine Logistics', value: 2200000, status: 'NEGOTIATION', source: 'Inbound', clientId: createdClients[9].id, assigneeId: salesGaurav.id, nextFollowUp: new Date('2026-03-20'), notes: 'Want to reduce delivery costs by 15% using AI routing.' },
    { title: 'AI Voice Agent for Insurance Claims', value: 3000000, status: 'NEW', source: 'LinkedIn', assigneeId: null, notes: 'Inbound lead from LinkedIn post. Insurance company wants automated claims processing.' },
    { title: 'Automated Content Moderation - Social Platform', value: 750000, status: 'LOST', source: 'Cold Call', assigneeId: salesYash.id, notes: 'Lost to competitor. Budget was too tight for our solution.' },
  ];

  for (const l of leadsData) {
    await prisma.lead.create({
      data: { ...l, createdById: ceo.id, workspaceId: workspace.id }
    });
  }
  console.log(`  Created ${leadsData.length} leads`);

  // ─── 9. INVOICES (8 matching clients) ─────────────────────
  const invoicesData = [
    {
      invoiceNumber: 'INV-2026-001',
      clientName: 'TechVista Solutions Pvt Ltd', clientEmail: 'accounts@techvista.com', clientPhone: '+91 9876543210',
      clientAddress: '42, Electronic City, Bengaluru, Karnataka 560100',
      items: JSON.stringify([
        { description: 'GPT-4o API Integration - 40 hours', quantity: 40, rate: 5000, amount: 200000 },
        { description: 'RAG Pipeline Development', quantity: 1, rate: 300000, amount: 300000 },
        { description: 'AI Chatbot UI/UX Design', quantity: 1, rate: 100000, amount: 100000 },
      ]),
      subtotal: 600000, tax: 108000, discount: 0, total: 708000,
      status: 'PAID', paidOn: new Date('2026-02-28'), dueDate: new Date('2026-02-28'),
      createdById: accountVikram.id, clientId: createdClients[0].id,
    },
    {
      invoiceNumber: 'INV-2026-002',
      clientName: 'TechVista Solutions Pvt Ltd', clientEmail: 'accounts@techvista.com', clientPhone: '+91 9876543210',
      clientAddress: '42, Electronic City, Bengaluru, Karnataka 560100',
      items: JSON.stringify([
        { description: 'AI Chatbot Development - Phase 2', quantity: 1, rate: 400000, amount: 400000 },
        { description: 'Knowledge Base Indexing (500 docs)', quantity: 500, rate: 200, amount: 100000 },
        { description: 'Deployment & DevOps', quantity: 1, rate: 75000, amount: 75000 },
      ]),
      subtotal: 575000, tax: 103500, discount: 25000, total: 653500,
      status: 'SENT', dueDate: new Date('2026-04-15'),
      createdById: accountVikram.id, clientId: createdClients[0].id,
    },
    {
      invoiceNumber: 'INV-2026-003',
      clientName: 'MediCare Health Systems Pvt Ltd', clientEmail: 'finance@medicarehealthai.com', clientPhone: '+91 9876543211',
      clientAddress: '7th Floor, MG Road, Bengaluru, Karnataka 560001',
      items: JSON.stringify([
        { description: 'Patient Triage AI - Discovery & Research', quantity: 1, rate: 500000, amount: 500000 },
        { description: 'Medical NLP Model Training (Phase 1)', quantity: 1, rate: 350000, amount: 350000 },
        { description: 'HIPAA Compliance Consultation', quantity: 1, rate: 150000, amount: 150000 },
      ]),
      subtotal: 1000000, tax: 180000, discount: 50000, total: 1130000,
      status: 'SENT', dueDate: new Date('2026-04-30'),
      createdById: cfo.id, clientId: createdClients[1].id,
    },
    {
      invoiceNumber: 'INV-2026-004',
      clientName: 'EduVerse Learning Pvt Ltd', clientEmail: 'admin@eduverse.co.in',
      clientAddress: '22, Koramangala, Bengaluru, Karnataka 560034',
      items: JSON.stringify([
        { description: 'AI Tutoring System - Architecture & Planning', quantity: 1, rate: 200000, amount: 200000 },
        { description: 'Custom LLM Fine-tuning (Education domain)', quantity: 1, rate: 250000, amount: 250000 },
      ]),
      subtotal: 450000, tax: 81000, discount: 0, total: 531000,
      status: 'DRAFT', dueDate: new Date('2026-05-15'),
      createdById: accountVikram.id, clientId: createdClients[2].id,
    },
    {
      invoiceNumber: 'INV-2026-005',
      clientName: 'Bharat Financial Services', clientEmail: 'payments@bharatfinserv.in', clientPhone: '+91 9876543213',
      clientAddress: '101, Nariman Point, Mumbai, Maharashtra 400021',
      items: JSON.stringify([
        { description: 'Fraud Detection AI - Proof of Concept', quantity: 1, rate: 400000, amount: 400000 },
        { description: 'Data Pipeline Setup', quantity: 1, rate: 100000, amount: 100000 },
      ]),
      subtotal: 500000, tax: 90000, discount: 0, total: 590000,
      status: 'OVERDUE', dueDate: new Date('2026-03-01'),
      createdById: accountVikram.id, clientId: createdClients[3].id,
    },
    {
      invoiceNumber: 'INV-2026-006',
      clientName: 'MediaPulse Studios Pvt Ltd', clientEmail: 'accounts@mediapulse.in',
      clientAddress: '5A, Film City Road, Goregaon, Mumbai 400065',
      items: JSON.stringify([
        { description: 'Video Production - 50 reels', quantity: 50, rate: 3000, amount: 150000 },
        { description: 'AI Avatar Creation (3 characters)', quantity: 3, rate: 50000, amount: 150000 },
        { description: 'Content Strategy Consultation', quantity: 1, rate: 75000, amount: 75000 },
      ]),
      subtotal: 375000, tax: 67500, discount: 15000, total: 427500,
      status: 'PAID', paidOn: new Date('2026-03-10'), dueDate: new Date('2026-03-15'),
      createdById: accountVikram.id, clientId: createdClients[6].id,
    },
    {
      invoiceNumber: 'INV-2026-007',
      clientName: 'CloudNine Logistics Pvt Ltd', clientEmail: 'accounts@cloudninelogistics.com',
      clientAddress: '34, Whitefield, Bengaluru, Karnataka 560066',
      items: JSON.stringify([
        { description: 'Route Optimization AI - Feasibility Study', quantity: 1, rate: 200000, amount: 200000 },
        { description: 'Data Analysis & Model Prototyping', quantity: 1, rate: 150000, amount: 150000 },
      ]),
      subtotal: 350000, tax: 63000, discount: 0, total: 413000,
      status: 'SENT', dueDate: new Date('2026-04-01'),
      createdById: cfo.id, clientId: createdClients[9].id,
    },
    {
      invoiceNumber: 'INV-2026-008',
      clientName: 'ShopKart India Pvt Ltd', clientEmail: 'finance@shopkart.in',
      clientAddress: '15, Sector 62, Noida, UP 201301',
      items: JSON.stringify([
        { description: 'AI Product Recommendation Engine - Discovery', quantity: 1, rate: 150000, amount: 150000 },
      ]),
      subtotal: 150000, tax: 27000, discount: 0, total: 177000,
      status: 'DRAFT', dueDate: new Date('2026-04-30'),
      createdById: billingPranav.id, clientId: createdClients[4].id,
    },
  ];

  for (const inv of invoicesData) {
    await prisma.invoice.create({ data: inv });
  }
  console.log(`  Created ${invoicesData.length} invoices`);

  // ─── 10. JOB POSTINGS (4 open positions) ──────────────────
  const jobPostingsData = [
    {
      title: 'Senior AI/ML Engineer',
      department: 'Engineering',
      description: 'Join our AI team to build cutting-edge ML models, fine-tune LLMs, and develop production AI pipelines. You will work on real products used by thousands of users.',
      requirements: JSON.stringify(['4+ years ML/AI experience', 'Strong Python, PyTorch/TensorFlow', 'Experience with LLM fine-tuning (LoRA/QLoRA)', 'RAG pipelines and vector databases', 'MLOps: model serving, monitoring, A/B testing', 'Published research or open-source contributions (preferred)']),
      salaryMin: 1500000, salaryMax: 2400000, location: 'Bengaluru (Hybrid)', type: 'Full-time',
      status: 'OPEN', createdById: hr.id,
    },
    {
      title: 'Video Editor (Short-form Content)',
      department: 'Content',
      description: 'We produce 100+ short-form videos per month. Looking for a fast, creative editor who lives and breathes reels, shorts, and TikToks. Must know trending formats.',
      requirements: JSON.stringify(['2+ years video editing experience', 'Expert in Premiere Pro and/or CapCut', 'Understanding of viral content patterns', 'Fast turnaround: 4-6 videos per day', 'Motion graphics basics (After Effects a plus)', 'Portfolio of short-form content required']),
      salaryMin: 300000, salaryMax: 500000, location: 'Bengaluru (On-site)', type: 'Full-time',
      status: 'OPEN', createdById: hr.id,
    },
    {
      title: 'Junior Python Developer',
      department: 'Engineering',
      description: 'Work on AI automation tools, API development, and data pipelines. Great opportunity to learn ML and AI engineering from senior team members.',
      requirements: JSON.stringify(['1+ year Python experience', 'Familiarity with FastAPI or Flask', 'Basic understanding of databases (PostgreSQL)', 'Interest in AI/ML', 'CS degree or equivalent']),
      salaryMin: 400000, salaryMax: 600000, location: 'Bengaluru (On-site)', type: 'Full-time',
      status: 'OPEN', createdById: hr.id,
    },
    {
      title: 'Sales Development Representative (AI Products)',
      department: 'Sales',
      description: 'Drive outbound sales for our AI products and services. Help enterprises understand how AI can transform their business. Commission-based incentives on top of base salary.',
      requirements: JSON.stringify(['1-3 years B2B sales experience', 'Understanding of AI/SaaS products', 'Excellent communication in English and Hindi', 'CRM experience (HubSpot/Salesforce)', 'Track record of meeting/exceeding targets', 'MBA preferred but not required']),
      salaryMin: 400000, salaryMax: 700000, location: 'Bengaluru / Remote', type: 'Full-time',
      status: 'OPEN', createdById: hr.id,
    },
  ];

  const createdJobs = [];
  for (const j of jobPostingsData) {
    const job = await prisma.jobPosting.create({ data: j });
    createdJobs.push(job);
  }
  console.log(`  Created ${createdJobs.length} job postings`);

  // ─── 11. JOB CANDIDATES (16 across 4 postings) ────────────
  const candidatesData = [
    // Senior AI/ML Engineer - 5 candidates
    { jobId: createdJobs[0].id, name: 'Nikhil Srinivasan', email: 'nikhil.sri@gmail.com', phone: '+91 9988776601', status: 'FINAL_INTERVIEW', reviewerId: cto.id, reviewNotes: 'Excellent PyTorch skills, published paper on efficient fine-tuning. Strong system design.', linkedinUrl: 'https://linkedin.com/in/nikhilsri' },
    { jobId: createdJobs[0].id, name: 'Preethi Ramachandran', email: 'preethi.r@outlook.com', phone: '+91 9988776602', status: 'PRACTICAL_TASK', reviewerId: srDevHarsh.id, reviewNotes: 'Good ML fundamentals, TensorFlow background. Needs to evaluate LLM skills.', practicalTaskUrl: 'https://github.com/knowai/ml-take-home', practicalDeadline: new Date('2026-03-25') },
    { jobId: createdJobs[0].id, name: 'Amitabh Ghosh', email: 'amitabh.ghosh@yahoo.com', phone: '+91 9988776603', status: 'REJECTED', reviewerId: cto.id, reviewNotes: 'Traditional ML only, no LLM experience', finalNotes: 'Rejected - insufficient LLM/GenAI experience' },
    { jobId: createdJobs[0].id, name: 'Shreya Kapoor', email: 'shreya.kapoor@protonmail.com', phone: '+91 9988776604', status: 'OFFERED', reviewerId: cto.id, reviewNotes: 'Exceptional. 5 years at Google DeepMind. Strong in transformers, RLHF, and RAG.', offeredSalary: 2200000, linkedinUrl: 'https://linkedin.com/in/shreyakapoor' },
    { jobId: createdJobs[0].id, name: 'Varun Narayanan', email: 'varun.n@gmail.com', phone: '+91 9988776605', status: 'INTERVIEW_ROUND_1', reviewerId: srDevHarsh.id, reviewNotes: 'IIT-M grad, interesting side projects with LangChain' },

    // Video Editor - 4 candidates
    { jobId: createdJobs[1].id, name: 'Isha Malhotra', email: 'isha.edits@gmail.com', phone: '+91 9988776606', status: 'PRACTICAL_TASK', reviewerId: editorKavya.id, portfolioUrl: 'https://youtube.com/@ishaedits', reviewNotes: 'Great reel portfolio, fast editing style. Sent test project.', practicalTaskUrl: 'https://drive.google.com/knowai/editor-test', practicalDeadline: new Date('2026-03-23') },
    { jobId: createdJobs[1].id, name: 'Farhan Ahmed', email: 'farhan.edits@gmail.com', phone: '+91 9988776607', status: 'INTERVIEW_ROUND_1', reviewerId: editorAarav.id, portfolioUrl: 'https://instagram.com/farhancuts', reviewNotes: 'Strong After Effects skills, good motion graphics' },
    { jobId: createdJobs[1].id, name: 'Divya Prabhu', email: 'divya.p@gmail.com', phone: '+91 9988776608', status: 'RESUME_REVIEW', reviewerId: contentMeera.id, portfolioUrl: 'https://behance.net/divyaprabhu' },
    { jobId: createdJobs[1].id, name: 'Karthik Nair', email: 'karthik.editor@gmail.com', phone: '+91 9988776609', status: 'REJECTED', reviewerId: editorKavya.id, reviewNotes: 'Only long-form experience, no short-form content', finalNotes: 'Not a fit for our short-form focused role' },

    // Junior Python Developer - 4 candidates
    { jobId: createdJobs[2].id, name: 'Aakash Jain', email: 'aakash.jain@gmail.com', phone: '+91 9988776610', status: 'INTERVIEW_ROUND_1', reviewerId: srDevVivek.id, coverLetter: 'Final year CS student from IIIT Hyderabad. Built FastAPI projects and interested in AI.', reviewNotes: 'Good coding skills, enthusiastic about AI' },
    { jobId: createdJobs[2].id, name: 'Nandini Rao', email: 'nandini.rao@gmail.com', phone: '+91 9988776611', status: 'APPLIED', coverLetter: 'Completed Python bootcamp and built 3 full-stack projects. Eager to learn ML.' },
    { jobId: createdJobs[2].id, name: 'Siddharth Menon', email: 'sid.menon@gmail.com', phone: '+91 9988776612', status: 'PRACTICAL_TASK', reviewerId: srDevAditya.id, reviewNotes: 'Strong fundamentals. Sent coding challenge.', practicalTaskUrl: 'https://github.com/knowai/python-challenge', practicalDeadline: new Date('2026-03-24') },

    // Sales Development Rep - 3 candidates
    { jobId: createdJobs[3].id, name: 'Megha Tiwari', email: 'megha.tiwari@gmail.com', phone: '+91 9988776613', status: 'INTERVIEW_ROUND_1', reviewerId: salesRahul.id, reviewNotes: 'MBA from Symbiosis, 2 years at Freshworks sales team', linkedinUrl: 'https://linkedin.com/in/meghatiwari' },
    { jobId: createdJobs[3].id, name: 'Rohan Sethi', email: 'rohan.sethi@gmail.com', phone: '+91 9988776614', status: 'RESUME_REVIEW', reviewerId: salesTanya.id, linkedinUrl: 'https://linkedin.com/in/rohansethi' },
    { jobId: createdJobs[3].id, name: 'Ankita Pillai', email: 'ankita.pillai@gmail.com', phone: '+91 9988776615', status: 'APPLIED', coverLetter: '3 years at Zoho selling SaaS products. Excited about AI market opportunity.' },
  ];

  for (const c of candidatesData) {
    await prisma.jobCandidate.create({ data: c });
  }
  console.log(`  Created ${candidatesData.length} job candidates`);

  // ─── 12. CALENDAR EVENTS (15 events) ──────────────────────
  const calendarData = [
    { title: 'AI Team Standup', description: 'Daily sync: what you did, what you are doing, blockers', startDate: new Date('2026-03-20T09:30:00'), endDate: new Date('2026-03-20T09:45:00'), color: '#3b82f6', calendarType: 'meeting', createdById: cto.id },
    { title: 'Client: TechVista Demo', description: 'Demo Phase 2 chatbot features to TechVista product team', startDate: new Date('2026-03-20T14:00:00'), endDate: new Date('2026-03-20T15:00:00'), color: '#ef4444', calendarType: 'meeting', createdById: salesGaurav.id },
    { title: 'GPU Training Run Review', description: 'Review LLaMA fine-tuning results and adjust hyperparameters', startDate: new Date('2026-03-20T16:00:00'), endDate: new Date('2026-03-20T17:00:00'), color: '#8b5cf6', calendarType: 'meeting', createdById: srDevHarsh.id },
    { title: 'Content Calendar Review - April Reels', description: 'Plan April 2026 content calendar: themes, hooks, posting schedule', startDate: new Date('2026-03-21T10:00:00'), endDate: new Date('2026-03-21T11:30:00'), color: '#f59e0b', calendarType: 'meeting', createdById: contentMeera.id },
    { title: 'Investor Pitch Prep', description: 'Prepare deck for Series A investor call - traction metrics, product roadmap', startDate: new Date('2026-03-21T14:00:00'), endDate: new Date('2026-03-21T16:00:00'), color: '#ec4899', calendarType: 'meeting', createdById: ceo.id },
    { title: 'Holi Office Party', description: 'Office celebration - colors, snacks, and team bonding! Dress in white.', startDate: new Date('2026-03-24T11:00:00'), endDate: new Date('2026-03-24T14:00:00'), color: '#f97316', calendarType: 'event', createdById: hr.id },
    { title: 'Sprint Planning - Sprint 15', description: 'Plan Sprint 15 for Zeel.ai v3 and ERP project', startDate: new Date('2026-03-22T10:00:00'), endDate: new Date('2026-03-22T11:30:00'), color: '#6366f1', calendarType: 'meeting', createdById: po.id },
    { title: 'Design Review: Zeel.ai Dashboard', description: 'Review glassmorphism dashboard mockups with the team', startDate: new Date('2026-03-22T14:00:00'), endDate: new Date('2026-03-22T15:00:00'), color: '#14b8a6', calendarType: 'meeting', createdById: designerSanjay.id },
    { title: 'Client: MediCare Kickoff Call', description: 'Phase 2 kickoff with MediCare team - NLP model requirements', startDate: new Date('2026-03-23T11:00:00'), endDate: new Date('2026-03-23T12:00:00'), color: '#ef4444', calendarType: 'meeting', createdById: po.id },
    { title: 'Candidate Interview - Shreya Kapoor', description: 'Final round for Senior AI/ML Engineer position with CEO and CTO', startDate: new Date('2026-03-21T10:00:00'), endDate: new Date('2026-03-21T11:00:00'), color: '#ec4899', calendarType: 'interview', createdById: hr.id },
    { title: 'Payroll Processing - March', description: 'Process remaining March 2026 payroll for pending employees', startDate: new Date('2026-03-25T10:00:00'), endDate: new Date('2026-03-25T11:00:00'), color: '#10b981', calendarType: 'task', createdById: cfo.id },
    { title: 'Weekly Retrospective', description: 'Sprint 14 retro - wins, improvements, action items', startDate: new Date('2026-03-21T16:00:00'), endDate: new Date('2026-03-21T17:00:00'), color: '#8b5cf6', calendarType: 'meeting', createdById: po.id },
    { title: 'All Hands - March Update', description: 'Monthly all-hands: company update, wins, upcoming priorities', startDate: new Date('2026-03-26T15:00:00'), endDate: new Date('2026-03-26T16:00:00'), color: '#3b82f6', calendarType: 'meeting', createdById: ceo.id },
    { title: 'Content Team Shoot Day', description: 'Full day shoot: product demos, team BTS, and Neha brand videos', startDate: new Date('2026-03-23T09:00:00'), endDate: new Date('2026-03-23T17:00:00'), color: '#f59e0b', calendarType: 'event', createdById: contentMeera.id },
    { title: 'Sales Pipeline Review', description: 'Weekly sales pipeline review - update on all active leads and proposals', startDate: new Date('2026-03-22T11:30:00'), endDate: new Date('2026-03-22T12:30:00'), color: '#10b981', calendarType: 'meeting', createdById: salesRahul.id },
  ];

  for (const ev of calendarData) {
    await prisma.calendarEvent.create({ data: ev });
  }
  console.log(`  Created ${calendarData.length} calendar events`);

  // ─── 13. CONTACTS (10 contacts with labels) ───────────────
  const contactsData = [
    { name: 'Suresh Menon', email: 'suresh.menon@techvista.com', phone: '+91 9900112233', title: 'CTO', company: 'TechVista Solutions', label: 'CLIENT', avatarColor: '#3b82f6' },
    { name: 'Dr. Anand Rao', email: 'dr.anand@medicarehealthai.com', phone: '+91 9900112234', title: 'Chief Medical Officer', company: 'MediCare Health Systems', label: 'CLIENT', avatarColor: '#ef4444' },
    { name: 'Lakshmi Iyer', email: 'lakshmi@eduverse.co.in', phone: '+91 9900112235', title: 'CEO', company: 'EduVerse Learning', label: 'CLIENT', avatarColor: '#10b981' },
    { name: 'Rajesh Khanna', email: 'rajesh@awspartner.in', phone: '+91 9900112236', title: 'Solutions Architect', company: 'AWS India', label: 'VENDOR', avatarColor: '#f59e0b' },
    { name: 'Anita Deshmukh', email: 'anita.d@vc.fund', phone: '+91 9900112237', title: 'Partner', company: 'Sequoia Capital India', label: 'INVESTOR', avatarColor: '#8b5cf6' },
    { name: 'Farhan Sheikh', email: 'farhan@influencehub.co', phone: '+91 9900112238', title: 'Founder', company: 'InfluenceHub Agency', label: 'PARTNER', avatarColor: '#ec4899' },
    { name: 'Nirmala Sitharaman', email: 'nirmala@bharatfinserv.in', phone: '+91 9900112239', title: 'CFO', company: 'Bharat Financial Services', label: 'CLIENT', avatarColor: '#6366f1' },
    { name: 'Vijay Shekhar', email: 'vijay@shopkart.in', phone: '+91 9900112240', title: 'VP Engineering', company: 'ShopKart India', label: 'LEAD', avatarColor: '#14b8a6' },
    { name: 'Karthik Subramanian', email: 'karthik@agrisense.ai', phone: '+91 9900112241', title: 'Founder', company: 'AgriSense AI', label: 'LEAD', avatarColor: '#f97316' },
    { name: 'Preeti Nagarajan', email: 'preeti@cloudninelogistics.com', phone: '+91 9900112242', title: 'Head of Technology', company: 'CloudNine Logistics', label: 'CLIENT', avatarColor: '#3b82f6' },
  ];

  for (const ct of contactsData) {
    await prisma.contact.create({ data: { ...ct, createdById: ceo.id } });
  }
  console.log(`  Created ${contactsData.length} contacts`);

  // ─── 14. CHAT ROOMS (5 rooms) ─────────────────────────────
  const generalRoom = await prisma.chatRoom.create({
    data: { name: 'General', type: 'group', createdById: ceo.id }
  });
  const engineeringRoom = await prisma.chatRoom.create({
    data: { name: 'Engineering', type: 'department', department: 'Engineering', createdById: cto.id }
  });
  const contentRoom = await prisma.chatRoom.create({
    data: { name: 'Content Team', type: 'department', department: 'Content', createdById: contentMeera.id }
  });
  const salesRoom = await prisma.chatRoom.create({
    data: { name: 'Sales', type: 'department', department: 'Sales', createdById: salesRahul.id }
  });
  const randomRoom = await prisma.chatRoom.create({
    data: { name: 'Random', type: 'group', createdById: ceo.id }
  });

  // Add members to rooms
  const allUsersList = Object.values(userMap);
  for (const u of allUsersList) {
    await prisma.chatRoomMember.create({ data: { roomId: generalRoom.id, userId: u.id } });
    await prisma.chatRoomMember.create({ data: { roomId: randomRoom.id, userId: u.id } });
  }
  const engineeringMembers = [cto, po, srDevAditya, srDevHarsh, jrDevPooja, jrDevRohit, jrDevTanvi, srDevVivek, jrDevIshaan];
  for (const u of engineeringMembers) {
    await prisma.chatRoomMember.create({ data: { roomId: engineeringRoom.id, userId: u.id } });
  }
  const contentMembers = [contentMeera, editorKavya, editorAarav, jrEditorDiya, jrEditorSahil, scriptAnanya, scriptNisha, contentRitika, contentZara, thumbnailManish, brandFace];
  for (const u of contentMembers) {
    await prisma.chatRoomMember.create({ data: { roomId: contentRoom.id, userId: u.id } });
  }
  const salesMembers = [salesRahul, salesTanya, salesYash, salesSimran, salesGaurav, brandFace, ceo];
  for (const u of salesMembers) {
    await prisma.chatRoomMember.create({ data: { roomId: salesRoom.id, userId: u.id } });
  }
  console.log('  Created 5 chat rooms with members');

  // ─── 15. CHAT MESSAGES (15 messages across rooms) ─────────
  const chatMessagesData = [
    { roomId: generalRoom.id, senderId: ceo.id, content: 'Good morning team! Big week ahead. 100 Reels Challenge is at 80% and Zeel.ai v3 is hitting exciting milestones. Let us push through!', createdAt: new Date('2026-03-20T09:00:00') },
    { roomId: generalRoom.id, senderId: hr.id, content: 'Reminder: Holi holiday on March 24th. Office will be closed. We are doing a small Holi party at 11 AM before the break!', createdAt: new Date('2026-03-20T09:05:00') },
    { roomId: generalRoom.id, senderId: officeBoy.id, content: 'Tea and samosas are ready in the pantry! Fresh batch from the new vendor.', createdAt: new Date('2026-03-20T10:30:00') },
    { roomId: generalRoom.id, senderId: brandFace.id, content: 'Just crossed 50K followers on our AI content Instagram! The Sora reels are going viral.', createdAt: new Date('2026-03-20T11:00:00') },
    { roomId: engineeringRoom.id, senderId: cto.id, content: 'RAG pipeline benchmarks are in. We are getting 92% retrieval accuracy on the test set. Great work Harsh!', createdAt: new Date('2026-03-20T09:15:00') },
    { roomId: engineeringRoom.id, senderId: srDevHarsh.id, content: 'Thanks Ravi! The chunking strategy with overlap made a big difference. Fine-tuning run is at epoch 3/5 on Hetzner GPU.', createdAt: new Date('2026-03-20T09:20:00') },
    { roomId: engineeringRoom.id, senderId: jrDevIshaan.id, content: 'GPU server monitoring is live on Grafana. Dashboard link in #engineering-docs channel. Memory usage at 78%.', createdAt: new Date('2026-03-20T09:25:00') },
    { roomId: engineeringRoom.id, senderId: srDevAditya.id, content: 'GPT-4o streaming integration is working. The multi-modal chat handles images and text together now. PR is up for review.', createdAt: new Date('2026-03-20T09:30:00') },
    { roomId: contentRoom.id, senderId: contentMeera.id, content: 'We are at 80 reels for March! 20 more to go. Kavya and Diya, can you each take 5 more this week? Sahil, 5 shorts from the podcast recordings.', createdAt: new Date('2026-03-20T09:10:00') },
    { roomId: contentRoom.id, senderId: editorKavya.id, content: 'On it! I will batch edit the Sora trend reels today. The hook format from Ananya is working great - 3 second retention is up 40%.', createdAt: new Date('2026-03-20T09:12:00') },
    { roomId: contentRoom.id, senderId: scriptAnanya.id, content: 'New batch of 10 hooks ready in the shared doc. Theme: "AI tools you are sleeping on". These should perform well based on current trends.', createdAt: new Date('2026-03-20T09:15:00') },
    { roomId: salesRoom.id, senderId: salesRahul.id, content: 'CloudNine Logistics meeting went well. They are very interested in route optimization. Follow-up scheduled for Friday.', createdAt: new Date('2026-03-20T10:00:00') },
    { roomId: salesRoom.id, senderId: salesTanya.id, content: 'Bharat FinServ RFP submitted. We proposed the fraud detection module at 50L. Waiting for their evaluation committee response.', createdAt: new Date('2026-03-20T10:05:00') },
    { roomId: randomRoom.id, senderId: jrEditorDiya.id, content: 'Has anyone tried the new biryani place near the office? The reviews are amazing!', createdAt: new Date('2026-03-20T12:30:00') },
    { roomId: randomRoom.id, senderId: thumbnailManish.id, content: 'Yes! The chicken biryani is next level. We should do a team lunch there this week.', createdAt: new Date('2026-03-20T12:35:00') },
  ];

  for (const msg of chatMessagesData) {
    await prisma.chatMessage.create({ data: msg });
  }
  console.log(`  Created ${chatMessagesData.length} chat messages`);

  // ─── 16. NOTIFICATIONS (18 for various users) ─────────────
  const notificationsData = [
    { type: 'TASK_ASSIGNED', title: 'New Task Assigned', message: 'You have been assigned "Build RAG pipeline for enterprise knowledge base"', userId: srDevHarsh.id, linkUrl: '/tasks', read: false },
    { type: 'TASK_ASSIGNED', title: 'New Task Assigned', message: 'You have been assigned "Design glassmorphism dashboard for Zeel.ai v3"', userId: designerSwati.id, linkUrl: '/tasks', read: false },
    { type: 'TASK_COMPLETED', title: 'Task Completed', message: 'Ishaan completed "Set up Hetzner GPU server for training"', userId: po.id, linkUrl: '/tasks', read: true },
    { type: 'TASK_COMPLETED', title: 'Task Completed', message: 'Ananya completed "Write 30 viral hooks for AI content"', userId: contentMeera.id, linkUrl: '/tasks', read: true },
    { type: 'TASK_OVERDUE', title: 'Task Overdue', message: '"HIPAA compliance audit for AI pipeline" is approaching due date', userId: jrDevRohit.id, linkUrl: '/tasks', read: false },
    { type: 'LEAVE_APPROVED', title: 'Leave Approved', message: 'Your leave request for March 20-21 has been approved', userId: srDevAditya.id, linkUrl: '/hr/leaves', read: true },
    { type: 'LEAVE_REJECTED', title: 'Leave Rejected', message: 'Your unpaid leave request has been rejected. Reason: Critical 100 Reels deadline', userId: contentMeera.id, linkUrl: '/hr/leaves', read: false },
    { type: 'LEAD_ASSIGNED', title: 'New Lead Assigned', message: 'You have been assigned "Fraud Detection AI - Bharat FinServ"', userId: salesTanya.id, linkUrl: '/crm/leads', read: false },
    { type: 'LEAD_ASSIGNED', title: 'New Lead Assigned', message: 'You have been assigned "Route Optimization AI - CloudNine Logistics"', userId: salesGaurav.id, linkUrl: '/crm/leads', read: true },
    { type: 'CHAT_MENTION', title: 'Mentioned in Chat', message: 'Ravi mentioned you in Engineering channel', userId: srDevHarsh.id, linkUrl: '/chat', read: false },
    { type: 'SYSTEM', title: 'System Update', message: 'Know AI ERP has been updated to v3.1.0. New features: AI-powered invoice reminders, content calendar.', userId: admin.id, linkUrl: '/settings', read: true },
    { type: 'COMPLAINT_FILED', title: 'New Complaint Filed', message: 'A new workplace safety complaint has been filed and assigned to you', userId: hr.id, linkUrl: '/hr/complaints', read: false },
    { type: 'SYSTEM', title: 'Payroll Processed', message: 'March 2026 payroll has been processed. Check your salary slip.', userId: srDevAditya.id, linkUrl: '/hr/payroll', read: false },
    { type: 'SYSTEM', title: 'Payroll Processed', message: 'March 2026 payroll has been processed. Check your salary slip.', userId: srDevHarsh.id, linkUrl: '/hr/payroll', read: false },
    { type: 'TASK_ASSIGNED', title: 'New Task Assigned', message: 'You have been assigned "Edit 25 reels for Sora AI trend"', userId: editorKavya.id, linkUrl: '/tasks', read: false },
    { type: 'ANNOUNCEMENT', title: 'Holi Celebration!', message: 'Holi party at office on March 24th at 11 AM. Dress in white! Colors and sweets provided.', userId: ceo.id, linkUrl: '/', read: true },
    { type: 'TASK_COMMENT', title: 'New Comment on Task', message: 'Kavya commented on "Edit 25 reels": Batch 1 (10 reels) exported and uploaded to drive.', userId: contentMeera.id, linkUrl: '/tasks', read: false },
    { type: 'DOCUMENT_VERIFIED', title: 'Document Verified', message: 'Your Aadhaar card has been verified by HR', userId: jrDevTanvi.id, linkUrl: '/hr/documents', read: true },
  ];

  for (const n of notificationsData) {
    await prisma.notification.create({ data: n });
  }
  console.log(`  Created ${notificationsData.length} notifications`);

  // ─── 17. FILES (8 files) ──────────────────────────────────
  const filesData = [
    { name: 'Zeel_ai_v3_Product_Roadmap.pdf', size: 3200000, fileType: 'application/pdf', isFolder: false, uploadedById: po.id },
    { name: 'Glassmorphism_Dashboard_Mockup_v2.fig', size: 12000000, fileType: 'application/figma', isFolder: false, uploadedById: designerSwati.id },
    { name: 'RAG_Pipeline_Architecture.md', size: 52000, fileType: 'text/markdown', isFolder: false, uploadedById: srDevHarsh.id },
    { name: 'Employee_Handbook_2026.pdf', size: 3200000, fileType: 'application/pdf', isFolder: false, uploadedById: hr.id },
    { name: 'March_2026_Payroll_Report.xlsx', size: 185000, fileType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', isFolder: false, uploadedById: accountVikram.id },
    { name: 'AI_Trends_Q1_Infographics.zip', size: 45000000, fileType: 'application/zip', isFolder: false, uploadedById: designerSanjay.id },
    { name: 'LLaMA_FineTune_Results_March.ipynb', size: 890000, fileType: 'application/x-ipynb+json', isFolder: false, uploadedById: srDevHarsh.id },
    { name: 'Content_Calendar_March_2026.xlsx', size: 98000, fileType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', isFolder: false, uploadedById: contentRitika.id },
  ];

  for (const f of filesData) {
    await prisma.file.create({ data: f });
  }
  console.log(`  Created ${filesData.length} files`);

  // ─── 18. GOALS (6 goals) ──────────────────────────────────
  const goalsData = [
    {
      title: 'Ship Zeel.ai v3 by June 2026',
      description: 'Complete development and launch the next-gen AI platform with agent framework, RAG pipelines, and multi-modal capabilities',
      type: 'OBJECTIVE', scope: 'COMPANY', ownerId: ceo.id, workspaceId: workspace.id,
      startDate: new Date('2026-01-01'), endDate: new Date('2026-06-30'),
      progress: 60, status: 'ON_TRACK', metricType: 'PERCENTAGE', metricCurrent: 60, metricTarget: 100,
    },
    {
      title: '100 reels per month',
      description: 'Consistently produce and publish 100+ short-form videos every month across Instagram, YouTube Shorts, and TikTok',
      type: 'TARGET', scope: 'TEAM', ownerId: contentMeera.id, workspaceId: workspace.id,
      startDate: new Date('2026-03-01'), endDate: new Date('2026-03-31'),
      progress: 80, status: 'ON_TRACK', metricType: 'NUMBER', metricCurrent: 80, metricTarget: 100,
    },
    {
      title: 'Close 50L in new deals this quarter',
      description: 'Win new AI project deals worth at least INR 50 lakh in Q1 2026 through partnerships, referrals, and outbound sales',
      type: 'KEY_RESULT', scope: 'TEAM', ownerId: salesRahul.id, workspaceId: workspace.id,
      startDate: new Date('2026-01-01'), endDate: new Date('2026-03-31'),
      progress: 65, status: 'ON_TRACK', metricType: 'CURRENCY', metricCurrent: 3250000, metricTarget: 5000000,
    },
    {
      title: 'Zero production incidents',
      description: 'Maintain 99.9% uptime across all production services with zero P0/P1 incidents through better monitoring and testing',
      type: 'TARGET', scope: 'TEAM', ownerId: cto.id, workspaceId: workspace.id,
      startDate: new Date('2026-01-01'), endDate: new Date('2026-06-30'),
      progress: 90, status: 'ON_TRACK', metricType: 'NUMBER', metricCurrent: 0, metricTarget: 0,
    },
    {
      title: 'Hire 5 new team members',
      description: 'Fill open positions: Senior AI/ML Engineer, Video Editor, Junior Python Dev, SDR, and one more based on growth',
      type: 'KEY_RESULT', scope: 'COMPANY', ownerId: hr.id, workspaceId: workspace.id,
      startDate: new Date('2026-01-01'), endDate: new Date('2026-06-30'),
      progress: 20, status: 'AT_RISK', metricType: 'NUMBER', metricCurrent: 1, metricTarget: 5,
    },
    {
      title: 'Reduce video turnaround to 24hrs',
      description: 'Optimize content production pipeline so any video goes from script to published in under 24 hours using AI tools',
      type: 'TARGET', scope: 'TEAM', ownerId: contentMeera.id, workspaceId: workspace.id,
      startDate: new Date('2026-02-01'), endDate: new Date('2026-05-31'),
      progress: 45, status: 'AT_RISK', metricType: 'NUMBER', metricCurrent: 36, metricTarget: 24,
    },
  ];

  for (const g of goalsData) {
    await prisma.goal.create({ data: g });
  }
  console.log(`  Created ${goalsData.length} goals`);

  // ─── 19. TIME ENTRIES (12 entries) ─────────────────────────
  const timeEntriesData = [
    { userId: srDevHarsh.id, taskId: createdTasks[0].id, projectId: project1.id, description: 'RAG pipeline - pgvector setup and chunking strategy', startTime: new Date('2026-03-20T09:00:00'), endTime: new Date('2026-03-20T13:00:00'), duration: 240, billable: true, workspaceId: workspace.id },
    { userId: srDevAditya.id, taskId: createdTasks[2].id, projectId: project1.id, description: 'GPT-4o streaming response integration', startTime: new Date('2026-03-20T09:30:00'), endTime: new Date('2026-03-20T12:30:00'), duration: 180, billable: true, workspaceId: workspace.id },
    { userId: srDevVivek.id, taskId: createdTasks[7].id, projectId: project2.id, description: 'Sora API integration and video generation pipeline', startTime: new Date('2026-03-20T10:00:00'), endTime: new Date('2026-03-20T14:00:00'), duration: 240, billable: true, workspaceId: workspace.id },
    { userId: editorKavya.id, taskId: createdTasks[18].id, projectId: project5.id, description: 'Batch editing Sora trend reels (10 completed)', startTime: new Date('2026-03-20T09:00:00'), endTime: new Date('2026-03-20T17:00:00'), duration: 480, billable: true, workspaceId: workspace.id },
    { userId: jrDevPooja.id, taskId: createdTasks[26].id, projectId: project6.id, description: 'Mobile responsive fixes - sidebar and table components', startTime: new Date('2026-03-20T09:00:00'), endTime: new Date('2026-03-20T13:00:00'), duration: 240, billable: true, workspaceId: workspace.id },
    { userId: designerSwati.id, taskId: createdTasks[1].id, projectId: project1.id, description: 'Glassmorphism dashboard - card components and layout', startTime: new Date('2026-03-19T09:00:00'), endTime: new Date('2026-03-19T17:00:00'), duration: 480, billable: true, workspaceId: workspace.id },
    { userId: srDevHarsh.id, taskId: createdTasks[4].id, projectId: project1.id, description: 'LLaMA fine-tuning - data preparation and training config', startTime: new Date('2026-03-19T14:00:00'), endTime: new Date('2026-03-19T18:00:00'), duration: 240, billable: true, workspaceId: workspace.id },
    { userId: scriptAnanya.id, taskId: createdTasks[19].id, projectId: project5.id, description: 'Writing viral hooks batch - AI tools theme', startTime: new Date('2026-03-19T10:00:00'), endTime: new Date('2026-03-19T14:00:00'), duration: 240, billable: true, workspaceId: workspace.id },
    { userId: jrEditorDiya.id, taskId: createdTasks[20].id, projectId: project5.id, description: 'BTS shoot at AI lab - editing raw footage', startTime: new Date('2026-03-19T09:30:00'), endTime: new Date('2026-03-19T16:00:00'), duration: 390, billable: true, workspaceId: workspace.id },
    { userId: salesGaurav.id, projectId: project3.id, description: 'TechVista client meeting prep and demo walkthrough', startTime: new Date('2026-03-20T11:00:00'), endTime: new Date('2026-03-20T13:00:00'), duration: 120, billable: false, workspaceId: workspace.id },
    { userId: po.id, projectId: project1.id, description: 'Sprint planning and backlog grooming for Zeel.ai v3', startTime: new Date('2026-03-20T10:00:00'), endTime: new Date('2026-03-20T12:00:00'), duration: 120, billable: false, workspaceId: workspace.id },
    { userId: thumbnailManish.id, taskId: createdTasks[23].id, projectId: project5.id, description: 'Designing reel thumbnails batch - Canva templates', startTime: new Date('2026-03-20T09:00:00'), endTime: new Date('2026-03-20T13:00:00'), duration: 240, billable: true, workspaceId: workspace.id },
  ];

  for (const te of timeEntriesData) {
    await prisma.timeEntry.create({ data: te });
  }
  console.log(`  Created ${timeEntriesData.length} time entries`);

  // ─── 20. DOCS (4 wiki docs) ───────────────────────────────
  const docsData = [
    {
      title: 'Engineering Onboarding Guide',
      content: '# Engineering Onboarding Guide\n\n## Welcome to Know AI Engineering!\n\nThis guide will help you get started with our development environment and workflows.\n\n## Tech Stack\n- **Frontend**: React 19, Next.js 15, Bootstrap 5, SCSS\n- **Backend**: Next.js API Routes, Prisma ORM\n- **Database**: PostgreSQL 16\n- **AI/ML**: Python, PyTorch, LangChain, pgvector\n- **Hosting**: Hetzner (GPU), Vercel (frontend), Railway (DB)\n\n## Getting Started\n1. Clone the repository: `git clone git@github.com:knowai/erp.git`\n2. Install dependencies: `npm install`\n3. Setup database: `npx prisma migrate dev`\n4. Run seed: `npx prisma db seed`\n5. Start dev server: `npm run dev`\n\n## Code Review Process\n- All PRs require at least 1 approval from a senior dev\n- Run tests locally before pushing\n- Follow conventional commits\n- No direct pushes to main branch',
      icon: '📖', createdById: cto.id, workspaceId: workspace.id, projectId: project6.id, isPublished: true,
    },
    {
      title: 'Zeel.ai v3 Product Requirements',
      content: '# Zeel.ai v3 - Product Requirements\n\n## Vision\nBuild the most intuitive AI workspace that lets teams harness AI agents, knowledge bases, and multi-modal AI in one platform.\n\n## Core Features\n1. **AI Agent Framework** - Create, chain, and deploy AI agents with tool-use\n2. **RAG Knowledge Base** - Upload docs, auto-index, semantic search\n3. **Multi-Modal Chat** - Text, image, audio, and video understanding via GPT-4o\n4. **Workflow Automation** - Visual workflow builder with AI steps\n5. **Analytics Dashboard** - Usage, cost, and performance metrics\n\n## Timeline\n- Phase 1 (Jan-Mar): Core RAG + Chat - DONE\n- Phase 2 (Apr-May): Agent Framework + Automation\n- Phase 3 (Jun): Polish, Testing, Launch',
      icon: '🚀', createdById: po.id, workspaceId: workspace.id, projectId: project1.id, isPublished: true,
    },
    {
      title: 'Content Production Playbook',
      content: '# Content Production Playbook\n\n## The 100 Reels System\n\nWe produce 100+ short-form videos every month. Here is how:\n\n## Daily Workflow\n- **9:00 AM** - Team standup: what is being edited today\n- **9:30 AM - 1:00 PM** - Batch editing session (target: 3-4 videos each)\n- **2:00 PM - 4:00 PM** - Review, revisions, and approvals\n- **4:00 PM - 6:00 PM** - Scheduling, thumbnails, captions\n\n## Content Pillars\n1. AI Tool Reviews & Demos (30%)\n2. Behind-the-Scenes at Zeel.ai (20%)\n3. AI Tips & Tutorials (25%)\n4. Trending Audio + AI Angle (15%)\n5. Brand/Product Announcements (10%)\n\n## Quality Checklist\n- Hook in first 3 seconds\n- Captions on all videos\n- Brand colors in thumbnail\n- CTA in last 5 seconds\n- Trending audio when possible',
      icon: '🎬', createdById: contentMeera.id, workspaceId: workspace.id, projectId: project5.id, isPublished: true,
    },
    {
      title: 'API Endpoints Reference',
      content: '# API Endpoints Reference\n\n## Authentication\n- `POST /api/auth/login` - Login with email/password (returns JWT)\n- `POST /api/auth/register` - Register new user\n- `POST /api/auth/refresh` - Refresh JWT token\n\n## Users\n- `GET /api/users` - List all users\n- `GET /api/users/:id` - Get user by ID\n- `PUT /api/users/:id` - Update user\n\n## Projects\n- `GET /api/projects` - List projects\n- `POST /api/projects` - Create project\n\n## Tasks\n- `GET /api/tasks` - List tasks (filterable by project, assignee, status)\n- `POST /api/tasks` - Create task\n- `PUT /api/tasks/:id` - Update task\n\n## AI Endpoints\n- `POST /api/ai/chat` - Multi-modal chat with GPT-4o\n- `POST /api/ai/rag/query` - Query knowledge base\n- `POST /api/ai/rag/index` - Index new documents\n\n## Notes\n- All endpoints require Bearer token\n- Rate limit: 100 requests/minute\n- Response format: JSON',
      icon: '🔗', createdById: srDevAditya.id, workspaceId: workspace.id, projectId: project6.id, isPublished: true,
    },
  ];

  for (const d of docsData) {
    await prisma.doc.create({ data: d });
  }
  console.log(`  Created ${docsData.length} docs`);

  // ─── 21. COMPLAINTS (3 complaints) ────────────────────────
  const complaint1 = await prisma.complaint.create({
    data: {
      category: 'WORKPLACE_SAFETY',
      subject: 'AC not working in studio',
      description: 'The air conditioning in the video production studio has been broken for 5 days. Temperature is consistently above 35C which is affecting equipment (cameras overheating) and team comfort during long shoot days.',
      status: 'UNDER_REVIEW',
      escalationLevel: 'HR',
      filedById: contentMeera.id,
      againstId: admin.id,
      assignedToId: hr.id,
      workspaceId: workspace.id,
    }
  });
  await prisma.complaintTimeline.create({
    data: { complaintId: complaint1.id, action: 'FILED', note: 'Complaint filed by Meera Nair - studio AC broken for 5 days', actorId: contentMeera.id }
  });
  await prisma.complaintTimeline.create({
    data: { complaintId: complaint1.id, action: 'ASSIGNED', note: 'Assigned to HR for vendor coordination', actorId: hr.id }
  });

  const complaint2 = await prisma.complaint.create({
    data: {
      category: 'SALARY_DISPUTE',
      subject: 'Late salary credit for March',
      description: 'March salary was supposed to be credited on March 1st but Sanjay and Pooja still show PENDING status. It is March 20th and we have not received our salary yet. This is causing financial stress.',
      status: 'OPEN',
      escalationLevel: 'HR',
      filedById: designerSanjay.id,
      againstId: cfo.id,
      assignedToId: hr.id,
      workspaceId: workspace.id,
    }
  });
  await prisma.complaintTimeline.create({
    data: { complaintId: complaint2.id, action: 'FILED', note: 'Complaint filed by Sanjay Das regarding late March salary', actorId: designerSanjay.id }
  });

  const complaint3 = await prisma.complaint.create({
    data: {
      category: 'WORKPLACE_SAFETY',
      subject: 'Noisy construction near office',
      description: 'There is heavy construction happening in the adjacent building. The noise levels are extremely high between 10 AM - 4 PM, making it impossible to do client calls or focused work. We need noise-cancelling solutions or temporary work arrangements.',
      status: 'OPEN',
      escalationLevel: 'HR',
      filedById: salesGaurav.id,
      againstId: admin.id,
      assignedToId: hr.id,
      workspaceId: workspace.id,
    }
  });
  await prisma.complaintTimeline.create({
    data: { complaintId: complaint3.id, action: 'FILED', note: 'Complaint filed by Gaurav Khanna about construction noise', actorId: salesGaurav.id }
  });

  console.log('  Created 3 complaints with timelines');

  // ─── 22. SPACES (3 spaces) ────────────────────────────────
  await prisma.space.create({
    data: {
      name: 'Engineering',
      description: 'All engineering projects, AI models, and technical work',
      color: '#3b82f6',
      icon: '⚙️',
      workspaceId: workspace.id,
      createdById: cto.id,
    }
  });

  await prisma.space.create({
    data: {
      name: 'Content & Video',
      description: 'Content production, video editing, and social media',
      color: '#f59e0b',
      icon: '🎬',
      workspaceId: workspace.id,
      createdById: contentMeera.id,
    }
  });

  await prisma.space.create({
    data: {
      name: 'Sales & Partnerships',
      description: 'Client relationships, deals, and partnership management',
      color: '#10b981',
      icon: '🤝',
      workspaceId: workspace.id,
      createdById: salesRahul.id,
    }
  });

  console.log('  Created 3 spaces');

  // ─── DONE ─────────────────────────────────────────────────
  console.log('\nSeed complete!');
  console.log('Login: darsh@knowai.biz / admin123');
  console.log('All users share password: admin123');

  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
