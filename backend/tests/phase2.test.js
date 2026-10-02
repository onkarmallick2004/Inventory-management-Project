// Integration tests for Phase 2: closing jobs, alerts, reminders, machine history.
const prisma = require('../src/config/prisma');
const { loginAs, resetDatabase } = require('./helpers');
const { addDays, startOfDay } = require('../src/utils/dates');
const { runDailyReminders } = require('../src/services/reminderService');

let admin;
let tech;
let customer;
let machine; // a machine with a known 60-day interval
let partA;
let partB;

// Creates a fresh part so each test controls its own stock levels.
let partCounter = 0;
function makePart(stockQty, minimumLevel = 1) {
  partCounter += 1;
  return prisma.part.create({
    data: { partNumber: `T2-${partCounter}`, name: `Test part ${partCounter}`, stockQty, minimumLevel, unitPrice: 100 },
  });
}

async function makeJob(type, parts) {
  const job = await prisma.serviceJob.create({
    data: {
      machineId: machine.id,
      technicianId: tech.user.id,
      type,
      scheduledDate: new Date(),
      partsUsed: { create: parts.map(([part, quantity]) => ({ partId: part.id, quantity })) },
    },
  });
  return job;
}

beforeAll(async () => {
  resetDatabase();
  admin = await loginAs('admin@demo.local');
  tech = await loginAs('ravi@demo.local');
  customer = await loginAs('shree@demo.local');
  const product = await prisma.product.findFirst();
  machine = await prisma.machine.create({
    data: {
      serialNumber: 'P2-MACHINE', productId: product.id, customerId: customer.user.customerId,
      installDate: new Date('2025-01-01'), serviceIntervalDays: 60, nextServiceDue: new Date('2026-01-01'), qrToken: 'p2-token',
    },
  });
});
afterAll(() => prisma.$disconnect());

