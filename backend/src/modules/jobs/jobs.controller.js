const prisma = require('../../config/prisma');
const ApiError = require('../../utils/ApiError');
const { parseId } = require('../../utils/id');
const { closeJob } = require('../../services/stockService');
const { pageArgs, sortArgs, contains, paged } = require('../../utils/pagination');

const jobInclude = {
  machine: {
    select: {
      id: true,
      serialNumber: true,
      location: true,
      product: { select: { modelName: true, name: true } },
      customer: { select: { id: true, companyName: true, phone: true } },
    },
  },
  technician: { select: { id: true, name: true, phone: true } },
  partsUsed: { include: { part: { select: { id: true, partNumber: true, name: true, unitPrice: true } } } },
};

// Which jobs each role may see:
//   ADMIN      -> all jobs
//   TECHNICIAN -> jobs assigned to them
//   CUSTOMER   -> jobs on their company's machines
function scopeForUser(user) {
  if (user.role === 'TECHNICIAN') return { technicianId: user.id };
  if (user.role === 'CUSTOMER') return { machine: { customerId: user.customerId } };
  return {};
}

async function findVisibleJob(id, user) {
  const job = await prisma.serviceJob.findFirst({ where: { id, ...scopeForUser(user) }, include: jobInclude });
  if (!job) throw ApiError.notFound('Service job');
  return job;
}

// Makes sure technicianId really points at an active technician.
async function assertTechnician(technicianId) {
  if (!technicianId) return;
  const tech = await prisma.user.findUnique({ where: { id: technicianId } });
  if (!tech || tech.role !== 'TECHNICIAN' || !tech.isActive) {
    throw ApiError.badRequest('technicianId must be an active technician');
  }
}

function assertNotClosed(job) {
  if (job.status === 'CLOSED') throw ApiError.conflict('This job is already closed and cannot be changed');
}

// GET /api/jobs?status=OPEN&technicianId=3&from=2026-01-01&to=2026-03-31
async function list(req, res) {
  const q = req.valid.query;
  const where = {
    ...(q.status && { status: q.status }),
    ...(q.type && { type: q.type }),
    ...(q.technicianId && { technicianId: q.technicianId }),
    ...(q.machineId && { machineId: q.machineId }),
    ...((q.from || q.to) && { scheduledDate: { gte: q.from, lte: q.to } }),
    ...(q.search && {
      OR: [
        { notes: contains(q.search) },
        { machine: { serialNumber: contains(q.search) } },
        { machine: { customer: { companyName: contains(q.search) } } },
      ],
    }),
    ...scopeForUser(req.user), // last, so a technician can't widen it with ?technicianId=
  };
  const [rows, total] = await Promise.all([
    prisma.serviceJob.findMany({
      where,
      ...pageArgs(q),
      orderBy: sortArgs(q.sort, ['scheduledDate', 'closedDate', 'status', 'createdAt'], { scheduledDate: 'desc' }),
      include: jobInclude,
    }),
    prisma.serviceJob.count({ where }),
  ]);
  res.json(paged(rows, total, q));
}

async function getOne(req, res) {
  res.json(await findVisibleJob(parseId(req.params.id), req.user));
}

// POST /api/jobs  (admin schedules a job)
async function create(req, res) {
  const data = req.valid.body;
  await assertTechnician(data.technicianId);
  const job = await prisma.serviceJob.create({ data, include: jobInclude });
  res.status(201).json(job);
}

// PUT /api/jobs/:id  (admin edits details or re-assigns)
async function update(req, res) {
  const id = parseId(req.params.id);
  assertNotClosed(await findVisibleJob(id, req.user));
  await assertTechnician(req.valid.body.technicianId);
  const job = await prisma.serviceJob.update({ where: { id }, data: req.valid.body, include: jobInclude });
  res.json(job);
}

// PATCH /api/jobs/:id/status  { status, notes }  (technician updates their own job)
async function updateStatus(req, res) {
  const id = parseId(req.params.id);
  assertNotClosed(await findVisibleJob(id, req.user));
  const job = await prisma.serviceJob.update({ where: { id }, data: req.valid.body, include: jobInclude });
  res.json(job);
}

// Only jobs that were never closed can be deleted; closed jobs are history.
async function remove(req, res) {
  const id = parseId(req.params.id);
  assertNotClosed(await findVisibleJob(id, req.user));
  await prisma.serviceJob.delete({ where: { id } });
  res.status(204).end();
}

// POST /api/jobs/:id/parts  { partId, quantity }
// Records a part used on the job. Adding the same part again replaces its quantity.
// Stock is NOT deducted here; that happens when the job is closed.
async function addPart(req, res) {
  const jobId = parseId(req.params.id);
  assertNotClosed(await findVisibleJob(jobId, req.user));
  const { partId, quantity } = req.valid.body;

  const part = await prisma.part.findUnique({ where: { id: partId } });
  if (!part) throw ApiError.badRequest('partId does not exist');

  await prisma.partUsed.upsert({
    where: { jobId_partId: { jobId, partId } },
    create: { jobId, partId, quantity },
    update: { quantity },
  });
  res.status(201).json(await findVisibleJob(jobId, req.user));
}

// DELETE /api/jobs/:id/parts/:partUsedId
async function removePart(req, res) {
  const jobId = parseId(req.params.id);
  assertNotClosed(await findVisibleJob(jobId, req.user));
  const { count } = await prisma.partUsed.deleteMany({ where: { id: parseId(req.params.partUsedId), jobId } });
  if (count === 0) throw ApiError.notFound('Part entry');
  res.json(await findVisibleJob(jobId, req.user));
}

// POST /api/jobs/:id/close  { notes }
// Deducts parts from stock and closes the job in one transaction (see services/stockService.js).
// Responds 409 INSUFFICIENT_STOCK, listing the short parts, if stock is not enough.
async function close(req, res) {
  const id = parseId(req.params.id);
  await findVisibleJob(id, req.user); // technicians can only close their own jobs
  const result = await closeJob(id, { userId: req.user.id, notes: req.valid.body.notes });
  res.json({ ...result, job: await findVisibleJob(id, req.user) });
}

module.exports = { list, getOne, create, update, updateStatus, close, remove, addPart, removePart, jobInclude };
