// Runs the seed only when the database has no users yet,
// so restarting the containers never wipes data you entered.
const { execSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

prisma.user
  .count()
  .then((count) => {
    if (count > 0) {
      console.log(`Database already has ${count} users, skipping seed.`);
      return;
    }
    console.log('Empty database, loading demo data...');
    execSync('node prisma/seed.js', { stdio: 'inherit' });
  })
  .finally(() => prisma.$disconnect());
