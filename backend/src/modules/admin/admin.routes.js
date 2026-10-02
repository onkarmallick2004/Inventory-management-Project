const router = require('express').Router();
const { authenticate, requireRole } = require('../../middleware/auth');
const { runDailyReminders } = require('../../services/reminderService');

router.use(authenticate, requireRole('ADMIN'));

// POST /api/admin/run-reminders
// Runs the daily reminder job immediately (handy for demos and testing).
router.post('/run-reminders', async (req, res) => {
  res.json(await runDailyReminders());
});

module.exports = router;
