// JWT authentication and role-based access control.
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/env');
const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');

// Reads "Authorization: Bearer <token>", verifies it, and puts the user on req.user.
// We re-load the user from the database so a deactivated account stops working immediately.
async function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw ApiError.unauthorized();
  }

  let payload;
  try {
    payload = jwt.verify(token, jwtSecret);
  } catch {
    throw ApiError.unauthorized('Invalid or expired token');
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || !user.isActive) {
    throw ApiError.unauthorized('Account not found or disabled');
  }

  req.user = { id: user.id, role: user.role, customerId: user.customerId, name: user.name };
  next();
}

// Usage: router.post('/', authenticate, requireRole('ADMIN'), handler)
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw ApiError.forbidden();
    }
    next();
  };
}

module.exports = { authenticate, requireRole };
