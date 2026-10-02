const router = require('express').Router();
const { z } = require('zod');
const prisma = require('../../config/prisma');
const { authenticate } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const ApiError = require('../../utils/ApiError');
const { parseId } = require('../../utils/id');
const { listQuery, pageArgs, paged } = require('../../utils/pagination');

router.use(authenticate);

// Admins and technicians see every notification; customers only those about their machines.
function scopeForUser(user) {
  return user.role === 'CUSTOMER' ? { machine: { customerId: user.customerId } } : {};
}

// GET /api/notifications?unread=true&type=SERVICE_DUE
router.get(
  '/',
  validate({
    query: listQuery.extend({
      unread: z.enum(['true', 'false']).optional(),
      type: z.enum(['SERVICE_DUE', 'AMC_EXPIRING', 'WARRANTY_EXPIRING', 'LOW_STOCK']).optional(),
    }),
  }),
  async (req, res) => {
    const q = req.valid.query;
    const where = {
      ...(q.unread === 'true' && { isRead: false }),
      ...(q.type && { type: q.type }),
      ...scopeForUser(req.user),
    };
    const [rows, total] = await Promise.all([
      prisma.notification.findMany({ where, ...pageArgs(q), orderBy: { createdAt: 'desc' } }),
      prisma.notification.count({ where }),
    ]);
    res.json(paged(rows, total, q));
  },
);

// PATCH /api/notifications/:id/read
router.patch('/:id/read', async (req, res) => {
  const id = parseId(req.params.id);
  const notification = await prisma.notification.findFirst({ where: { id, ...scopeForUser(req.user) } });
  if (!notification) throw ApiError.notFound('Notification');
  res.json(await prisma.notification.update({ where: { id }, data: { isRead: true } }));
});

module.exports = router;
