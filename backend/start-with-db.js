const { default: EmbeddedPostgres } = require('embedded-postgres');
const { execSync } = require('child_process');
const path = require('path');

async function main() {
  console.log('Starting embedded PostgreSQL...');

  const pg = new EmbeddedPostgres({
    databaseDir: path.join(__dirname, '.pg-data'),
    user: 'postgres',
    password: 'postgres',
    port: 5432,
    persistent: true,
  });

  try {
    await pg.initialise();
    await pg.start();
    console.log('PostgreSQL started on port 5432');

    // Create database
    try {
      await pg.createDatabase('knowai_erp');
      console.log('Database knowai_erp created');
    } catch (e) {
      console.log('Database already exists');
    }

    // Push schema
    console.log('Pushing Prisma schema...');
    execSync('npx prisma generate && npx prisma db push --accept-data-loss', {
      stdio: 'inherit',
      cwd: __dirname,
      env: { ...process.env, DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/knowai_erp' }
    });

    // Seed
    console.log('Seeding database...');
    try {
      execSync('node prisma/seed.js', {
        stdio: 'inherit',
        cwd: __dirname,
        env: { ...process.env, DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/knowai_erp' }
      });
    } catch (e) {
      console.log('Seed may have already run or had issues, continuing...');
    }

    // Start Next.js
    console.log('Starting Next.js backend on port 3001...');
    execSync('npx next dev -p 3001', {
      stdio: 'inherit',
      cwd: __dirname,
      env: { ...process.env, DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/knowai_erp' }
    });

  } catch (err) {
    console.error('Error:', err.message);
    await pg.stop();
    process.exit(1);
  }
}

main();
