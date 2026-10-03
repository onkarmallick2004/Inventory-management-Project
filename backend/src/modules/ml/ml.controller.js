const { z } = require('zod');
const prisma = require('../../config/prisma');
const { callMl } = require('../../services/mlClient');

// What the customer enters on the Product Selector page.
const selectorBody = z.object({
  category: z.enum(['AIR_COMPRESSOR', 'VACUUM_PUMP']).default('AIR_COMPRESSOR'),
  airflowCfm: z.number().positive(),
  pressureBar: z.number().positive(),
  phase: z.enum(['SINGLE', 'THREE']),
  application: z.string().trim().min(2),
});

// POST /api/ml/product-selector   (public, so the marketing site can use it)
async function productSelector(req, res) {
  const products = await prisma.product.findMany();
  const result = await callMl('/select-products', { requirements: req.valid.body, products, topN: 3 });
  res.json(result);
}

const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

// Builds units-used-per-month for every part over the last `months` complete months.
// Usage is counted in the month the job was closed (that is when stock left the store).
async function monthlyUsage(months) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - months, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 1); // exclude the current, unfinished month

  const labels = [];
  for (let i = 0; i < months; i++) labels.push(monthKey(new Date(start.getFullYear(), start.getMonth() + i, 1)));

  const [parts, usage] = await Promise.all([
    prisma.part.findMany({ orderBy: { partNumber: 'asc' } }),
    prisma.partUsed.findMany({
      where: { job: { status: 'CLOSED', closedDate: { gte: start, lt: end } } },
      select: { partId: true, quantity: true, job: { select: { closedDate: true } } },
    }),
  ]);

  const history = new Map(parts.map((p) => [p.id, new Array(months).fill(0)]));
  for (const u of usage) {
    const index = labels.indexOf(monthKey(u.job.closedDate));
    if (index >= 0) history.get(u.partId)[index] += u.quantity;
  }

  return {
    months: labels,
    parts: parts.map((p) => ({
      partId: p.id,
      partNumber: p.partNumber,
      name: p.name,
      stockQty: p.stockQty,
      minimumLevel: p.minimumLevel,
      history: history.get(p.id),
    })),
  };
}

// GET /api/ml/parts-forecast?months=12   (admin)
async function partsForecast(req, res) {
  const data = await monthlyUsage(req.valid.query.months);
  res.json(await callMl('/forecast-parts', data));
}

const forecastQuery = z.object({ months: z.coerce.number().int().min(4).max(36).default(12) });

module.exports = { productSelector, partsForecast, selectorBody, forecastQuery, monthlyUsage };
