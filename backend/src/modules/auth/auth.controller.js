const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../../config/prisma');
const { jwtSecret, jwtExpiresIn } = require('../../config/env');
const ApiError = require('../../utils/ApiError');

// Never send the password hash back to the client.
function publicUser(user) {
  const { passwordHash, ...rest } = user;
  return rest;
}

function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, jwtSecret, { expiresIn: jwtExpiresIn });
}

// POST /api/auth/register  (Admin only: creates technician, customer or admin accounts)
async function register(req, res) {
  const { password, ...data } = req.valid.body;

  if (data.customerId) {
    const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
    if (!customer) throw ApiError.badRequest('customerId does not exist');
  }
  if (data.role !== 'CUSTOMER') delete data.customerId;

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { ...data, passwordHash } });
  res.status(201).json(publicUser(user));
}

// POST /api/auth/login
async function login(req, res) {
  const { email, password } = req.valid.body;
  const user = await prisma.user.findUnique({ where: { email } });

  // Same message for "no such user" and "wrong password" so emails can't be probed.
  const ok = user && user.isActive && (await bcrypt.compare(password, user.passwordHash));
  if (!ok) throw new ApiError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect');

  res.json({ token: signToken(user), user: publicUser(user) });
}

// GET /api/auth/me
async function me(req, res) {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: { customer: true },
  });
  res.json(publicUser(user));
}

module.exports = { register, login, me, publicUser };
