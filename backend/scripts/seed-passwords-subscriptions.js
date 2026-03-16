const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/knowai_erp' });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function seed() {
  // Find an admin/CTO user to be the creator
  const admin = await prisma.user.findFirst({ where: { role: { in: ['CTO', 'CEO', 'ADMIN'] } } });
  if (!admin) { console.log('No admin user found, cannot seed'); return; }
  console.log('Using admin:', admin.firstName, admin.lastName, admin.role, admin.id);

  // Find some team members for access grants
  const members = await prisma.user.findMany({ take: 5, where: { role: { not: admin.role } } });
  console.log('Found', members.length, 'team members');

  // Seed 5 credentials
  const creds = [
    { title: 'GitHub Organization', username: 'knowai-admin@knowai.com', password: Buffer.from('Gh!tHub2024Secure').toString('base64'), url: 'https://github.com/knowai', category: 'Cloud', accessLevel: 'MANAGER_AND_ABOVE' },
    { title: 'AWS Console', username: 'aws-root@knowai.com', password: Buffer.from('Aws#Root!2024Pr0d').toString('base64'), url: 'https://console.aws.amazon.com', category: 'Cloud', accessLevel: 'ADMIN_ONLY' },
    { title: 'Figma Team', username: 'design@knowai.com', password: Buffer.from('F1gma!Team2024').toString('base64'), url: 'https://figma.com', category: 'Other', accessLevel: 'TEAM_AND_ABOVE' },
    { title: 'Google Workspace Admin', username: 'admin@knowai.com', password: Buffer.from('Goo0gle!Ws2024').toString('base64'), url: 'https://admin.google.com', category: 'Email', accessLevel: 'ADMIN_ONLY' },
    { title: 'Slack Workspace', username: 'admin@knowai.com', password: Buffer.from('Sl@ckW0rk2024!').toString('base64'), url: 'https://knowai.slack.com', category: 'Social Media', accessLevel: 'ALL_STAFF' },
  ];

  for (const c of creds) {
    const existing = await prisma.credential.findFirst({ where: { title: c.title } });
    if (existing) { console.log('Skip existing credential:', c.title); continue; }
    const cred = await prisma.credential.create({
      data: {
        ...c,
        createdById: admin.id,
        managedById: admin.id,
        workspaceId: admin.workspaceId,
      }
    });
    console.log('Created credential:', cred.title);

    // Grant access to first 2 members
    for (let i = 0; i < Math.min(2, members.length); i++) {
      await prisma.credentialAccess.create({
        data: {
          credentialId: cred.id,
          userId: members[i].id,
          grantedById: admin.id,
          canView: true,
          canCopy: i === 0,
          canEdit: false,
        }
      });
    }
  }

  // Seed 5 subscriptions
  const now = new Date();
  const subs = [
    { name: 'Figma Pro', provider: 'Figma Inc.', plan: 'Professional', cost: 1200, billingCycle: 'MONTHLY', category: 'Design', startDate: new Date(2024, 0, 1), renewalDate: new Date(now.getFullYear(), now.getMonth() + 1, 1), status: 'ACTIVE', loginUrl: 'https://figma.com' },
    { name: 'AWS', provider: 'Amazon Web Services', plan: 'Pay-as-you-go', cost: 45000, billingCycle: 'MONTHLY', category: 'Cloud', startDate: new Date(2023, 5, 1), renewalDate: new Date(now.getFullYear(), now.getMonth() + 1, 15), status: 'ACTIVE', loginUrl: 'https://console.aws.amazon.com' },
    { name: 'GitHub Enterprise', provider: 'GitHub Inc.', plan: 'Enterprise', cost: 21000, billingCycle: 'YEARLY', category: 'Development', startDate: new Date(2024, 2, 1), renewalDate: new Date(now.getFullYear() + 1, 2, 1), status: 'ACTIVE', loginUrl: 'https://github.com' },
    { name: 'Slack Business', provider: 'Salesforce', plan: 'Business+', cost: 1500, billingCycle: 'MONTHLY', category: 'Communication', startDate: new Date(2024, 0, 15), renewalDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 15), status: 'ACTIVE', loginUrl: 'https://slack.com' },
    { name: 'Google Workspace', provider: 'Google LLC', plan: 'Business Standard', cost: 900, billingCycle: 'MONTHLY', category: 'Communication', startDate: new Date(2023, 0, 1), renewalDate: new Date(now.getFullYear(), now.getMonth() + 2, 1), status: 'ACTIVE', loginUrl: 'https://workspace.google.com' },
  ];

  for (const s of subs) {
    const existing = await prisma.subscription.findFirst({ where: { name: s.name } });
    if (existing) { console.log('Skip existing subscription:', s.name); continue; }
    const sub = await prisma.subscription.create({
      data: {
        ...s,
        currency: 'INR',
        autoRenew: true,
        managedById: admin.id,
        workspaceId: admin.workspaceId,
      }
    });
    console.log('Created subscription:', sub.name);
  }

  console.log('Seeding complete!');
  await pool.end();
}

seed().catch(e => { console.error(e); pool.end(); process.exit(1); });

