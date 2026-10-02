const prisma = require('../../config/prisma');
const ApiError = require('../../utils/ApiError');
const { parseId } = require('../../utils/id');
const { pageArgs, sortArgs, searchFilter, paged } = require('../../utils/pagination');

// GET /api/customers?search=acme
async function list(req, res) {
  const q = req.valid.query;
  const where = searchFilter(q.search, ['companyName', 'contactPerson', 'email', 'city']);
  const [rows, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      ...pageArgs(q),
      orderBy: sortArgs(q.sort, ['companyName', 'city', 'createdAt'], { companyName: 'asc' }),
      include: { _count: { select: { machines: true } } },
    }),
    prisma.customer.count({ where }),
  ]);
  res.json(paged(rows, total, q));
}

// GET /api/customers/:id  (includes the customer's machines)
async function getOne(req, res) {
  const customer = await prisma.customer.findUnique({
    where: { id: parseId(req.params.id) },
    include: { machines: { include: { product: true } } },
  });
  if (!customer) throw ApiError.notFound('Customer');
  res.json(customer);
}

async function create(req, res) {
  const customer = await prisma.customer.create({ data: req.valid.body });
  res.status(201).json(customer);
}

async function update(req, res) {
  const customer = await prisma.customer.update({ where: { id: parseId(req.params.id) }, data: req.valid.body });
  res.json(customer);
}

// Deleting a customer that still owns machines fails with 409 (foreign key).
async function remove(req, res) {
  await prisma.customer.delete({ where: { id: parseId(req.params.id) } });
  res.status(204).end();
}

module.exports = { list, getOne, create, update, remove };
