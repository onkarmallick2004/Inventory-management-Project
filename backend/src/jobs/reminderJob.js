// Schedules the daily reminder run with node-cron.
// Default: every day at 07:00 in REMINDER_TZ (Asia/Kolkata). Override with REMINDER_CRON.
const cron = require('node-cron');
const { runDailyReminders } = require('../services/reminderService');

function startReminderJob() {
  const schedule = process.env.REMINDER_CRON || '0 7 * * *';
  const timezone = process.env.REMINDER_TZ || 'Asia/Kolkata';

  cron.schedule(
    schedule,
    async () => {
      try {
        const summary = await runDailyReminders();
        console.log('[cron] daily reminders done', summary);
      } catch (err) {
        console.error('[cron] daily reminders failed', err);
      }
    },
    { timezone },
  );
  console.log(`[cron] daily reminders scheduled: "${schedule}" (${timezone})`);
}

module.exports = { startReminderJob };
