const prisma = require('../../config/prisma');
const ApiError = require('../../utils/ApiError');
const { parseId } = require('../../utils/id');
const { pageArgs, sortArgs, searchFilter, paged } = require('../../utils/pagination');

// Adds an isLowStock flag the UI can use for highlighting.
const withFlag = (part) => ({ ...part, isLowStock: part.stockQty <= part.minimumLevel });

// Converts [1, 2] into Prisma's many-to-many "set" syntax.
const productLinks = (ids) => (ids ? { set: ids.map((id) => ({ id })) } : undefined);

// GET /api/parts?search=filter&lowStock=true&productId=3
async function list(req, res) {
  const q = req.valid.query;
  const where = {
    ...searchFilter(q.search, ['name', 'partNumber']),
    // Compare two columns of the same row: stockQty <= minimumLevel
    ...(q.lowStock === 'true' && { stockQty: { lte: prisma.part.fields.minimumLevel } }),
    ...(q.productId && { compatibleProducts: { some: { id: q.productId } } }),
  };
  const [rows, total] = await Promise.all([
    prisma.part.findMany({
      where,
      ...pageArgs(q),
      orderBy: sortArgs(q.sort, ['name', 'partNumber', 'stockQty', 'unitPrice'], { name: 'asc' }),
      include: { compatibleProducts: { select: { id: true, modelName: true } } },
    }),
    prisma.part.count({ where }),
  ]);
  res.json(paged(rows.map(withFlag), total, q));
}

// GET /api/parts/:id  (includes the last 20 stock movements)
async function getOne(req, res) {
  const part = await prisma.part.findUnique({
    where: { id: parseId(req.params.id) },
    include: {
      compatibleProducts: { select: { id: true, modelName: true, name: true } },
      stockMovements: { orderBy: { createdAt: 'desc' }, take: 20 },
    },
  });
  if (!part) throw ApiError.notFound('Part');
  res.json(withFlag(part));
}

async function create(req, res) {
  const { compatibleProductIds, ...data } = req.valid.body;
  const part = await prisma.part.create({
    data: {
      ...data,
      compatibleProducts: compatibleProductIds && { connect: compatibleProductIds.map((id) => ({ id })) },
      // Record the opening stock so the movement history adds up.
      stockMovements: data.stockQty > 0
        ? { create: { change: data.stockQty, reason: 'ADJUSTMENT', note: 'Opening stock', userId: req.user.id } }
        : undefined,
    },
  });
  res.status(201).json(withFlag(part));
}

async function update(req, res) {
  const { compatibleProductIds, ...data } = req.valid.body;
  const part = await prisma.part.update({
    where: { id: parseId(req.params.id) },
    data: { ...data, compatibleProducts: productLinks(compatibleProductIds) },
  });
  res.json(withFlag(part));
}

async function remove(req, res) {
  await prisma.part.delete({ where: { id: parseId(req.params.id) } });
  res.status(204).end();
}

// POST /api/parts/:id/restock  { quantity, note }
// Increases stock and logs the movement in one transaction.
async function restock(req, res) {
  const id = parseId(req.params.id);
  const { quantity, note } = req.valid.body;

  const part = await prisma.$transaction(async (tx) => {
    const updated = await tx.part.update({ where: { id }, data: { stockQty: { increment: quantity } } });
    await tx.stockMovement.create({
      data: { partId: id, change: quantity, reason: 'RESTOCK', note, userId: req.user.id },
    });
    return updated;
  });
  res.json(withFlag(part));
}

module.exports = { list, getOne, create, update, remove, restock };
