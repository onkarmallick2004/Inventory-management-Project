// Closing a service job: the most important business rule in the system.
//
// When a job is closed, every part recorded on it is deducted from stock.
// All of it happens inside ONE database transaction:
//   1. check every part has enough stock  -> if not, refuse (nothing changes)
//   2. deduct stock + write a StockMovement for each part
//   3. mark the job CLOSED with today's date
//   4. if it was a ROUTINE job, move the machine's next service due date
//   5. if the job came from a service request, mark that request RESOLVED
// If anything fails half-way, the database rolls back to how it was before.
const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');
const { resetsServiceClock, calculateNextServiceDue } = require('./dueDateService');

// Pure function (easy to unit test): which parts don't have enough stock?
// partsUsed = [{ quantity, part: { id, partNumber, name, stockQty } }]
function findShortages(partsUsed) {
  return partsUsed
    .filter((pu) => pu.part.stockQty < pu.quantity)
    .map((pu) => ({
      partId: pu.part.id,
      partNumber: pu.part.partNumber,
      name: pu.part.name,
      required: pu.quantity,
      inStock: pu.part.stockQty,
    }));
}

function isLowStock(part) {
  return part.stockQty <= part.minimumLevel;
}

async function closeJob(jobId, { userId, notes, closedDate = new Date() }) {
  const result = await prisma.$transaction(async (tx) => {
    const job = await tx.serviceJob.findUnique({
      where: { id: jobId },
      include: { machine: true, partsUsed: { include: { part: true } } },
    });
    if (!job) throw ApiError.notFound('Service job');
    if (job.status === 'CLOSED') throw ApiError.conflict('This job is already closed');

    // 1. Block the close if any part is short.
    const shortages = findShortages(job.partsUsed);
    if (shortages.length > 0) {
      throw new ApiError(409, 'INSUFFICIENT_STOCK', 'Not enough stock to close this job', shortages);
    }

    // 2. Deduct stock. The "stockQty >= quantity" condition is a second safety net:
    //    if another request used the stock a moment ago, count is 0 and we roll back.
    const updatedParts = [];
    for (const pu of job.partsUsed) {
      const { count } = await tx.part.updateMany({
        where: { id: pu.partId, stockQty: { gte: pu.quantity } },
        data: { stockQty: { decrement: pu.quantity } },
      });
      if (count === 0) {
        throw new ApiError(409, 'INSUFFICIENT_STOCK', `Stock for ${pu.part.partNumber} changed, please retry`);
      }
      await tx.stockMovement.create({
        data: { partId: pu.partId, change: -pu.quantity, reason: 'JOB_CONSUMPTION', jobId, userId },
      });
      updatedParts.push(await tx.part.findUnique({ where: { id: pu.partId } }));
    }

    // 3. Close the job.
    const closedJob = await tx.serviceJob.update({
      where: { id: jobId },
      data: { status: 'CLOSED', closedDate, ...(notes !== undefined && { notes }) },
    });

    // 4. Routine service moves the next due date forward.
    let nextServiceDue = job.machine.nextServiceDue;
    if (resetsServiceClock(job.type)) {
      nextServiceDue = calculateNextServiceDue(closedDate, job.machine.serviceIntervalDays);
      await tx.machine.update({ where: { id: job.machineId }, data: { nextServiceDue } });
    }

    // 5. Resolve the customer's request, if there was one.
    if (job.serviceRequestId) {
      await tx.serviceRequest.update({ where: { id: job.serviceRequestId }, data: { status: 'RESOLVED' } });
    }

    return { job: closedJob, nextServiceDue, updatedParts };
  });

  // After the transaction: raise low-stock notifications for parts that are now at/below minimum.
  const lowStockParts = result.updatedParts.filter(isLowStock);
  for (const part of lowStockParts) {
    await notifyLowStock(part);
  }

  return {
    job: result.job,
    nextServiceDue: result.nextServiceDue,
    stockAfter: result.updatedParts.map((p) => ({ partId: p.id, partNumber: p.partNumber, stockQty: p.stockQty })),
    lowStockParts: lowStockParts.map((p) => ({ partId: p.id, partNumber: p.partNumber, stockQty: p.stockQty, minimumLevel: p.minimumLevel })),
  };
}

// One unread LOW_STOCK notification per part is enough; don't stack duplicates.
async function notifyLowStock(part) {
  const existing = await prisma.notification.findFirst({ where: { type: 'LOW_STOCK', partId: part.id, isRead: false } });
  if (existing) return existing;
  return prisma.notification.create({
    data: {
      type: 'LOW_STOCK',
      partId: part.id,
      message: `Low stock: ${part.partNumber} ${part.name} has ${part.stockQty} left (minimum ${part.minimumLevel})`,
    },
  });
}

module.exports = { findShortages, isLowStock, closeJob, notifyLowStock };
