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
  { firstName: 'Admin', lastName: 'User', email: 'admin@knowai.com', role: 'ADMIN', designation: 'System Administrator', department: 'Operations' },
  { firstName: 'Darsh', lastName: 'Mehta', email: 'darsh@knowai.com', role: 'CEO', designation: 'Chief Executive Officer', department: 'Executive' },
  { firstName: 'Ravi', lastName: 'Kumar', email: 'ravi@knowai.com', role: 'CTO', designation: 'Chief Technology Officer', department: 'Engineering' },
  { firstName: 'Priya', lastName: 'Sharma', email: 'priya@knowai.com', role: 'CFO', designation: 'Chief Financial Officer', department: 'Finance' },
  { firstName: 'Neha', lastName: 'Patel', email: 'neha@knowai.com', role: 'BRAND_FACE', designation: 'Brand Ambassador', department: 'Marketing' },
  { firstName: 'Anjali', lastName: 'Singh', email: 'anjali@knowai.com', role: 'HR', designation: 'HR Manager', department: 'Human Resources' },
  { firstName: 'Vikram', lastName: 'Joshi', email: 'vikram@knowai.com', role: 'ACCOUNTING', designation: 'Senior Accountant', department: 'Finance' },
  { firstName: 'Arjun', lastName: 'Reddy', email: 'arjun@knowai.com', role: 'PRODUCT_OWNER', designation: 'Product Owner', department: 'Product' },
  { firstName: 'Meera', lastName: 'Nair', email: 'meera@knowai.com', role: 'CONTENT_STRATEGIST', designation: 'Content Strategist', department: 'Content' },
  { firstName: 'Rahul', lastName: 'Gupta', email: 'rahul@knowai.com', role: 'BRAND_PARTNER', designation: 'Brand Partner', department: 'Marketing' },
  { firstName: 'Aditya', lastName: 'Verma', email: 'aditya@knowai.com', role: 'SR_DEVELOPER', designation: 'Senior React Developer', department: 'Engineering' },
  { firstName: 'Kavya', lastName: 'Iyer', email: 'kavya@knowai.com', role: 'EDITOR', designation: 'Senior Editor', department: 'Content' },
  { firstName: 'Sanjay', lastName: 'Das', email: 'sanjay@knowai.com', role: 'GRAPHIC_DESIGNER', designation: 'Lead Designer', department: 'Design' },
  { firstName: 'Pooja', lastName: 'Mishra', email: 'pooja@knowai.com', role: 'JR_DEVELOPER', designation: 'Junior Developer', department: 'Engineering' },
  { firstName: 'Amit', lastName: 'Tiwari', email: 'amit@knowai.com', role: 'GUY', designation: 'Team Member', department: 'Operations' },
  { firstName: 'Deepak', lastName: 'Yadav', email: 'deepak@knowai.com', role: 'OFFICE_BOY', designation: 'Office Assistant', department: 'Operations' },
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
    try { await prisma.$executeRawUnsafe(`DELETE FROM "${t}"`); } catch(e) {}
  }

  // Create workspace
  const workspace = await prisma.workspace.create({
    data: { name: 'Know AI', type: 'DEFAULT' }
  });
  console.log('Workspace created:', workspace.name);

  // Hash password
  const hash = await bcrypt.hash('admin123', 12);

  // Create users
  for (const u of SAMPLE_USERS) {
    const user = await prisma.user.create({
      data: {
        email: u.email,
        password: hash,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        designation: u.designation,
        department: u.department,
        workspaceId: workspace.id,
        status: 'ONLINE',
      }
    });
    console.log(`  Created ${u.role}: ${u.firstName} ${u.lastName} (${u.email})`);
  }

  // Create projects
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  const po = await prisma.user.findFirst({ where: { role: 'PRODUCT_OWNER' } });

  const project1 = await prisma.project.create({
    data: {
      name: 'Know AI ERP Platform',
      description: 'Building the enterprise management platform',
      status: 'ACTIVE',
      progress: 45,
      managerId: po.id,
      workspaceId: workspace.id,
      dueDate: new Date('2026-06-30'),
    }
  });

  const project2 = await prisma.project.create({
    data: {
      name: 'Brand Campaign Q1 2026',
      description: 'Marketing campaign for brand awareness',
      status: 'ACTIVE',
      progress: 70,
      managerId: po.id,
      workspaceId: workspace.id,
      dueDate: new Date('2026-03-31'),
    }
  });

  console.log('  Created 2 projects');

  // Fetch all users by role for reference
  const srDev = await prisma.user.findFirst({ where: { role: 'SR_DEVELOPER' } });
  const jrDev = await prisma.user.findFirst({ where: { role: 'JR_DEVELOPER' } });
  const editor = await prisma.user.findFirst({ where: { role: 'EDITOR' } });
  const designer = await prisma.user.findFirst({ where: { role: 'GRAPHIC_DESIGNER' } });
  const ceo = await prisma.user.findFirst({ where: { role: 'CEO' } });
  const cto = await prisma.user.findFirst({ where: { role: 'CTO' } });
  const cfo = await prisma.user.findFirst({ where: { role: 'CFO' } });
  const hr = await prisma.user.findFirst({ where: { role: 'HR' } });
  const accounting = await prisma.user.findFirst({ where: { role: 'ACCOUNTING' } });
  const brandFace = await prisma.user.findFirst({ where: { role: 'BRAND_FACE' } });
  const contentStrat = await prisma.user.findFirst({ where: { role: 'CONTENT_STRATEGIST' } });
  const brandPartner = await prisma.user.findFirst({ where: { role: 'BRAND_PARTNER' } });
  const guy = await prisma.user.findFirst({ where: { role: 'GUY' } });
  const officeBoy = await prisma.user.findFirst({ where: { role: 'OFFICE_BOY' } });

  // ─── 1. TASKS (15 total across both projects) ─────────────────
  const tasksData = [
    { title: 'Build Dashboard UI', description: 'Create the main dashboard with widgets and charts', status: 'IN_PROGRESS', priority: 'HIGH', assigneeId: srDev.id, projectId: project1.id, dueDate: new Date('2026-04-15') },
    { title: 'API Integration Tests', description: 'Write comprehensive API tests for all endpoints', status: 'TODO', priority: 'HIGH', assigneeId: srDev.id, projectId: project1.id, dueDate: new Date('2026-04-20') },
    { title: 'Design System Components', description: 'Build reusable UI component library', status: 'COMPLETED', priority: 'MEDIUM', assigneeId: designer.id, projectId: project1.id, dueDate: new Date('2026-03-10') },
    { title: 'Setup PostgreSQL Backup', description: 'Configure automated daily backups with pg_dump', status: 'TODO', priority: 'URGENT', assigneeId: jrDev.id, projectId: project1.id, dueDate: new Date('2026-03-20') },
    { title: 'Write User Documentation', description: 'Create onboarding guide and feature docs', status: 'IN_PROGRESS', priority: 'MEDIUM', assigneeId: editor.id, projectId: project1.id, dueDate: new Date('2026-04-30') },
    { title: 'Implement Auth Module', description: 'JWT authentication with refresh tokens', status: 'COMPLETED', priority: 'URGENT', assigneeId: srDev.id, projectId: project1.id, dueDate: new Date('2026-03-01') },
    { title: 'Mobile Responsive Fixes', description: 'Fix layout issues on mobile devices', status: 'IN_PROGRESS', priority: 'HIGH', assigneeId: jrDev.id, projectId: project1.id, dueDate: new Date('2026-04-10') },
    { title: 'Setup CI/CD Pipeline', description: 'GitHub Actions for automated testing and deployment', status: 'TODO', priority: 'HIGH', assigneeId: srDev.id, projectId: project1.id, dueDate: new Date('2026-04-25') },
    { title: 'Database Schema Optimization', description: 'Add missing indexes and optimize slow queries', status: 'IN_REVIEW', priority: 'MEDIUM', assigneeId: jrDev.id, projectId: project1.id, dueDate: new Date('2026-04-05') },
    { title: 'Create Marketing Materials', description: 'Design banners, social media posts, and brand kit', status: 'IN_PROGRESS', priority: 'HIGH', assigneeId: designer.id, projectId: project2.id, dueDate: new Date('2026-03-25') },
    { title: 'Social Media Content Plan', description: 'Plan 30-day content calendar for Instagram and LinkedIn', status: 'TODO', priority: 'MEDIUM', assigneeId: editor.id, projectId: project2.id, dueDate: new Date('2026-03-28') },
    { title: 'Brand Video Script', description: 'Write script for 2-minute brand intro video', status: 'COMPLETED', priority: 'HIGH', assigneeId: contentStrat.id, projectId: project2.id, dueDate: new Date('2026-03-05') },
    { title: 'Influencer Outreach', description: 'Contact 20 micro-influencers for brand collaboration', status: 'IN_PROGRESS', priority: 'MEDIUM', assigneeId: brandPartner.id, projectId: project2.id, dueDate: new Date('2026-03-30') },
    { title: 'Landing Page Redesign', description: 'Redesign knowai.com landing page for Q1 campaign', status: 'IN_REVIEW', priority: 'URGENT', assigneeId: designer.id, projectId: project2.id, dueDate: new Date('2026-03-22') },
    { title: 'Email Newsletter Setup', description: 'Configure Mailchimp templates and subscriber segments', status: 'TODO', priority: 'LOW', assigneeId: contentStrat.id, projectId: project2.id, dueDate: new Date('2026-04-01') },
  ];

  const createdTasks = [];
  for (const t of tasksData) {
    const task = await prisma.task.create({
      data: { ...t, createdById: admin.id }
    });
    createdTasks.push(task);
  }
  console.log(`  Created ${createdTasks.length} tasks`);

  // ─── 2. TASK DEPENDENCIES (3 blocking relationships) ──────────
  await prisma.taskDependency.create({
    data: { blockedTaskId: createdTasks[1].id, blockingTaskId: createdTasks[5].id } // API tests blocked by Auth Module
  });
  await prisma.taskDependency.create({
    data: { blockedTaskId: createdTasks[7].id, blockingTaskId: createdTasks[1].id } // CI/CD blocked by API tests
  });
  await prisma.taskDependency.create({
    data: { blockedTaskId: createdTasks[10].id, blockingTaskId: createdTasks[11].id } // Content Plan blocked by Video Script
  });
  console.log('  Created 3 task dependencies');

  // ─── 3. PAYROLL RECORDS (5 employees, March 2026) ─────────────
  const payrollData = [
    { employeeId: srDev.id, month: 3, year: 2026, basicPay: 85000, hra: 25500, transport: 3000, bonus: 5000, deductions: 12000, totalPay: 106500, status: 'PAID', paidOn: new Date('2026-03-01'), presentDays: 21, absentDays: 0, leaveDays: 1 },
    { employeeId: jrDev.id, month: 3, year: 2026, basicPay: 45000, hra: 13500, transport: 2000, bonus: 0, deductions: 6500, totalPay: 54000, status: 'PAID', paidOn: new Date('2026-03-01'), presentDays: 20, absentDays: 1, leaveDays: 1 },
    { employeeId: designer.id, month: 3, year: 2026, basicPay: 65000, hra: 19500, transport: 2500, bonus: 3000, deductions: 9000, totalPay: 81000, status: 'PENDING', presentDays: 18, absentDays: 2, leaveDays: 2 },
    { employeeId: editor.id, month: 3, year: 2026, basicPay: 55000, hra: 16500, transport: 2000, bonus: 0, deductions: 7500, totalPay: 66000, status: 'PENDING', presentDays: 22, absentDays: 0, leaveDays: 0 },
    { employeeId: hr.id, month: 3, year: 2026, basicPay: 70000, hra: 21000, transport: 3000, bonus: 5000, deductions: 10000, totalPay: 89000, status: 'PAID', paidOn: new Date('2026-03-01'), presentDays: 21, absentDays: 0, leaveDays: 1 },
  ];

  const createdPayrolls = [];
  for (const p of payrollData) {
    const payroll = await prisma.payroll.create({ data: p });
    createdPayrolls.push(payroll);
  }
  console.log(`  Created ${createdPayrolls.length} payroll records`);

  // ─── 4. PAYROLL LOGS (3 payment transactions) ─────────────────
  await prisma.payrollLog.create({
    data: { payrollId: createdPayrolls[0].id, amount: 106500, mode: 'BANK_TRANSFER', bankRef: 'UTR2026030100123', purpose: 'salary', remarks: 'March 2026 salary', paidById: cfo.id }
  });
  await prisma.payrollLog.create({
    data: { payrollId: createdPayrolls[1].id, amount: 54000, mode: 'BANK_TRANSFER', bankRef: 'UTR2026030100124', purpose: 'salary', remarks: 'March 2026 salary', paidById: cfo.id }
  });
  await prisma.payrollLog.create({
    data: { payrollId: createdPayrolls[4].id, amount: 89000, mode: 'UPI', bankRef: 'UPI2026030100045', purpose: 'salary', remarks: 'March 2026 salary via UPI', paidById: accounting.id }
  });
  console.log('  Created 3 payroll logs');

  // ─── 5. LEAVE REQUESTS (8 requests, mixed statuses/types) ─────
  const leaveData = [
    { employeeId: srDev.id, type: 'PAID', status: 'APPROVED', startDate: new Date('2026-03-20'), endDate: new Date('2026-03-21'), reason: 'Family function - sister wedding', approverId: hr.id, approvedAt: new Date('2026-03-15') },
    { employeeId: jrDev.id, type: 'SICK', status: 'APPROVED', startDate: new Date('2026-03-10'), endDate: new Date('2026-03-11'), reason: 'Fever and cold, doctor visit', approverId: hr.id, approvedAt: new Date('2026-03-10') },
    { employeeId: designer.id, type: 'PAID', status: 'PENDING', startDate: new Date('2026-03-25'), endDate: new Date('2026-03-28'), reason: 'Planned vacation to Goa', approverId: null },
    { employeeId: editor.id, type: 'WORK_FROM_HOME', status: 'APPROVED', startDate: new Date('2026-03-18'), endDate: new Date('2026-03-18'), reason: 'Internet installation at new apartment', approverId: hr.id, approvedAt: new Date('2026-03-17') },
    { employeeId: brandPartner.id, type: 'HALF_DAY', status: 'APPROVED', startDate: new Date('2026-03-19'), endDate: new Date('2026-03-19'), reason: 'Dentist appointment in the afternoon', approverId: hr.id, approvedAt: new Date('2026-03-18') },
    { employeeId: contentStrat.id, type: 'UNPAID', status: 'REJECTED', startDate: new Date('2026-03-16'), endDate: new Date('2026-03-20'), reason: 'Personal travel plans', approverId: hr.id, rejectedAt: new Date('2026-03-14'), approverNote: 'Critical campaign deadline, cannot approve extended leave' },
    { employeeId: guy.id, type: 'SICK', status: 'PENDING', startDate: new Date('2026-03-17'), endDate: new Date('2026-03-17'), reason: 'Migraine, unable to work today' },
    { employeeId: officeBoy.id, type: 'PAID', status: 'APPROVED', startDate: new Date('2026-03-24'), endDate: new Date('2026-03-24'), reason: 'Holi festival celebration at hometown', approverId: hr.id, approvedAt: new Date('2026-03-20') },
  ];

  for (const l of leaveData) {
    await prisma.leaveRequest.create({ data: l });
  }
  console.log(`  Created ${leaveData.length} leave requests`);

  // ─── 6. EXPENSES (10, mixed statuses/categories) ──────────────
  const expenseData = [
    { title: 'Client lunch at Taj Hotel', amount: 4500, category: 'FOOD', status: 'REIMBURSED', submitterId: brandPartner.id, approverId: cfo.id, approvedAt: new Date('2026-03-10'), expenseDate: new Date('2026-03-08') },
    { title: 'MacBook Pro charger replacement', amount: 7900, category: 'EQUIPMENT', status: 'APPROVED', submitterId: srDev.id, approverId: cfo.id, approvedAt: new Date('2026-03-12'), expenseDate: new Date('2026-03-11') },
    { title: 'Mumbai to Pune client visit', amount: 3200, category: 'TRAVEL', status: 'SUBMITTED', submitterId: brandFace.id, expenseDate: new Date('2026-03-14') },
    { title: 'Figma annual subscription', amount: 15600, category: 'SOFTWARE', status: 'APPROVED', submitterId: designer.id, approverId: cfo.id, approvedAt: new Date('2026-03-05'), expenseDate: new Date('2026-03-01') },
    { title: 'Office stationery and supplies', amount: 2100, category: 'OFFICE', status: 'DRAFT', submitterId: officeBoy.id, expenseDate: new Date('2026-03-15') },
    { title: 'Product photoshoot setup', amount: 18500, category: 'SHOOT', status: 'SUBMITTED', submitterId: contentStrat.id, expenseDate: new Date('2026-03-13') },
    { title: 'Google Ads campaign budget', amount: 50000, category: 'MARKETING', status: 'APPROVED', submitterId: brandPartner.id, approverId: ceo.id, approvedAt: new Date('2026-03-09'), expenseDate: new Date('2026-03-07') },
    { title: 'Petrol for client meetings', amount: 1800, category: 'FUEL', status: 'REIMBURSED', submitterId: guy.id, approverId: cfo.id, approvedAt: new Date('2026-03-06'), expenseDate: new Date('2026-03-04') },
    { title: 'AC servicing for office', amount: 3500, category: 'MAINTENANCE', status: 'DRAFT', submitterId: officeBoy.id, expenseDate: new Date('2026-03-16') },
    { title: 'Team dinner after sprint review', amount: 8200, category: 'FOOD', status: 'SUBMITTED', submitterId: po.id, expenseDate: new Date('2026-03-12') },
  ];

  for (const e of expenseData) {
    await prisma.expense.create({ data: e });
  }
  console.log(`  Created ${expenseData.length} expenses`);

  // ─── 7. MORE CLIENTS (total 8 with different industries) ──────
  const clientsData = [
    { name: 'TechVista Solutions', email: 'info@techvista.com', company: 'TechVista Solutions Pvt Ltd', industry: 'Technology', phone: '+91 9876543210', website: 'https://techvista.com' },
    { name: 'GreenLeaf Organics', email: 'hello@greenleaf.in', company: 'GreenLeaf Organics', industry: 'Agriculture', phone: '+91 9876543211', website: 'https://greenleaf.in' },
    { name: 'UrbanNest Realty', email: 'sales@urbannest.com', company: 'UrbanNest Realty', industry: 'Real Estate', phone: '+91 9876543212', website: 'https://urbannest.com' },
    { name: 'Bharat FinServ', email: 'contact@bharatfinserv.in', company: 'Bharat Financial Services', industry: 'Finance', phone: '+91 9876543213', website: 'https://bharatfinserv.in' },
    { name: 'CloudNine Health', email: 'admin@cloudninehealth.com', company: 'CloudNine Healthcare Pvt Ltd', industry: 'Healthcare', phone: '+91 9876543214', website: 'https://cloudninehealth.com' },
    { name: 'SpiceCraft Foods', email: 'orders@spicecraft.in', company: 'SpiceCraft Foods India', industry: 'Food & Beverage', phone: '+91 9876543215', website: 'https://spicecraft.in' },
    { name: 'EduVerse Academy', email: 'info@eduverse.co.in', company: 'EduVerse Learning Pvt Ltd', industry: 'Education', phone: '+91 9876543216', website: 'https://eduverse.co.in' },
    { name: 'AutoMitra Motors', email: 'service@automitra.in', company: 'AutoMitra Motors', industry: 'Automotive', phone: '+91 9876543217', website: 'https://automitra.in' },
  ];

  const createdClients = [];
  for (const c of clientsData) {
    const client = await prisma.client.create({
      data: { ...c, createdById: admin.id, workspaceId: workspace.id }
    });
    createdClients.push(client);
  }
  console.log(`  Created ${createdClients.length} clients`);

  // ─── 8. LEADS (10 across pipeline stages) ─────────────────────
  const leadsData = [
    { title: 'TechVista ERP Implementation', value: 1500000, status: 'WON', source: 'Referral', clientId: createdClients[0].id, assigneeId: brandPartner.id, notes: 'Signed 12-month contract' },
    { title: 'GreenLeaf Website Redesign', value: 350000, status: 'PROPOSAL', source: 'Website', clientId: createdClients[1].id, assigneeId: contentStrat.id, nextFollowUp: new Date('2026-03-20') },
    { title: 'UrbanNest CRM Setup', value: 800000, status: 'QUALIFIED', source: 'Cold Email', clientId: createdClients[2].id, assigneeId: brandPartner.id, nextFollowUp: new Date('2026-03-22') },
    { title: 'Bharat FinServ Compliance Portal', value: 2500000, status: 'NEGOTIATION', source: 'LinkedIn', clientId: createdClients[3].id, assigneeId: po.id, nextFollowUp: new Date('2026-03-19') },
    { title: 'CloudNine Patient Portal', value: 1200000, status: 'CONTACTED', source: 'Conference', clientId: createdClients[4].id, assigneeId: brandPartner.id, nextFollowUp: new Date('2026-03-25') },
    { title: 'SpiceCraft E-Commerce Platform', value: 600000, status: 'NEW', source: 'Website', clientId: createdClients[5].id, assigneeId: null },
    { title: 'EduVerse LMS Development', value: 900000, status: 'PROPOSAL', source: 'Referral', clientId: createdClients[6].id, assigneeId: contentStrat.id, nextFollowUp: new Date('2026-03-21') },
    { title: 'AutoMitra Inventory System', value: 450000, status: 'LOST', source: 'Cold Call', clientId: createdClients[7].id, assigneeId: brandPartner.id, notes: 'Went with competitor due to pricing' },
    { title: 'Startup X Mobile App', value: 750000, status: 'NEW', source: 'Inbound', assigneeId: null, notes: 'Early stage startup, needs MVP' },
    { title: 'Government Tender - Smart City', value: 5000000, status: 'CONTACTED', source: 'Tender Portal', assigneeId: ceo.id, nextFollowUp: new Date('2026-03-18'), notes: 'Deadline for submission: April 15' },
  ];

  for (const l of leadsData) {
    await prisma.lead.create({
      data: { ...l, createdById: admin.id, workspaceId: workspace.id }
    });
  }
  console.log(`  Created ${leadsData.length} leads`);

  // ─── 9. INVOICES (6 with line items JSON) ─────────────────────
  const invoicesData = [
    {
      invoiceNumber: 'INV-2026-001',
      clientName: 'TechVista Solutions Pvt Ltd', clientEmail: 'accounts@techvista.com', clientPhone: '+91 9876543210',
      clientAddress: '42, Electronic City, Bengaluru, Karnataka 560100',
      items: JSON.stringify([
        { description: 'ERP Platform Development - Phase 1', quantity: 1, rate: 500000, amount: 500000 },
        { description: 'UI/UX Design Services', quantity: 40, rate: 5000, amount: 200000 },
        { description: 'Project Management', quantity: 1, rate: 100000, amount: 100000 },
      ]),
      subtotal: 800000, tax: 144000, discount: 0, total: 944000,
      status: 'PAID', paidOn: new Date('2026-02-28'), dueDate: new Date('2026-02-28'),
      createdById: accounting.id, clientId: createdClients[0].id,
    },
    {
      invoiceNumber: 'INV-2026-002',
      clientName: 'GreenLeaf Organics', clientEmail: 'finance@greenleaf.in', clientPhone: '+91 9876543211',
      clientAddress: '15, Baner Road, Pune, Maharashtra 411045',
      items: JSON.stringify([
        { description: 'Website Redesign', quantity: 1, rate: 200000, amount: 200000 },
        { description: 'Content Writing (10 pages)', quantity: 10, rate: 5000, amount: 50000 },
      ]),
      subtotal: 250000, tax: 45000, discount: 10000, total: 285000,
      status: 'SENT', dueDate: new Date('2026-03-31'),
      createdById: accounting.id, clientId: createdClients[1].id,
    },
    {
      invoiceNumber: 'INV-2026-003',
      clientName: 'Bharat Financial Services', clientEmail: 'payments@bharatfinserv.in', clientPhone: '+91 9876543213',
      clientAddress: '101, Nariman Point, Mumbai, Maharashtra 400021',
      items: JSON.stringify([
        { description: 'Compliance Portal - Discovery Phase', quantity: 1, rate: 300000, amount: 300000 },
        { description: 'Security Audit', quantity: 1, rate: 150000, amount: 150000 },
      ]),
      subtotal: 450000, tax: 81000, discount: 0, total: 531000,
      status: 'OVERDUE', dueDate: new Date('2026-03-01'),
      createdById: accounting.id, clientId: createdClients[3].id,
    },
    {
      invoiceNumber: 'INV-2026-004',
      clientName: 'CloudNine Healthcare Pvt Ltd', clientEmail: 'billing@cloudninehealth.com',
      clientAddress: '7th Floor, MG Road, Bengaluru, Karnataka 560001',
      items: JSON.stringify([
        { description: 'Patient Portal MVP', quantity: 1, rate: 400000, amount: 400000 },
      ]),
      subtotal: 400000, tax: 72000, discount: 20000, total: 452000,
      status: 'DRAFT', dueDate: new Date('2026-04-15'),
      createdById: accounting.id, clientId: createdClients[4].id,
    },
    {
      invoiceNumber: 'INV-2026-005',
      clientName: 'EduVerse Learning Pvt Ltd', clientEmail: 'admin@eduverse.co.in',
      clientAddress: '22, Koramangala, Bengaluru, Karnataka 560034',
      items: JSON.stringify([
        { description: 'LMS Development - Sprint 1', quantity: 1, rate: 250000, amount: 250000 },
        { description: 'AWS Infrastructure Setup', quantity: 1, rate: 50000, amount: 50000 },
        { description: 'Training & Handover', quantity: 2, rate: 25000, amount: 50000 },
      ]),
      subtotal: 350000, tax: 63000, discount: 0, total: 413000,
      status: 'SENT', dueDate: new Date('2026-04-01'),
      createdById: cfo.id, clientId: createdClients[6].id,
    },
    {
      invoiceNumber: 'INV-2026-006',
      clientName: 'SpiceCraft Foods India', clientEmail: 'accounts@spicecraft.in',
      clientAddress: '88, Anna Salai, Chennai, Tamil Nadu 600002',
      items: JSON.stringify([
        { description: 'E-Commerce Platform Development', quantity: 1, rate: 350000, amount: 350000 },
        { description: 'Payment Gateway Integration', quantity: 1, rate: 75000, amount: 75000 },
      ]),
      subtotal: 425000, tax: 76500, discount: 25000, total: 476500,
      status: 'PAID', paidOn: new Date('2026-03-10'), dueDate: new Date('2026-03-15'),
      createdById: accounting.id, clientId: createdClients[5].id,
    },
  ];

  for (const inv of invoicesData) {
    await prisma.invoice.create({ data: inv });
  }
  console.log(`  Created ${invoicesData.length} invoices`);

  // ─── 10. JOB POSTINGS (3 open positions) ──────────────────────
  const jobPostingsData = [
    {
      title: 'Senior Full Stack Developer',
      department: 'Engineering',
      description: 'We are looking for an experienced full stack developer proficient in React, Node.js, and PostgreSQL to join our growing engineering team.',
      requirements: JSON.stringify(['5+ years experience with React/Next.js', '3+ years Node.js/Express', 'PostgreSQL and Prisma ORM', 'Experience with AWS or GCP', 'Strong system design skills']),
      salaryMin: 1200000, salaryMax: 1800000, location: 'Bengaluru (Hybrid)', type: 'Full-time',
      status: 'OPEN', createdById: hr.id,
    },
    {
      title: 'UI/UX Designer',
      department: 'Design',
      description: 'Join our design team to create beautiful, intuitive interfaces for enterprise products. Must have strong Figma skills and a portfolio of SaaS/B2B work.',
      requirements: JSON.stringify(['3+ years UI/UX experience', 'Expert in Figma and Adobe Suite', 'Portfolio with SaaS/enterprise projects', 'Understanding of design systems', 'User research experience']),
      salaryMin: 800000, salaryMax: 1200000, location: 'Bengaluru (On-site)', type: 'Full-time',
      status: 'OPEN', createdById: hr.id,
    },
    {
      title: 'Content Marketing Intern',
      department: 'Content',
      description: 'Exciting internship opportunity for someone passionate about content marketing, social media, and brand storytelling.',
      requirements: JSON.stringify(['Currently pursuing or recently completed degree in Marketing/Communications', 'Strong writing skills in English', 'Familiarity with social media platforms', 'Basic knowledge of SEO']),
      salaryMin: 15000, salaryMax: 25000, location: 'Remote', type: 'Intern',
      status: 'OPEN', createdById: hr.id,
    },
  ];

  const createdJobs = [];
  for (const j of jobPostingsData) {
    const job = await prisma.jobPosting.create({ data: j });
    createdJobs.push(job);
  }
  console.log(`  Created ${createdJobs.length} job postings`);

  // ─── 11. JOB CANDIDATES (8 at various stages) ─────────────────
  const candidatesData = [
    { jobId: createdJobs[0].id, name: 'Rohit Saxena', email: 'rohit.saxena@gmail.com', phone: '+91 9988776655', status: 'FINAL_INTERVIEW', reviewerId: cto.id, reviewNotes: 'Strong technical skills, excellent system design', linkedinUrl: 'https://linkedin.com/in/rohitsaxena' },
    { jobId: createdJobs[0].id, name: 'Sneha Kulkarni', email: 'sneha.k@outlook.com', phone: '+91 9988776656', status: 'PRACTICAL_TASK', reviewerId: srDev.id, reviewNotes: 'Good React skills, needs to evaluate backend depth', practicalTaskUrl: 'https://github.com/knowai/take-home-test', practicalDeadline: new Date('2026-03-22') },
    { jobId: createdJobs[0].id, name: 'Manish Chandra', email: 'manish.chandra@yahoo.com', phone: '+91 9988776657', status: 'REJECTED', reviewerId: cto.id, reviewNotes: 'Insufficient experience with PostgreSQL', finalNotes: 'Rejected after round 1' },
    { jobId: createdJobs[0].id, name: 'Divya Raghavan', email: 'divya.r@protonmail.com', phone: '+91 9988776658', status: 'OFFERED', reviewerId: cto.id, reviewNotes: 'Exceptional candidate, 7 years experience', offeredSalary: 1600000, linkedinUrl: 'https://linkedin.com/in/divyaraghavan' },
    { jobId: createdJobs[1].id, name: 'Ishaan Malhotra', email: 'ishaan.design@gmail.com', phone: '+91 9988776659', status: 'INTERVIEW_ROUND_1', reviewerId: designer.id, portfolioUrl: 'https://dribbble.com/ishaanm', reviewNotes: 'Impressive portfolio, strong Figma skills' },
    { jobId: createdJobs[1].id, name: 'Tanvi Bhatt', email: 'tanvi.bhatt@gmail.com', phone: '+91 9988776660', status: 'RESUME_REVIEW', reviewerId: designer.id, portfolioUrl: 'https://behance.net/tanvibhatt' },
    { jobId: createdJobs[2].id, name: 'Aakash Jain', email: 'aakash.jain@gmail.com', phone: '+91 9988776661', status: 'APPLIED', coverLetter: 'I am a final year BBA student passionate about content marketing and digital storytelling.' },
    { jobId: createdJobs[2].id, name: 'Nandini Rao', email: 'nandini.rao@gmail.com', phone: '+91 9988776662', status: 'INTERVIEW_ROUND_1', reviewerId: contentStrat.id, coverLetter: 'Recently completed MBA in Marketing from Symbiosis. Eager to learn and contribute.', reviewNotes: 'Enthusiastic, good writing samples' },
  ];

  for (const c of candidatesData) {
    await prisma.jobCandidate.create({ data: c });
  }
  console.log(`  Created ${candidatesData.length} job candidates`);

  // ─── 12. CALENDAR EVENTS (10 events for this week) ────────────
  const calendarData = [
    { title: 'Daily Standup', description: 'Engineering team daily sync', startDate: new Date('2026-03-17T09:30:00'), endDate: new Date('2026-03-17T09:45:00'), color: '#3b82f6', calendarType: 'meeting', createdById: cto.id },
    { title: 'Sprint Planning', description: 'Plan Sprint 14 tasks and priorities', startDate: new Date('2026-03-17T10:00:00'), endDate: new Date('2026-03-17T11:30:00'), color: '#8b5cf6', calendarType: 'meeting', createdById: po.id },
    { title: 'Client Call - TechVista', description: 'Phase 2 requirements discussion', startDate: new Date('2026-03-17T14:00:00'), endDate: new Date('2026-03-17T15:00:00'), color: '#ef4444', calendarType: 'meeting', createdById: brandPartner.id },
    { title: 'Design Review', description: 'Review landing page redesign mockups', startDate: new Date('2026-03-18T11:00:00'), endDate: new Date('2026-03-18T12:00:00'), color: '#f59e0b', calendarType: 'meeting', createdById: designer.id },
    { title: 'HR Sync - Leave Approvals', description: 'Review pending leave requests', startDate: new Date('2026-03-18T15:00:00'), endDate: new Date('2026-03-18T15:30:00'), color: '#10b981', calendarType: 'meeting', createdById: hr.id },
    { title: 'Candidate Interview - Rohit Saxena', description: 'Final round with CTO and CEO', startDate: new Date('2026-03-19T10:00:00'), endDate: new Date('2026-03-19T11:00:00'), color: '#ec4899', calendarType: 'interview', createdById: hr.id },
    { title: 'Team Lunch', description: 'Monthly team lunch at Truffles, Koramangala', startDate: new Date('2026-03-19T12:30:00'), endDate: new Date('2026-03-19T14:00:00'), color: '#f97316', calendarType: 'event', createdById: admin.id },
    { title: 'Code Review Session', description: 'Review PRs for dashboard and auth modules', startDate: new Date('2026-03-20T14:00:00'), endDate: new Date('2026-03-20T15:30:00'), color: '#6366f1', calendarType: 'meeting', createdById: srDev.id },
    { title: 'Payroll Processing', description: 'Process remaining March payroll', startDate: new Date('2026-03-20T10:00:00'), endDate: new Date('2026-03-20T11:00:00'), color: '#14b8a6', calendarType: 'task', createdById: cfo.id },
    { title: 'Weekly Retrospective', description: 'Sprint 13 retro - what went well, what to improve', startDate: new Date('2026-03-21T16:00:00'), endDate: new Date('2026-03-21T17:00:00'), color: '#8b5cf6', calendarType: 'meeting', createdById: po.id },
  ];

  for (const ev of calendarData) {
    await prisma.calendarEvent.create({ data: ev });
  }
  console.log(`  Created ${calendarData.length} calendar events`);

  // ─── 13. CONTACTS (8 contacts with labels) ────────────────────
  const contactsData = [
    { name: 'Suresh Menon', email: 'suresh.menon@techvista.com', phone: '+91 9900112233', title: 'CTO', company: 'TechVista Solutions', label: 'CLIENT', avatarColor: '#3b82f6' },
    { name: 'Lakshmi Iyer', email: 'lakshmi@greenleaf.in', phone: '+91 9900112234', title: 'Founder', company: 'GreenLeaf Organics', label: 'CLIENT', avatarColor: '#10b981' },
    { name: 'Rajesh Khanna', email: 'rajesh@awspartner.in', phone: '+91 9900112235', title: 'Solutions Architect', company: 'AWS India', label: 'VENDOR', avatarColor: '#f59e0b' },
    { name: 'Anita Desai', email: 'anita.desai@vc.fund', phone: '+91 9900112236', title: 'Partner', company: 'Sequoia Capital India', label: 'INVESTOR', avatarColor: '#8b5cf6' },
    { name: 'Farhan Sheikh', email: 'farhan@digitalmarketing.co', phone: '+91 9900112237', title: 'CEO', company: 'DigiBoost Agency', label: 'PARTNER', avatarColor: '#ec4899' },
    { name: 'Nirmala Sitharaman', email: 'nirmala@bharatfinserv.in', phone: '+91 9900112238', title: 'CFO', company: 'Bharat Financial Services', label: 'CLIENT', avatarColor: '#ef4444' },
    { name: 'Karthik Subramanian', email: 'karthik@startupx.io', phone: '+91 9900112239', title: 'Founder', company: 'Startup X', label: 'LEAD', avatarColor: '#6366f1' },
    { name: 'Preeti Zinta', email: 'preeti@cloudninehealth.com', phone: '+91 9900112240', title: 'Head of IT', company: 'CloudNine Healthcare', label: 'CLIENT', avatarColor: '#14b8a6' },
  ];

  for (const ct of contactsData) {
    await prisma.contact.create({ data: { ...ct, createdById: admin.id } });
  }
  console.log(`  Created ${contactsData.length} contacts`);

  // ─── 14. CHAT ROOMS (3 rooms) ─────────────────────────────────
  const generalRoom = await prisma.chatRoom.create({
    data: { name: 'General', type: 'group', createdById: admin.id }
  });
  const engineeringRoom = await prisma.chatRoom.create({
    data: { name: 'Engineering', type: 'department', department: 'Engineering', createdById: cto.id }
  });
  const dmRoom = await prisma.chatRoom.create({
    data: { name: null, type: 'dm', createdById: srDev.id }
  });

  // Add members to rooms
  const allUsers = [admin, ceo, cto, cfo, brandFace, hr, accounting, po, contentStrat, brandPartner, srDev, editor, designer, jrDev, guy, officeBoy];
  for (const u of allUsers) {
    await prisma.chatRoomMember.create({ data: { roomId: generalRoom.id, userId: u.id } });
  }
  for (const u of [cto, srDev, jrDev, po]) {
    await prisma.chatRoomMember.create({ data: { roomId: engineeringRoom.id, userId: u.id } });
  }
  for (const u of [srDev, jrDev]) {
    await prisma.chatRoomMember.create({ data: { roomId: dmRoom.id, userId: u.id } });
  }
  console.log('  Created 3 chat rooms with members');

  // ─── 15. CHAT MESSAGES (10 messages across rooms) ─────────────
  const chatMessagesData = [
    { roomId: generalRoom.id, senderId: ceo.id, content: 'Good morning team! Big week ahead with the Q1 campaign wrapping up. Let us give it our best!', createdAt: new Date('2026-03-17T09:00:00') },
    { roomId: generalRoom.id, senderId: hr.id, content: 'Reminder: Holi holiday on March 24th. Office will be closed.', createdAt: new Date('2026-03-17T09:05:00') },
    { roomId: generalRoom.id, senderId: officeBoy.id, content: 'Tea and snacks are ready in the pantry!', createdAt: new Date('2026-03-17T10:30:00') },
    { roomId: generalRoom.id, senderId: designer.id, content: 'Landing page redesign mockups are ready for review. Please check Figma link in the design channel.', createdAt: new Date('2026-03-17T11:00:00') },
    { roomId: engineeringRoom.id, senderId: cto.id, content: 'Sprint 14 planning at 10 AM today. Please update your Jira tickets before the meeting.', createdAt: new Date('2026-03-17T09:15:00') },
    { roomId: engineeringRoom.id, senderId: srDev.id, content: 'Dashboard UI is 80% done. Will push the PR by EOD today.', createdAt: new Date('2026-03-17T09:20:00') },
    { roomId: engineeringRoom.id, senderId: jrDev.id, content: 'I am stuck on the database backup script. Can someone help me with pg_dump cron setup?', createdAt: new Date('2026-03-17T09:25:00') },
    { roomId: engineeringRoom.id, senderId: cto.id, content: 'Sure, let us pair on it after standup. I will show you the Docker approach we used before.', createdAt: new Date('2026-03-17T09:27:00') },
    { roomId: dmRoom.id, senderId: srDev.id, content: 'Hey Pooja, how is the mobile responsive fix going? Need any help with the CSS grid layout?', createdAt: new Date('2026-03-17T11:30:00') },
    { roomId: dmRoom.id, senderId: jrDev.id, content: 'Hi Aditya! Almost done with the header and sidebar. The table component on small screens is tricky though. Could use a quick review.', createdAt: new Date('2026-03-17T11:35:00') },
  ];

  for (const msg of chatMessagesData) {
    await prisma.chatMessage.create({ data: msg });
  }
  console.log(`  Created ${chatMessagesData.length} chat messages`);

  // ─── 16. NOTIFICATIONS (15 for various users) ─────────────────
  const notificationsData = [
    { type: 'TASK_ASSIGNED', title: 'New Task Assigned', message: 'You have been assigned "Build Dashboard UI"', userId: srDev.id, linkUrl: '/tasks', read: false },
    { type: 'TASK_ASSIGNED', title: 'New Task Assigned', message: 'You have been assigned "Setup PostgreSQL Backup"', userId: jrDev.id, linkUrl: '/tasks', read: false },
    { type: 'TASK_COMPLETED', title: 'Task Completed', message: 'Aditya completed "Implement Auth Module"', userId: po.id, linkUrl: '/tasks', read: true },
    { type: 'TASK_OVERDUE', title: 'Task Overdue', message: '"Setup PostgreSQL Backup" is past its due date', userId: jrDev.id, linkUrl: '/tasks', read: false },
    { type: 'LEAVE_APPROVED', title: 'Leave Approved', message: 'Your leave request for March 20-21 has been approved', userId: srDev.id, linkUrl: '/hr/leaves', read: true },
    { type: 'LEAVE_REJECTED', title: 'Leave Rejected', message: 'Your unpaid leave request has been rejected. Reason: Critical campaign deadline', userId: contentStrat.id, linkUrl: '/hr/leaves', read: false },
    { type: 'LEAD_ASSIGNED', title: 'New Lead Assigned', message: 'You have been assigned the lead "UrbanNest CRM Setup"', userId: brandPartner.id, linkUrl: '/crm/leads', read: false },
    { type: 'CHAT_MENTION', title: 'Mentioned in Chat', message: 'Ravi mentioned you in Engineering channel', userId: jrDev.id, linkUrl: '/chat', read: false },
    { type: 'SYSTEM', title: 'System Update', message: 'Know AI ERP has been updated to v2.4.0. Check release notes for details.', userId: admin.id, linkUrl: '/settings', read: true },
    { type: 'DOCUMENT_VERIFIED', title: 'Document Verified', message: 'Your Aadhaar card has been verified by HR', userId: guy.id, linkUrl: '/hr/documents', read: true },
    { type: 'COMPLAINT_FILED', title: 'New Complaint Filed', message: 'A new complaint has been filed and assigned to you for review', userId: hr.id, linkUrl: '/hr/complaints', read: false },
    { type: 'TASK_COMMENT', title: 'New Comment on Task', message: 'Sanjay commented on "Create Marketing Materials": Mockups uploaded to Figma', userId: brandFace.id, linkUrl: '/tasks', read: false },
    { type: 'SYSTEM', title: 'Payroll Processed', message: 'March 2026 payroll has been processed. Check your salary slip.', userId: srDev.id, linkUrl: '/hr/payroll', read: false },
    { type: 'SYSTEM', title: 'Payroll Processed', message: 'March 2026 payroll has been processed. Check your salary slip.', userId: jrDev.id, linkUrl: '/hr/payroll', read: false },
    { type: 'TASK_ASSIGNED', title: 'New Task Assigned', message: 'You have been assigned "Landing Page Redesign"', userId: designer.id, linkUrl: '/tasks', read: false },
  ];

  for (const n of notificationsData) {
    await prisma.notification.create({ data: n });
  }
  console.log(`  Created ${notificationsData.length} notifications`);

  // ─── 17. FILES (5 files with realistic names) ─────────────────
  const filesData = [
    { name: 'Q1_Brand_Campaign_Strategy.pdf', size: 2450000, fileType: 'application/pdf', isFolder: false, uploadedById: contentStrat.id },
    { name: 'ERP_Dashboard_Mockup_v3.fig', size: 8900000, fileType: 'application/figma', isFolder: false, uploadedById: designer.id },
    { name: 'API_Documentation_v2.1.md', size: 45000, fileType: 'text/markdown', isFolder: false, uploadedById: srDev.id },
    { name: 'Employee_Handbook_2026.pdf', size: 3200000, fileType: 'application/pdf', isFolder: false, uploadedById: hr.id },
    { name: 'March_2026_Expense_Report.xlsx', size: 128000, fileType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', isFolder: false, uploadedById: accounting.id },
  ];

  for (const f of filesData) {
    await prisma.file.create({ data: f });
  }
  console.log(`  Created ${filesData.length} files`);

  // ─── 18. GOALS (4 goals: 2 company, 2 personal) ──────────────
  const goalsData = [
    {
      title: 'Achieve 50 Lakh ARR by Q2 2026',
      description: 'Grow annual recurring revenue to INR 50 lakh through new client acquisition and upselling existing accounts',
      type: 'OBJECTIVE', scope: 'COMPANY', ownerId: ceo.id, workspaceId: workspace.id,
      startDate: new Date('2026-01-01'), endDate: new Date('2026-06-30'),
      progress: 35, status: 'ON_TRACK', metricType: 'CURRENCY', metricCurrent: 1750000, metricTarget: 5000000,
    },
    {
      title: 'Launch ERP Platform v1.0',
      description: 'Complete development and launch the full ERP platform with all core modules',
      type: 'OBJECTIVE', scope: 'COMPANY', ownerId: cto.id, workspaceId: workspace.id,
      startDate: new Date('2026-01-01'), endDate: new Date('2026-06-30'),
      progress: 45, status: 'ON_TRACK', metricType: 'PERCENTAGE', metricCurrent: 45, metricTarget: 100,
    },
    {
      title: 'Complete AWS Solutions Architect Certification',
      description: 'Pass the AWS SAA-C03 exam to strengthen cloud architecture skills',
      type: 'TARGET', scope: 'PERSONAL', ownerId: srDev.id, workspaceId: workspace.id,
      startDate: new Date('2026-02-01'), endDate: new Date('2026-05-31'),
      progress: 60, status: 'ON_TRACK', metricType: 'PERCENTAGE', metricCurrent: 60, metricTarget: 100,
    },
    {
      title: 'Onboard 5 New Clients This Quarter',
      description: 'Close deals and onboard 5 new paying clients in Q1',
      type: 'KEY_RESULT', scope: 'PERSONAL', ownerId: brandPartner.id, workspaceId: workspace.id,
      startDate: new Date('2026-01-01'), endDate: new Date('2026-03-31'),
      progress: 40, status: 'AT_RISK', metricType: 'NUMBER', metricCurrent: 2, metricTarget: 5,
    },
  ];

  for (const g of goalsData) {
    await prisma.goal.create({ data: g });
  }
  console.log(`  Created ${goalsData.length} goals`);

  // ─── 19. TIME ENTRIES (10 entries this week) ──────────────────
  const timeEntriesData = [
    { userId: srDev.id, taskId: createdTasks[0].id, projectId: project1.id, description: 'Dashboard layout and chart components', startTime: new Date('2026-03-17T09:00:00'), endTime: new Date('2026-03-17T12:30:00'), duration: 210, billable: true, workspaceId: workspace.id },
    { userId: srDev.id, taskId: createdTasks[0].id, projectId: project1.id, description: 'Dashboard API integration', startTime: new Date('2026-03-17T13:30:00'), endTime: new Date('2026-03-17T17:00:00'), duration: 210, billable: true, workspaceId: workspace.id },
    { userId: jrDev.id, taskId: createdTasks[6].id, projectId: project1.id, description: 'Mobile responsive header and sidebar', startTime: new Date('2026-03-17T09:00:00'), endTime: new Date('2026-03-17T13:00:00'), duration: 240, billable: true, workspaceId: workspace.id },
    { userId: jrDev.id, taskId: createdTasks[3].id, projectId: project1.id, description: 'Research pg_dump backup strategies', startTime: new Date('2026-03-17T14:00:00'), endTime: new Date('2026-03-17T17:00:00'), duration: 180, billable: true, workspaceId: workspace.id },
    { userId: designer.id, taskId: createdTasks[9].id, projectId: project2.id, description: 'Social media banner designs', startTime: new Date('2026-03-17T10:00:00'), endTime: new Date('2026-03-17T14:00:00'), duration: 240, billable: true, workspaceId: workspace.id },
    { userId: designer.id, taskId: createdTasks[13].id, projectId: project2.id, description: 'Landing page hero section redesign', startTime: new Date('2026-03-17T14:30:00'), endTime: new Date('2026-03-17T18:00:00'), duration: 210, billable: true, workspaceId: workspace.id },
    { userId: editor.id, taskId: createdTasks[4].id, projectId: project1.id, description: 'Writing onboarding guide draft', startTime: new Date('2026-03-17T09:30:00'), endTime: new Date('2026-03-17T12:00:00'), duration: 150, billable: true, workspaceId: workspace.id },
    { userId: contentStrat.id, taskId: createdTasks[14].id, projectId: project2.id, description: 'Mailchimp template setup', startTime: new Date('2026-03-18T09:00:00'), endTime: new Date('2026-03-18T11:30:00'), duration: 150, billable: true, workspaceId: workspace.id },
    { userId: brandPartner.id, taskId: createdTasks[12].id, projectId: project2.id, description: 'Drafting influencer outreach emails', startTime: new Date('2026-03-18T10:00:00'), endTime: new Date('2026-03-18T13:00:00'), duration: 180, billable: false, workspaceId: workspace.id },
    { userId: po.id, projectId: project1.id, description: 'Sprint planning and backlog grooming', startTime: new Date('2026-03-17T10:00:00'), endTime: new Date('2026-03-17T12:00:00'), duration: 120, billable: false, workspaceId: workspace.id },
  ];

  for (const te of timeEntriesData) {
    await prisma.timeEntry.create({ data: te });
  }
  console.log(`  Created ${timeEntriesData.length} time entries`);

  // ─── 20. DOCS (3 wiki docs) ───────────────────────────────────
  const docsData = [
    {
      title: 'Engineering Onboarding Guide',
      content: '# Engineering Onboarding Guide\n\n## Welcome to Know AI Engineering!\n\nThis guide will help you get started with our development environment and workflows.\n\n## Tech Stack\n- **Frontend**: React 18, Next.js 14, Tailwind CSS\n- **Backend**: Node.js, Express, Prisma ORM\n- **Database**: PostgreSQL 16\n- **Hosting**: AWS (EC2, RDS, S3)\n\n## Getting Started\n1. Clone the repository: `git clone git@github.com:knowai/erp.git`\n2. Install dependencies: `npm install`\n3. Setup database: `npx prisma migrate dev`\n4. Run seed: `npx prisma db seed`\n5. Start dev server: `npm run dev`\n\n## Code Review Process\n- All PRs require at least 1 approval\n- Run tests locally before pushing\n- Follow conventional commits',
      icon: '📖', createdById: cto.id, workspaceId: workspace.id, projectId: project1.id, isPublished: true,
    },
    {
      title: 'Brand Guidelines 2026',
      content: '# Know AI Brand Guidelines\n\n## Brand Colors\n- Primary: #3b82f6 (Blue)\n- Secondary: #8b5cf6 (Purple)\n- Accent: #f59e0b (Amber)\n- Success: #10b981\n- Error: #ef4444\n\n## Typography\n- Headings: Inter Bold\n- Body: Inter Regular\n- Code: JetBrains Mono\n\n## Logo Usage\n- Minimum size: 32px height\n- Clear space: 1x logo height on all sides\n- Do not stretch, rotate, or recolor\n\n## Voice & Tone\n- Professional but approachable\n- Clear and concise\n- Action-oriented\n- Avoid jargon unless audience is technical',
      icon: '🎨', createdById: brandFace.id, workspaceId: workspace.id, projectId: project2.id, isPublished: true,
    },
    {
      title: 'API Endpoints Reference',
      content: '# API Endpoints Reference\n\n## Authentication\n- `POST /api/auth/login` - Login with email/password\n- `POST /api/auth/register` - Register new user\n- `POST /api/auth/refresh` - Refresh JWT token\n\n## Users\n- `GET /api/users` - List all users\n- `GET /api/users/:id` - Get user by ID\n- `PUT /api/users/:id` - Update user\n\n## Projects\n- `GET /api/projects` - List projects\n- `POST /api/projects` - Create project\n- `PUT /api/projects/:id` - Update project\n\n## Tasks\n- `GET /api/tasks` - List tasks (filterable)\n- `POST /api/tasks` - Create task\n- `PUT /api/tasks/:id` - Update task\n- `DELETE /api/tasks/:id` - Delete task\n\n## Notes\n- All endpoints require Bearer token\n- Rate limit: 100 requests/minute\n- Response format: JSON',
      icon: '🔗', createdById: srDev.id, workspaceId: workspace.id, projectId: project1.id, isPublished: true,
    },
  ];

  for (const d of docsData) {
    await prisma.doc.create({ data: d });
  }
  console.log(`  Created ${docsData.length} docs`);

  // ─── 21. COMPLAINTS (2 complaints) ────────────────────────────
  const complaint1 = await prisma.complaint.create({
    data: {
      category: 'LEAVE_DISPUTE',
      subject: 'Unfair Leave Rejection',
      description: 'My unpaid leave request for March 16-20 was rejected without proper discussion. I had planned this trip months ago and the reason given was vague.',
      status: 'UNDER_REVIEW',
      escalationLevel: 'HR',
      filedById: contentStrat.id,
      againstId: hr.id,
      assignedToId: ceo.id,
      workspaceId: workspace.id,
    }
  });

  await prisma.complaintTimeline.create({
    data: { complaintId: complaint1.id, action: 'FILED', note: 'Complaint filed by Meera Nair', actorId: contentStrat.id }
  });
  await prisma.complaintTimeline.create({
    data: { complaintId: complaint1.id, action: 'ASSIGNED', note: 'Escalated to CEO for review', actorId: hr.id }
  });

  const complaint2 = await prisma.complaint.create({
    data: {
      category: 'WORKPLACE_SAFETY',
      subject: 'Broken AC in Server Room',
      description: 'The air conditioning in the server room has been broken for 3 days. Temperature is rising and it could damage the equipment.',
      status: 'OPEN',
      escalationLevel: 'HR',
      filedById: officeBoy.id,
      againstId: admin.id,
      assignedToId: hr.id,
      workspaceId: workspace.id,
    }
  });

  await prisma.complaintTimeline.create({
    data: { complaintId: complaint2.id, action: 'FILED', note: 'Complaint filed by Deepak Yadav', actorId: officeBoy.id }
  });

  console.log('  Created 2 complaints with timelines');

  // ─── 22. SPACES (2 spaces) ────────────────────────────────────
  await prisma.space.create({
    data: {
      name: 'Engineering',
      description: 'All engineering projects and technical work',
      color: '#3b82f6',
      icon: '⚙️',
      workspaceId: workspace.id,
      createdById: cto.id,
    }
  });

  await prisma.space.create({
    data: {
      name: 'Marketing & Brand',
      description: 'Marketing campaigns, brand assets, and content',
      color: '#f59e0b',
      icon: '📣',
      workspaceId: workspace.id,
      createdById: brandFace.id,
    }
  });

  console.log('  Created 2 spaces');

  // ─── DONE ─────────────────────────────────────────────────────
  console.log('\nSeed complete!');
  console.log('Login: admin@knowai.com / admin123');
  console.log('All users share password: admin123');

  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