describe('Closing a job', () => {
  test('deducts every part from stock, logs movements and closes the job', async () => {
    partA = await makePart(10, 2);
    partB = await makePart(5, 1);
    const job = await makeJob('BREAKDOWN', [[partA, 3], [partB, 2]]);

    const res = await tech.post(`/api/jobs/${job.id}/close`, { notes: 'Replaced both' });
    expect(res.status).toBe(200);
    expect(res.body.job.status).toBe('CLOSED');
    expect(res.body.job.closedDate).toBeTruthy();
    expect(res.body.job.notes).toBe('Replaced both');

    expect((await prisma.part.findUnique({ where: { id: partA.id } })).stockQty).toBe(7);
    expect((await prisma.part.findUnique({ where: { id: partB.id } })).stockQty).toBe(3);

    const movements = await prisma.stockMovement.findMany({ where: { jobId: job.id } });
    expect(movements.map((m) => m.change).sort()).toEqual([-2, -3]);
  });

  test('is blocked when stock is insufficient, and NOTHING changes (rollback)', async () => {
    const enough = await makePart(10);
    const short = await makePart(1);
    const job = await makeJob('ROUTINE', [[enough, 4], [short, 3]]);
    const dueBefore = (await prisma.machine.findUnique({ where: { id: machine.id } })).nextServiceDue;

    const res = await tech.post(`/api/jobs/${job.id}/close`, {});
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INSUFFICIENT_STOCK');
    expect(res.body.error.details).toEqual([expect.objectContaining({ partId: short.id, required: 3, inStock: 1 })]);

    // Neither part changed, job still open, due date untouched, no movements written.
    expect((await prisma.part.findUnique({ where: { id: enough.id } })).stockQty).toBe(10);
    expect((await prisma.part.findUnique({ where: { id: short.id } })).stockQty).toBe(1);
    expect((await prisma.serviceJob.findUnique({ where: { id: job.id } })).status).toBe('OPEN');
    expect((await prisma.machine.findUnique({ where: { id: machine.id } })).nextServiceDue).toEqual(dueBefore);
    expect(await prisma.stockMovement.count({ where: { jobId: job.id } })).toBe(0);
  });

  test('a job can only be closed once', async () => {
    const job = await makeJob('BREAKDOWN', []);
    expect((await tech.post(`/api/jobs/${job.id}/close`, {})).status).toBe(200);
    expect((await tech.post(`/api/jobs/${job.id}/close`, {})).status).toBe(409);
  });

  test('a technician cannot close someone else\'s job', async () => {
    const other = await prisma.user.findFirst({ where: { role: 'TECHNICIAN', email: 'sanjay@demo.local' } });
    const job = await prisma.serviceJob.create({
      data: { machineId: machine.id, technicianId: other.id, type: 'BREAKDOWN', scheduledDate: new Date() },
    });
    expect((await tech.post(`/api/jobs/${job.id}/close`, {})).status).toBe(404);
  });

  test('closing a ROUTINE job moves next service due to closed date + interval', async () => {
    const job = await makeJob('ROUTINE', []);
    const res = await tech.post(`/api/jobs/${job.id}/close`, {});
    const closed = new Date(res.body.job.closedDate);
    const updated = await prisma.machine.findUnique({ where: { id: machine.id } });
    expect(updated.nextServiceDue.toISOString()).toBe(addDays(closed, 60).toISOString());
  });

  test('closing a BREAKDOWN job leaves next service due unchanged', async () => {
    const before = (await prisma.machine.findUnique({ where: { id: machine.id } })).nextServiceDue;
    const job = await makeJob('BREAKDOWN', []);
    await tech.post(`/api/jobs/${job.id}/close`, {});
    expect((await prisma.machine.findUnique({ where: { id: machine.id } })).nextServiceDue).toEqual(before);
  });

  test('crossing the minimum level raises one LOW_STOCK notification', async () => {
    const part = await makePart(5, 3);
    const job = await makeJob('BREAKDOWN', [[part, 2]]); // 5 -> 3, which is <= minimum 3
    const res = await tech.post(`/api/jobs/${job.id}/close`, {});
    expect(res.body.lowStockParts).toEqual([expect.objectContaining({ partId: part.id, stockQty: 3 })]);

    const job2 = await makeJob('BREAKDOWN', [[part, 1]]);
    await tech.post(`/api/jobs/${job2.id}/close`, {});
    expect(await prisma.notification.count({ where: { type: 'LOW_STOCK', partId: part.id } })).toBe(1);
  });

  test('closing a job that came from a request resolves the request', async () => {
    const raised = await customer.post('/api/requests', { machineId: machine.id, description: 'Leak near the receiver tank' });
    const assigned = await admin.post(`/api/requests/${raised.body.id}/assign`, { technicianId: tech.user.id, scheduledDate: new Date() });
    await tech.post(`/api/jobs/${assigned.body.job.id}/close`, {});
    expect((await customer.get(`/api/requests/${raised.body.id}`)).body.status).toBe('RESOLVED');
  });
});

describe('Alerts', () => {
  test('low-stock alert lists only parts at or below minimum', async () => {
    const res = await admin.get('/api/alerts/low-stock');
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(res.body.data.length);
    expect(res.body.data.length).toBeGreaterThan(0);
    for (const p of res.body.data) expect(p.stockQty).toBeLessThanOrEqual(p.minimumLevel);
  });

  test('upcoming alert respects the 15-day / 30-day windows', async () => {
    const res = await admin.get('/api/alerts/upcoming');
    expect(res.status).toBe(200);
    expect(res.body.serviceDue.length).toBeGreaterThan(0);
    expect(res.body.amcExpiring.length).toBeGreaterThan(0);
    for (const m of res.body.serviceDue) expect(m.daysLeft).toBeLessThanOrEqual(15);
    for (const m of res.body.amcExpiring) expect(m.daysLeft).toBeGreaterThanOrEqual(0);
    for (const m of res.body.amcExpiring) expect(m.daysLeft).toBeLessThanOrEqual(30);
  });

  test('customers cannot see alerts', async () => {
    expect((await customer.get('/api/alerts/low-stock')).status).toBe(403);
  });
});

