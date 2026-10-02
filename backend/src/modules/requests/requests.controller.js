const prisma = require('../../config/prisma');
const ApiError = require('../../utils/ApiError');
const { parseId } = require('../../utils/id');
const { pageArgs, sortArgs, contains, paged } = require('../../utils/pagination');

const requestInclude = {
  machine: { select: { id: true, serialNumber: true, product: { select: { modelName: true, name: true } } } },
  customer: { select: { id: true, companyName: true, phone: true } },
  raisedBy: { select: { id: true, name: true } },
  job: { select: { id: true, status: true, scheduledDate: true, technician: { select: { id: true, name: true } } } },
};

// Customers see their own company's requests; admins see all.
function scopeForUser(user) {
  return user.role === 'CUSTOMER' ? { customerId: user.customerId } : {};
}

async function findVisibleRequest(id, user) {
  const request = await prisma.serviceRequest.findFirst({ where: { id, ...scopeForUser(user) }, include: requestInclude });
  if (!request) throw ApiError.notFound('Service request');
  return request;
}

// GET /api/requests?status=NEW
async function list(req, res) {
  const q = req.valid.query;
  const where = {
    ...(q.status && { status: q.status }),
    ...(q.machineId && { machineId: q.machineId }),
    ...(q.search && {
      OR: [
        { description: contains(q.search) },
        { machine: { serialNumber: contains(q.search) } },
        { customer: { companyName: contains(q.search) } },
      ],
    }),
    ...scopeForUser(req.user),
  };
  const [rows, total] = await Promise.all([
    prisma.serviceRequest.findMany({
      where,
      ...pageArgs(q),
      orderBy: sortArgs(q.sort, ['createdAt', 'status']),
      include: requestInclude,
    }),
    prisma.serviceRequest.count({ where }),
  ]);
  res.json(paged(rows, total, q));
}

async function getOne(req, res) {
  res.json(await findVisibleRequest(parseId(req.params.id), req.user));
}

// POST /api/requests  (customer raises a request for one of their machines; admin can raise on their behalf)
async function create(req, res) {
  const { machineId, ...data } = req.valid.body;
  const machine = await prisma.machine.findUnique({ where: { id: machineId } });
  if (!machine || (req.user.role === 'CUSTOMER' && machine.customerId !== req.user.customerId)) {
    throw ApiError.badRequest('machineId does not exist or is not yours');
  }

  const request = await prisma.serviceRequest.create({
    data: { ...data, machineId, customerId: machine.customerId, raisedById: req.user.id },
    include: requestInclude,
  });
  res.status(201).json(request);
}

// PATCH /api/requests/:id  { status }
// Admin can set any status. A customer can only cancel their own request while it is still NEW.
async function updateStatus(req, res) {
  const id = parseId(req.params.id);
  const existing = await findVisibleRequest(id, req.user);
  const { status } = req.valid.body;

  if (req.user.role === 'CUSTOMER' && !(status === 'CANCELLED' && existing.status === 'NEW')) {
    throw ApiError.forbidden('Customers can only cancel a request that has not been assigned yet');
  }

  const request = await prisma.serviceRequest.update({ where: { id }, data: { status }, include: requestInclude });
  res.json(request);
}

// POST /api/requests/:id/assign  { technicianId, scheduledDate, type, notes }
// Creates the service job and marks the request ASSIGNED, both in one transaction.
async function assign(req, res) {
  const id = parseId(req.params.id);
  const { technicianId, scheduledDate, type, notes } = req.valid.body;

  const request = await findVisibleRequest(id, req.user);
  if (request.status !== 'NEW') throw ApiError.conflict(`Request is already ${request.status}`);

  const tech = await prisma.user.findUnique({ where: { id: technicianId } });
  if (!tech || tech.role !== 'TECHNICIAN' || !tech.isActive) {
    throw ApiError.badRequest('technicianId must be an active technician');
  }

  await prisma.$transaction([
    prisma.serviceJob.create({
      data: {
        machineId: request.machineId,
        technicianId,
        serviceRequestId: id,
        type,
        scheduledDate,
        notes: notes ?? request.description,
      },
    }),
    prisma.serviceRequest.update({ where: { id }, data: { status: 'ASSIGNED' } }),
  ]);

  res.status(201).json(await findVisibleRequest(id, req.user));
}

module.exports = { list, getOne, create, updateStatus, assign };
