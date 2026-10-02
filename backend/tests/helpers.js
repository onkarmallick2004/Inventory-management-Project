const { execSync } = require('child_process');
const request = require('supertest');
const app = require('../src/app');

const PASSWORD = 'Test@12345';

// Logs in and returns a supertest agent-like helper with the Bearer token set.
async function loginAs(email) {
  const res = await request(app).post('/api/auth/login').send({ email, password: PASSWORD });
  if (res.status !== 200) throw new Error(`Login failed for ${email}: ${JSON.stringify(res.body)}`);
  const token = res.body.token;
  const auth = (req) => req.set('Authorization', `Bearer ${token}`);
  return {
    user: res.body.user,
    get: (url) => auth(request(app).get(url)),
    post: (url, body) => auth(request(app).post(url)).send(body),
    put: (url, body) => auth(request(app).put(url)).send(body),
    patch: (url, body) => auth(request(app).patch(url)).send(body),
    delete: (url) => auth(request(app).delete(url)),
  };
}

// Reloads the seed data so each test file starts from the same known state.
function resetDatabase() {
  execSync('node prisma/seed.js', { env: process.env, stdio: 'ignore' });
}

module.exports = { app, request, loginAs, resetDatabase, PASSWORD };
