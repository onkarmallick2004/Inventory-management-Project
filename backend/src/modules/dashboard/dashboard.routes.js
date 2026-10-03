// GET /api/dashboard/summary: everything the admin dashboard needs in one call.
const router = require('express').Router();
const prisma = require('../../config/prisma');
const { authenticate, requireRole } = require('../../middleware/auth');
const { lowStockParts, upcoming } = require('../../services/alertService');
const { startOfDay, addDays } = require('../../utils/dates');

router.use(authenticate, requireRole('ADMIN'));

// "2026-03" style key for grouping by month.
const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

router.get('/summary', async (req, res) => {
  const today = startOfDay();
  const weekEnd = addDays(today, 7);
  const yearAgo = new Date(today.getFullYear(), today.getMonth() - 11, 1);

  const [openJobs, inProgressJobs, newRequests, dueThisWeek, lowStock, soon, closedJobs] = await Promise.all([
    prisma.serviceJob.count({ where: { status: 'OPEN' } }),
    prisma.serviceJob.count({ where: { status: 'IN_PROGRESS' } }),
    prisma.serviceRequest.count({ where: { status: 'NEW' } }),
    prisma.machine.count({ where: { nextServiceDue: { lt: weekEnd } } }),
    lowStockParts(),
    upcoming({ today }),
    prisma.serviceJob.findMany({
      where: { status: 'CLOSED', closedDate: { gte: yearAgo } },
      select: { closedDate: true, type: true },
    }),
  ]);

  // Jobs closed per month for the last 12 months, split by type (for a stacked bar chart).
  const months = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(yearAgo.getFullYear(), yearAgo.getMonth() + i, 1);
    months.push({ month: monthKey(d), INSTALLATION: 0, ROUTINE: 0, BREAKDOWN: 0 });
  }
  for (const job of closedJobs) {
    const row = months.find((m) => m.month === monthKey(job.closedDate));
    if (row) row[job.type] += 1;
  }

  res.json({
    counts: {
      openJobs: openJobs + inProgressJobs,
      inProgressJobs,
      newRequests,
      servicesDueThisWeek: dueThisWeek,
      lowStockParts: lowStock.length,
      amcExpiringSoon: soon.amcExpiring.length,
    },
    jobsByMonth: months,
    lowStock: lowStock.slice(0, 8),
    serviceDue: soon.serviceDue.slice(0, 8),
    amcExpiring: soon.amcExpiring,
    warrantyExpiring: soon.warrantyExpiring,
  });
});

module.exports = router;
