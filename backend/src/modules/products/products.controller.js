const prisma = require('../../config/prisma');
const ApiError = require('../../utils/ApiError');
const { parseId } = require('../../utils/id');
const { pageArgs, sortArgs, searchFilter, paged } = require('../../utils/pagination');

// GET /api/products?category=AIR_COMPRESSOR&type=SCREW&search=food   (public)
async function list(req, res) {
  const q = req.valid.query;
  const where = {
    ...searchFilter(q.search, ['modelName', 'name', 'applications']),
    ...(q.category && { category: q.category }),
    ...(q.type && { type: q.type }),
    ...(q.phase && { phase: q.phase }),
  };
  const [rows, total] = await Promise.all([
    prisma.product.findMany({
      where,
      ...pageArgs(q),
      orderBy: sortArgs(q.sort, ['modelName', 'airflowCfm', 'pressureBar', 'powerKw', 'price'], { modelName: 'asc' }),
    }),
    prisma.product.count({ where }),
  ]);
  res.json(paged(rows, total, q));
}

// GET /api/products/:id  (includes compatible spare parts)
async function getOne(req, res) {
  const product = await prisma.product.findUnique({
    where: { id: parseId(req.params.id) },
    include: { compatibleParts: { select: { id: true, partNumber: true, name: true } } },
  });
  if (!product) throw ApiError.notFound('Product');
  res.json(product);
}

async function create(req, res) {
  const product = await prisma.product.create({ data: req.valid.body });
  res.status(201).json(product);
}

async function update(req, res) {
  const product = await prisma.product.update({ where: { id: parseId(req.params.id) }, data: req.valid.body });
  res.json(product);
}

async function remove(req, res) {
  await prisma.product.delete({ where: { id: parseId(req.params.id) } });
  res.status(204).end();
}

module.exports = { list, getOne, create, update, remove };
