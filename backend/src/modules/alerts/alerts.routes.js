const router = require('express').Router();
const { z } = require('zod');
const { authenticate, requireRole } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const { lowStockParts, upcoming } = require('../../services/alertService');

router.use(authenticate, requireRole('ADMIN', 'TECHNICIAN'));

// GET /api/alerts/low-stock  -> parts where stockQty <= minimumLevel
router.get('/low-stock', async (req, res) => {
  const parts = await lowStockParts();
  res.json({ count: parts.length, data: parts });
});

// GET /api/alerts/upcoming?serviceDays=15&coverDays=30
router.get(
  '/upcoming',
  validate({
    query: z.object({
      serviceDays: z.coerce.number().int().min(0).max(365).default(15),
      coverDays: z.coerce.number().int().min(0).max(365).default(30),
    }),
  }),
  async (req, res) => {
    res.json(await upcoming(req.valid.query));
  },
);

module.exports = router;
