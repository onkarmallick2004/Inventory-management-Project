const prisma = require('../src/config/prisma');
const { app, request, loginAs, resetDatabase } = require('./helpers');

let admin;
let tech;
let customer;

beforeAll(async () => {
  resetDatabase();
  admin = await loginAs('admin@demo.local');
  tech = await loginAs('ravi@demo.local');
  customer = await loginAs('shree@demo.local');
});
afterAll(() => prisma.$disconnect());

describe('Seed data', () => {
  test('has the expected volumes', async () => {
    expect(await prisma.customer.count()).toBe(120);
    expect(await prisma.product.count()).toBe(29);
    expect(await prisma.part.count()).toBe(153);
    // Machines and jobs depend on today's date (history is the last five years), so check a range.
    expect(await prisma.machine.count()).toBeGreaterThan(350);
    expect(await prisma.serviceJob.count({ where: { status: 'CLOSED' } })).toBeGreaterThan(4000);
  });

  test('stock movements add up to the stock on hand for every part', async () => {
    const parts = await prisma.part.findMany({ select: { id: true, partNumber: true, stockQty: true } });
    const sums = await prisma.stockMovement.groupBy({ by: ['partId'], _sum: { change: true } });
    for (const part of parts) {
      const sum = sums.find((s) => s.partId === part.id);
      expect({ part: part.partNumber, qty: sum ? sum._sum.change : 0 }).toEqual({ part: part.partNumber, qty: part.stockQty });
    }
  });

  test('keeps the records the demo script relies on', async () => {
    const machine = await prisma.machine.findUnique({ where: { serialNumber: 'AC-S11-024098' }, include: { product: true, customer: true } });
    expect(machine.product.modelName).toBe('ELGi EG 11');
    expect(machine.customer.companyName).toBe('Precision Plastics Moulding');
    const separator = await prisma.part.findUnique({ where: { partNumber: 'SEP-S11' }, include: { compatibleProducts: true } });
    expect(separator).toEqual(expect.objectContaining({ stockQty: 5, minimumLevel: 2 }));
    expect(separator.compatibleProducts.map((p) => p.modelName)).toContain('ELGi EG 11');
  });
});

