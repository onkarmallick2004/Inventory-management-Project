// Endpoints behind the machine QR code. No login needed, so they reveal only
// machine-level details (never customer names, contacts or job notes).
const { z } = require('zod');
const prisma = require('../../config/prisma');
const ApiError = require('../../utils/ApiError');
const { coverageStatus } = require('../../utils/dates');

const publicRequestBody = z.object({
  contactName: z.string().trim().min(2),
  contactPhone: z.string().trim().min(6),
  description: z.string().trim().min(10, 'Please describe the problem in at least 10 characters'),
});

async function findByToken(token) {
  const machine = await prisma.machine.findUnique({ where: { qrToken: token }, include: { product: true } });
  if (!machine) throw ApiError.notFound('Machine');
  return machine;
}

// GET /api/public/machines/:qrToken
async function getMachine(req, res) {
  const m = await findByToken(req.params.qrToken);
  res.json({
    serialNumber: m.serialNumber,
    modelName: m.product.modelName,
    productName: m.product.name,
    category: m.product.category,
    installDate: m.installDate,
    warrantyEnd: m.warrantyEnd,
    warrantyStatus: coverageStatus(m.warrantyEnd),
    amcEnd: m.amcEnd,
    amcStatus: coverageStatus(m.amcEnd),
    nextServiceDue: m.nextServiceDue,
  });
}

// POST /api/public/machines/:qrToken/requests  { contactName, contactPhone, description }
async function createRequest(req, res) {
  const m = await findByToken(req.params.qrToken);
  const request = await prisma.serviceRequest.create({
    data: { ...req.valid.body, machineId: m.id, customerId: m.customerId },
  });
  res.status(201).json({ id: request.id, status: request.status, message: 'Request received. Our team will contact you.' });
}

module.exports = { getMachine, createRequest, publicRequestBody };
