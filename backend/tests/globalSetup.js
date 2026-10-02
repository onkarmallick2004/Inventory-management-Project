// Runs once before all tests: recreate the test database and fill it with seed data.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

module.exports = async () => {
  const env = {
    ...process.env,
    DATABASE_URL: 'file:./test.db',
    SEED_PASSWORD: 'Test@12345',
    JWT_SECRET: 'test-secret-only-used-in-tests',
  };
  // Start from an empty file every run (this only ever touches the throwaway test.db).
  fs.rmSync(path.join(__dirname, '..', 'prisma', 'test.db'), { force: true });
  execSync('npx prisma db push --skip-generate', { env, stdio: 'ignore' });
  execSync('node prisma/seed.js', { env, stdio: 'ignore' });
};