describe('Pagination, search and validation', () => {
  test('list endpoints return data + meta', async () => {
    const res = await admin.get('/api/parts?page=2&limit=15');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(15);
    expect(res.body.meta).toEqual({ page: 2, limit: 15, total: 153, totalPages: 11 });
  });

  test('search filters results', async () => {
    const res = await admin.get('/api/customers?search=shree');
    expect(res.body.data.map((c) => c.companyName)).toEqual(['Shree Ganesh Pharma Pvt Ltd']);
  });

  test('lowStock=true returns only parts at or below the minimum level', async () => {
    const res = await admin.get('/api/parts?lowStock=true&limit=100');
    expect(res.body.data.length).toBeGreaterThan(0);
    for (const p of res.body.data) expect(p.stockQty).toBeLessThanOrEqual(p.minimumLevel);
  });

  test('invalid query parameters give 400', async () => {
    const res = await admin.get('/api/parts?limit=1000');
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe('limit');
  });

  test('unknown routes give 404 in the standard format', async () => {
    const res = await admin.get('/api/nothing-here');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

describe('Customers', () => {
  let id;
  test('admin creates, reads, updates and deletes a customer', async () => {
    const created = await admin.post('/api/customers', {
      companyName: 'Test Industries', contactPerson: 'Test Person', email: 'TEST@Example.com', phone: '9876543210',
    });
    expect(created.status).toBe(201);
    expect(created.body.email).toBe('test@example.com'); // normalised
    id = created.body.id;

    expect((await admin.get(`/api/customers/${id}`)).body.companyName).toBe('Test Industries');
    expect((await admin.put(`/api/customers/${id}`, { city: 'Pune' })).body.city).toBe('Pune');
    expect((await admin.delete(`/api/customers/${id}`)).status).toBe(204);
    expect((await admin.get(`/api/customers/${id}`)).status).toBe(404);
  });

  test('a customer that owns machines cannot be deleted (409)', async () => {
    const res = await admin.delete(`/api/customers/${customer.user.customerId}`);
    expect(res.status).toBe(409);
  });

  test('technicians can read but not create customers', async () => {
    expect((await tech.get('/api/customers')).status).toBe(200);
    expect((await tech.post('/api/customers', {})).status).toBe(403);
  });

  test('customers cannot list other customers', async () => {
    expect((await customer.get('/api/customers')).status).toBe(403);
  });
});

describe('Products', () => {
  test('catalog is public and filterable', async () => {
    const res = await request(app).get('/api/products?category=VACUUM_PUMP&limit=50');
    expect(res.status).toBe(200);
    expect(res.body.data.every((p) => p.category === 'VACUUM_PUMP')).toBe(true);
  });

  test('admin can create a product; bad enum values are rejected', async () => {
    const body = {
      modelName: 'AC-TEST', name: 'Test', category: 'AIR_COMPRESSOR', type: 'SCREW', airflowCfm: 10, airflowLpm: 283,
      pressureBar: 8, powerKw: 3, phase: 'THREE', applications: 'general', price: 1000,
    };
    expect((await admin.post('/api/products', body)).status).toBe(201);
    expect((await admin.post('/api/products', { ...body, modelName: 'AC-T2', type: 'TURBO' })).status).toBe(400);
  });
});

describe('Machines', () => {
  test('customers only see their own machines', async () => {
    const res = await customer.get('/api/machines?limit=100');
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data.every((m) => m.customerId === customer.user.customerId)).toBe(true);

    const other = await prisma.machine.findFirst({ where: { customerId: { not: customer.user.customerId } } });
    expect((await customer.get(`/api/machines/${other.id}`)).status).toBe(404);
  });

  test('creating a machine sets a QR token and the first service due date', async () => {
    const product = await prisma.product.findFirst();
    const res = await admin.post('/api/machines', {
      serialNumber: 'TEST-SN-1', productId: product.id, customerId: customer.user.customerId,
      installDate: '2026-01-01', serviceIntervalDays: 30,
    });
    expect(res.status).toBe(201);
    expect(res.body.qrToken).toBeTruthy();
    expect(res.body.nextServiceDue.slice(0, 10)).toBe('2026-01-31');
  });

  test('updating without serviceIntervalDays keeps the existing interval', async () => {
    const m = await prisma.machine.findUnique({ where: { serialNumber: 'TEST-SN-1' } });
    const res = await admin.put(`/api/machines/${m.id}`, { location: 'Bay 2' });
    expect(res.body.serviceIntervalDays).toBe(30);
  });

  test('AMC end before start is rejected', async () => {
    const product = await prisma.product.findFirst();
    const res = await admin.post('/api/machines', {
      serialNumber: 'TEST-SN-2', productId: product.id, customerId: customer.user.customerId,
      installDate: '2026-01-01', amcStart: '2026-06-01', amcEnd: '2026-01-01',
    });
    expect(res.status).toBe(400);
  });

  test('QR endpoint returns a PNG', async () => {
    const m = await prisma.machine.findFirst({ where: { customerId: customer.user.customerId } });
    const res = await customer.get(`/api/machines/${m.id}/qr`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('image/png');
  });
});

describe('Parts', () => {
  test('restock increases stock and logs a movement', async () => {
    const part = await prisma.part.findFirst();
    const res = await admin.post(`/api/parts/${part.id}/restock`, { quantity: 5, note: 'PO-123' });
    expect(res.status).toBe(200);
    expect(res.body.stockQty).toBe(part.stockQty + 5);
    const movement = await prisma.stockMovement.findFirst({ where: { partId: part.id, reason: 'RESTOCK' }, orderBy: { id: 'desc' } });
    expect(movement.change).toBe(5);
  });

  test('PUT does not change stockQty', async () => {
    const part = await prisma.part.findFirst();
    const res = await admin.put(`/api/parts/${part.id}`, { stockQty: 9999, name: 'Renamed part' });
    expect(res.body.stockQty).toBe(part.stockQty);
    expect(res.body.name).toBe('Renamed part');
  });

  test('stock movements add up to current stock for seeded parts', async () => {
    const parts = await prisma.part.findMany({ include: { stockMovements: true } });
    for (const p of parts) {
      const sum = p.stockMovements.reduce((acc, m) => acc + m.change, 0);
      expect(sum).toBe(p.stockQty);
    }
  });
});

describe('Service jobs', () => {
  test('technicians only see their own jobs, even if they ask for another technician', async () => {
    const other = await prisma.user.findFirst({ where: { role: 'TECHNICIAN', id: { not: tech.user.id } } });
    const res = await tech.get(`/api/jobs?technicianId=${other.id}&limit=100`);
    expect(res.body.data.every((j) => j.technicianId === tech.user.id)).toBe(true);
  });

  test('technician updates status and records parts on their job', async () => {
    const job = await prisma.serviceJob.findFirst({ where: { technicianId: tech.user.id, status: 'OPEN' } });
    const status = await tech.patch(`/api/jobs/${job.id}/status`, { status: 'IN_PROGRESS', notes: 'On site' });
    expect(status.status).toBe(200);
    expect(status.body.status).toBe('IN_PROGRESS');

    const part = await prisma.part.findFirst();
    const added = await tech.post(`/api/jobs/${job.id}/parts`, { partId: part.id, quantity: 2 });
    expect(added.status).toBe(201);
    expect(added.body.partsUsed).toHaveLength(1);

    // Adding the same part again replaces the quantity instead of duplicating it.
    const again = await tech.post(`/api/jobs/${job.id}/parts`, { partId: part.id, quantity: 3 });
    expect(again.body.partsUsed).toEqual([expect.objectContaining({ quantity: 3 })]);

    const removed = await tech.delete(`/api/jobs/${job.id}/parts/${again.body.partsUsed[0].id}`);
    expect(removed.body.partsUsed).toHaveLength(0);
  });

  test('status cannot be set to CLOSED through PATCH', async () => {
    const job = await prisma.serviceJob.findFirst({ where: { technicianId: tech.user.id, status: { not: 'CLOSED' } } });
    const res = await tech.patch(`/api/jobs/${job.id}/status`, { status: 'CLOSED' });
    expect(res.status).toBe(400);
  });

  test('closed jobs cannot be edited or deleted', async () => {
    const job = await prisma.serviceJob.findFirst({ where: { status: 'CLOSED' } });
    expect((await admin.put(`/api/jobs/${job.id}`, { notes: 'x' })).status).toBe(409);
    expect((await admin.delete(`/api/jobs/${job.id}`)).status).toBe(409);
  });

  test('jobs can only be assigned to technicians', async () => {
    const machine = await prisma.machine.findFirst();
    const res = await admin.post('/api/jobs', {
      machineId: machine.id, technicianId: admin.user.id, type: 'ROUTINE', scheduledDate: '2026-12-01',
    });
    expect(res.status).toBe(400);
  });
});

describe('Service requests', () => {
  test('customer raises a request, admin assigns it, a job is created', async () => {
    const machine = await prisma.machine.findFirst({ where: { customerId: customer.user.customerId } });
    const raised = await customer.post('/api/requests', { machineId: machine.id, description: 'Pressure keeps dropping after an hour' });
    expect(raised.status).toBe(201);
    expect(raised.body.status).toBe('NEW');

    const assigned = await admin.post(`/api/requests/${raised.body.id}/assign`, {
      technicianId: tech.user.id, scheduledDate: '2026-12-05',
    });
    expect(assigned.status).toBe(201);
    expect(assigned.body.status).toBe('ASSIGNED');
    expect(assigned.body.job.technician.id).toBe(tech.user.id);

    // Assigning twice is a conflict.
    const again = await admin.post(`/api/requests/${raised.body.id}/assign`, { technicianId: tech.user.id, scheduledDate: '2026-12-05' });
    expect(again.status).toBe(409);
  });

  test('customer cannot raise a request for someone else\'s machine', async () => {
    const other = await prisma.machine.findFirst({ where: { customerId: { not: customer.user.customerId } } });
    const res = await customer.post('/api/requests', { machineId: other.id, description: 'Not my machine at all' });
    expect(res.status).toBe(400);
  });

  test('customer can cancel a NEW request but not resolve it', async () => {
    const machine = await prisma.machine.findFirst({ where: { customerId: customer.user.customerId } });
    const raised = await customer.post('/api/requests', { machineId: machine.id, description: 'Please check noise levels' });
    expect((await customer.patch(`/api/requests/${raised.body.id}`, { status: 'RESOLVED' })).status).toBe(403);
    expect((await customer.patch(`/api/requests/${raised.body.id}`, { status: 'CANCELLED' })).status).toBe(200);
  });
});

describe('Public QR endpoints', () => {
  test('show machine status without customer details, and accept a request', async () => {
    const machine = await prisma.machine.findFirst();
    const res = await request(app).get(`/api/public/machines/${machine.qrToken}`);
    expect(res.status).toBe(200);
    expect(res.body.modelName).toBeDefined();
    expect(res.body.warrantyStatus).toMatch(/NONE|ACTIVE|EXPIRING_SOON|EXPIRED/);
    expect(JSON.stringify(res.body)).not.toMatch(/companyName|customer/i);

    const created = await request(app)
      .post(`/api/public/machines/${machine.qrToken}/requests`)
      .send({ contactName: 'Shift Operator', contactPhone: '9999999999', description: 'Machine stopped with alarm E04' });
    expect(created.status).toBe(201);
  });

  test('unknown QR token gives 404', async () => {
    expect((await request(app).get('/api/public/machines/does-not-exist')).status).toBe(404);
  });
});
