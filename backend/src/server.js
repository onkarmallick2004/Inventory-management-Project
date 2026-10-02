// Entry point: starts the HTTP server and the daily reminder job.
const app = require('./app');
const { port } = require('./config/env');
const { startReminderJob } = require('./jobs/reminderJob');

app.listen(port, () => {
  console.log(`API running on http://localhost:${port}  (docs: http://localhost:${port}/api/docs)`);
});

startReminderJob();
