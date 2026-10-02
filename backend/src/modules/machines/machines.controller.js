const crypto = require('crypto');
const QRCode = require('qrcode');
const prisma = require('../../config/prisma');
const { frontendUrl } = require('../../config/env');
const ApiError = require('../../utils/ApiError');
const { parseId } = require('../../utils/id');
const { addDays, coverageStatus } = require('../../utils/dates');
const { pageArgs, sortArgs, contains, paged } = require('../../utils/pagination');

// Adds warranty / AMC status labels so the UI doesn't have to compute them.
function withStatus(machine) {
  return {
    ...machine,
    warrantyStatus: coverageStatus(machine.warrantyEnd),
    amcStatus: coverageStatus(machine.amcEnd),
  };
}

// Customers may only see their own machines. Admins and technicians see all.
function scopeForUser(user) {
  return user.role === 'CUSTOMER' ? { customerId: user.customerId } : {};
}

async function findVisibleMachine(id, user, include) {
  const machine = await prisma.machine.findFirst({ where: { id, ...scopeForUser(user) }, include });
  if (!machine) throw ApiError.notFound('Machine');
  return machine;
}

// GET /api/machines?search=SN-001&customerId=2&category=VACUUM_PUMP
async function list(req, res) {
  const q = req.valid.query;
  const where = {
    ...scopeForUser(req.user),
    ...(q.customerId && req.user.role !== 'CUSTOMER' && { customerId: q.customerId }),
    ...(q.productId && { productId: q.productId }),
    ...(q.category && { product: { category: q.category } }),
    ...(q.search && {
      OR: [
        { serialNumber: contains(q.search) },
        { location: contains(q.search) },
        { product: { modelName: contains(q.search) } },
        { customer: { companyName: contains(q.search) } },
      ],
    }),
  };
  const [rows, total] = await Promise.all([
    prisma.machine.findMany({
      where,
      ...pageArgs(q),
      orderBy: sortArgs(q.sort, ['serialNumber', 'installDate', 'nextServiceDue', 'amcEnd', 'warrantyEnd']),
      include: {
        product: { select: { id: true, modelName: true, name: true, category: true, type: true } },
        customer: { select: { id: true, companyName: true } },
      },
    }),
    prisma.machine.count({ where }),
  ]);
  res.json(paged(rows.map(withStatus), total, q));
}

// GET /api/machines/:id
async function getOne(req, res) {
  const machine = await findVisibleMachine(parseId(req.params.id), req.user, {
    product: true,
    customer: true,
  });
  res.json(withStatus(machine));
}

// POST /api/machines
// If nextServiceDue is not given, it starts at installDate + serviceIntervalDays.
async function create(req, res) {
  const data = { ...req.valid.body };
  if (!data.nextServiceDue) data.nextServiceDue = addDays(data.installDate, data.serviceIntervalDays);
  data.qrToken = crypto.randomBytes(9).toString('base64url');

  const machine = await prisma.machine.create({ data });
  res.status(201).json(withStatus(machine));
}

async function update(req, res) {
  const machine = await prisma.machine.update({ where: { id: parseId(req.params.id) }, data: req.valid.body });
  res.json(withStatus(machine));
}

// Machines with service history cannot be deleted (409), so the history is never lost.
async function remove(req, res) {
  await prisma.machine.delete({ where: { id: parseId(req.params.id) } });
  res.status(204).end();
}

// GET /api/machines/:id/qr  -> PNG image. The QR encodes the public landing page URL.
// Add ?download=1 to make the browser save it as a file.
async function qrCode(req, res) {
  const machine = await findVisibleMachine(parseId(req.params.id), req.user);
  const url = `${frontendUrl}/m/${machine.qrToken}`;
  const png = await QRCode.toBuffer(url, { width: 400, margin: 2 });

  res.type('png');
  if (req.query.download) {
    res.attachment(`machine-${machine.serialNumber}-qr.png`);
  }
  res.send(png);
}

module.exports = { list, getOne, create, update, remove, qrCode, withStatus, findVisibleMachine };
