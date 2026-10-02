const bcrypt = require('bcryptjs');
const prisma = require('../../config/prisma');
const ApiError = require('../../utils/ApiError');
const { parseId } = require('../../utils/id');
const { pageArgs, sortArgs, searchFilter, paged } = require('../../utils/pagination');
const { publicUser } = require('../auth/auth.controller');

// GET /api/users?role=TECHNICIAN&search=ravi
async function list(req, res) {
  const q = req.valid.query;
  const where = {
    ...searchFilter(q.search, ['name', 'email']),
    ...(q.role && { role: q.role }),
  };
  const [rows, total] = await Promise.all([
    prisma.user.findMany({ where, ...pageArgs(q), orderBy: sortArgs(q.sort, ['name', 'createdAt']) }),
    prisma.user.count({ where }),
  ]);
  res.json(paged(rows.map(publicUser), total, q));
}

// GET /api/users/:id
async function getOne(req, res) {
  const user = await prisma.user.findUnique({ where: { id: parseId(req.params.id) } });
  if (!user) throw ApiError.notFound('User');
  res.json(publicUser(user));
}

// PUT /api/users/:id  (name, phone, isActive, password)
async function update(req, res) {
  const { password, ...data } = req.valid.body;
  if (password) data.passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.update({ where: { id: parseId(req.params.id) }, data });
  res.json(publicUser(user));
}

module.exports = { list, getOne, update };
