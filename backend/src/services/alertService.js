// Queries behind the alerts endpoints and the daily reminder job.
const prisma = require('../config/prisma');
const { addDays, daysUntil, startOfDay } = require('../utils/dates');

const machineInclude = {
  product: { select: { modelName: true, name: true } },
  customer: { select: { id: true, companyName: true, email: true, contactPerson: true } },
};

// Parts where stockQty <= minimumLevel, worst first.
async function lowStockParts() {
  const parts = await prisma.part.findMany({
    where: { stockQty: { lte: prisma.part.fields.minimumLevel } },
    orderBy: { stockQty: 'asc' },
  });
  return parts.map((p) => ({ ...p, shortBy: p.minimumLevel - p.stockQty }));
}

// Machines whose service is due within `serviceDays` (overdue ones included),
// and AMC / warranty cover ending within `coverDays`.
async function upcoming({ today = new Date(), serviceDays = 15, coverDays = 30 } = {}) {
  const dayStart = startOfDay(today);
  const serviceLimit = addDays(dayStart, serviceDays + 1);
  const coverLimit = addDays(dayStart, coverDays + 1);

  const [serviceDue, amcExpiring, warrantyExpiring] = await Promise.all([
    prisma.machine.findMany({
      where: { nextServiceDue: { lt: serviceLimit } },
      include: machineInclude,
      orderBy: { nextServiceDue: 'asc' },
    }),
    prisma.machine.findMany({
      where: { amcEnd: { gte: dayStart, lt: coverLimit } },
      include: machineInclude,
      orderBy: { amcEnd: 'asc' },
    }),
    prisma.machine.findMany({
      where: { warrantyEnd: { gte: dayStart, lt: coverLimit } },
      include: machineInclude,
      orderBy: { warrantyEnd: 'asc' },
    }),
  ]);

  const withDays = (field) => (m) => ({ ...m, daysLeft: daysUntil(startOfDay(m[field]), dayStart) });
  return {
    serviceDue: serviceDue.map(withDays('nextServiceDue')),
    amcExpiring: amcExpiring.map(withDays('amcEnd')),
    warrantyExpiring: warrantyExpiring.map(withDays('warrantyEnd')),
  };
}

module.exports = { lowStockParts, upcoming };
