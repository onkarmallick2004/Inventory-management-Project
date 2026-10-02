// Prisma cannot pick the database provider from an environment variable,
// so this tiny script switches schema.prisma between SQLite (local dev) and Postgres.
//   node scripts/use-postgres.js          -> provider = "postgresql"
//   node scripts/use-postgres.js sqlite   -> provider = "sqlite"
const fs = require('fs');
const path = require('path');

const target = process.argv[2] === 'sqlite' ? 'sqlite' : 'postgresql';
const file = path.join(__dirname, '..', 'prisma', 'schema.prisma');
const schema = fs.readFileSync(file, 'utf8').replace(/provider = "(sqlite|postgresql)"\n  url/, `provider = "${target}"\n  url`);
fs.writeFileSync(file, schema);
console.log(`schema.prisma now uses ${target}`);
