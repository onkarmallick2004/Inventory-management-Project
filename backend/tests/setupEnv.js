// Runs before each test file: point the app at a separate test database.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'file:./test.db';
process.env.JWT_SECRET = 'test-secret-only-used-in-tests';
process.env.SEED_PASSWORD = 'Test@12345';
