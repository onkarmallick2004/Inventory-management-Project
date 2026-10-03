// The ML service itself is tested with pytest (ml-service/tests).
// Here we check the backend side: what it sends to the ML service and how it handles failures.
const prisma = require('../src/config/prisma');
const { app, request, loginAs, resetDatabase } = require('./helpers');
const { monthlyUsage } = require('../src/modules/ml/ml.controller');

const realFetch = global.fetch;
let admin;

beforeAll(async () => {
  resetDatabase();
  admin = await loginAs('admin@demo.local');
});
afterEach(() => {
  global.fetch = realFetch;
});
afterAll(() => prisma.$disconnect());

// Replaces fetch with a fake ML service that records what it was sent.
function fakeMl(response, status = 200) {
  const calls = [];
  global.fetch = async (url, options) => {
    calls.push({ url, body: JSON.parse(options.body) });
    return { ok: status < 400, status, json: async () => response };
  };
  return calls;
}

describe('Product selector proxy', () => {
  test('is public, sends the full catalog and the requirements', async () => {
    const calls = fakeMl({ results: [] });
    const body = { category: 'AIR_COMPRESSOR', airflowCfm: 60, pressureBar: 7.5, phase: 'THREE', application: 'food' };
    const res = await request(app).post('/api/ml/product-selector').send(body);
    expect(res.status).toBe(200);
    expect(calls[0].url).toMatch(/\/select-products$/);
    expect(calls[0].body.requirements).toEqual(body);
    expect(calls[0].body.products).toHaveLength(await prisma.product.count());
  });

  test('validates input before calling the ML service', async () => {
    const calls = fakeMl({});
    const res = await request(app).post('/api/ml/product-selector').send({ airflowCfm: -5, phase: 'X' });
    expect(res.status).toBe(400);
    expect(calls).toHaveLength(0);
  });

  test('returns 503 with a clear message when the ML service is down', async () => {
    global.fetch = async () => {
      throw new Error('ECONNREFUSED');
    };
    const res = await request(app)
      .post('/api/ml/product-selector')
      .send({ airflowCfm: 60, pressureBar: 7, phase: 'THREE', application: 'food' });
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('ML_UNAVAILABLE');
  });
});

describe('Parts forecast', () => {
  test('monthly usage covers 12 complete months and matches the database', async () => {
    const data = await monthlyUsage(12);
    expect(data.months).toHaveLength(12);
    expect(data.parts).toHaveLength(40);
    for (const p of data.parts) expect(p.history).toHaveLength(12);

    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 12, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 1);
    const agg = await prisma.partUsed.aggregate({
      where: { job: { status: 'CLOSED', closedDate: { gte: start, lt: end } } },
      _sum: { quantity: true },
    });
    const total = data.parts.reduce((sum, p) => sum + p.history.reduce((a, b) => a + b, 0), 0);
    expect(total).toBe(agg._sum.quantity);
    expect(total).toBeGreaterThan(0);
  });

  test('is admin-only and passes the history to the ML service', async () => {
    const calls = fakeMl({ results: [] });
    expect((await admin.get('/api/ml/parts-forecast')).status).toBe(200);
    expect(calls[0].body.parts[0]).toEqual(expect.objectContaining({ partNumber: expect.any(String), history: expect.any(Array) }));

    const tech = await loginAs('ravi@demo.local');
    expect((await tech.get('/api/ml/parts-forecast')).status).toBe(403);
  });
});