describe('Daily reminders', () => {
  test('create notifications and emails, and a second run creates no duplicates', async () => {
    const first = await runDailyReminders();
    expect(first.SERVICE_DUE).toBeGreaterThan(0);
    expect(first.AMC_EXPIRING).toBeGreaterThan(0);
    expect(first.emailsSent).toBe(first.SERVICE_DUE + first.AMC_EXPIRING + first.WARRANTY_EXPIRING);

    const second = await runDailyReminders();
    expect(second.SERVICE_DUE + second.AMC_EXPIRING + second.WARRANTY_EXPIRING).toBe(0);
    expect(second.skippedExisting).toBeGreaterThan(0);

    const sent = await prisma.notification.findMany({ where: { type: 'SERVICE_DUE' } });
    expect(sent.every((n) => n.emailSent)).toBe(true);
  });

  test('a machine due in 10 days gets a SERVICE_DUE reminder; one due in 40 days does not', async () => {
    const product = await prisma.product.findFirst();
    const soon = await prisma.machine.create({
      data: { serialNumber: 'P2-SOON', productId: product.id, customerId: customer.user.customerId, installDate: new Date('2025-01-01'),
        nextServiceDue: addDays(startOfDay(), 10), qrToken: 'p2-soon' },
    });
    const later = await prisma.machine.create({
      data: { serialNumber: 'P2-LATER', productId: product.id, customerId: customer.user.customerId, installDate: new Date('2025-01-01'),
        nextServiceDue: addDays(startOfDay(), 40), qrToken: 'p2-later' },
    });
    await runDailyReminders();
    expect(await prisma.notification.count({ where: { machineId: soon.id, type: 'SERVICE_DUE' } })).toBe(1);
    expect(await prisma.notification.count({ where: { machineId: later.id } })).toBe(0);
  });

  test('admin can trigger the run through the API; customers see only their own notifications', async () => {
    expect((await admin.post('/api/admin/run-reminders', {})).status).toBe(200);
    expect((await tech.post('/api/admin/run-reminders', {})).status).toBe(403);

    const res = await customer.get('/api/notifications?limit=100');
    expect(res.status).toBe(200);
    const ids = res.body.data.map((n) => n.machineId);
    const mine = await prisma.machine.findMany({ where: { id: { in: ids } } });
    expect(mine.every((m) => m.customerId === customer.user.customerId)).toBe(true);
  });
});

describe('Machine history', () => {
  test('returns the timeline newest first with parts and costs', async () => {
    const res = await customer.get(`/api/machines/${machine.id}/history`);
    expect(res.status).toBe(200);
    expect(res.body.machine.serialNumber).toBe('P2-MACHINE');
    expect(res.body.timeline.length).toBe(res.body.summary.totalJobs);

    const withParts = res.body.timeline.find((t) => t.parts.length === 2);
    expect(withParts.partsCost).toBe(withParts.parts.reduce((s, p) => s + p.lineTotal, 0));

    expect(res.body.summary.closedJobs).toBeGreaterThan(3);
  });

  test('seeded machines have a real history', async () => {
    const seeded = await prisma.machine.findFirst({ where: { jobs: { some: { status: 'CLOSED' } } } });
    const res = await admin.get(`/api/machines/${seeded.id}/history`);
    expect(res.body.summary.closedJobs).toBeGreaterThan(0);
    expect(res.body.summary.lastServiceDate).toBeTruthy();
  });

  test('customers cannot read another customer\'s machine history', async () => {
    const other = await prisma.machine.findFirst({ where: { customerId: { not: customer.user.customerId } } });
    expect((await customer.get(`/api/machines/${other.id}/history`)).status).toBe(404);
  });
});
