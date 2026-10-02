const prisma = require('../src/config/prisma');
const { app, request, loginAs, resetDatabase } = require('./helpers');

beforeAll(() => resetDatabase());
afterAll(() => prisma.$disconnect());

describe('Authentication', () => {
  test('login returns a token and the user without the password hash', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'admin@demo.local', password: 'Test@12345' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe('ADMIN');
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  test('wrong password gives 401 in the standard error format', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'admin@demo.local', password: 'nope' });
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: { code: 'INVALID_CREDENTIALS', message: expect.any(String) } });
  });

  test('protected route without a token gives 401', async () => {
    const res = await request(app).get('/api/machines');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  test('a garbage token gives 401', async () => {
    const res = await request(app).get('/api/machines').set('Authorization', 'Bearer abc.def.ghi');
    expect(res.status).toBe(401);
  });

  test('admin can register a technician who can then log in', async () => {
    const admin = await loginAs('admin@demo.local');
    const res = await admin.post('/api/auth/register', {
      name: 'New Tech',
      email: 'newtech@demo.local',
      password: 'Test@12345',
      role: 'TECHNICIAN',
    });
    expect(res.status).toBe(201);
    const tech = await loginAs('newtech@demo.local');
    expect(tech.user.role).toBe('TECHNICIAN');
  });

  test('duplicate email gives 409', async () => {
    const admin = await loginAs('admin@demo.local');
    const res = await admin.post('/api/auth/register', {
      name: 'Dup', email: 'admin@demo.local', password: 'Test@12345', role: 'ADMIN',
    });
    expect(res.status).toBe(409);
  });

  test('CUSTOMER user without customerId fails validation with field details', async () => {
    const admin = await loginAs('admin@demo.local');
    const res = await admin.post('/api/auth/register', {
      name: 'Cust', email: 'cust@demo.local', password: 'Test@12345', role: 'CUSTOMER',
    });
    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual([expect.objectContaining({ field: 'customerId' })]);
  });

  test('a technician cannot register users (403)', async () => {
    const tech = await loginAs('ravi@demo.local');
    const res = await tech.post('/api/auth/register', {
      name: 'X', email: 'x@demo.local', password: 'Test@12345', role: 'ADMIN',
    });
    expect(res.status).toBe(403);
  });

  test('disabled users cannot log in', async () => {
    const admin = await loginAs('admin@demo.local');
    const tech = await loginAs('newtech@demo.local');
    await admin.put(`/api/users/${tech.user.id}`, { isActive: false });
    const res = await request(app).post('/api/auth/login').send({ email: 'newtech@demo.local', password: 'Test@12345' });
    expect(res.status).toBe(401);
  });
});
