// The daily reminder run (called by node-cron and by POST /api/admin/run-reminders).
//
// For every machine that is
//   - due for service within 15 days, or
//   - has AMC or warranty ending within 30 days,
// it creates a Notification (once per machine + type + due date) and emails
// the customer, with the admin in copy. Running it twice on the same day
// does not create duplicates, thanks to the unique index on Notification.
const prisma = require('../config/prisma');
const { sendMail } = require('./mailService');
const { upcoming, lowStockParts } = require('./alertService');
const { notifyLowStock } = require('./stockService');
const { startOfDay } = require('../utils/dates');

const SERVICE_DAYS = 15;
const COVER_DAYS = 30;

function describe(type, machine, daysLeft) {
  const name = `${machine.product.modelName} (S/N ${machine.serialNumber})`;
  const where = `for ${name} at ${machine.customer.companyName}.`;
  if (type === 'SERVICE_DUE' && daysLeft < 0) {
    return `Routine service is overdue by ${-daysLeft} day(s) ${where}`;
  }
  const when = daysLeft === 0 ? 'today' : `in ${daysLeft} day(s)`;
  const what = {
    SERVICE_DUE: 'Routine service is due',
    AMC_EXPIRING: 'Annual Maintenance Contract (AMC) ends',
    WARRANTY_EXPIRING: 'Warranty ends',
  }[type];
  return `${what} ${when} ${where}`;
}

// Creates the notification if it doesn't exist yet. Returns it only when it is new.
async function createIfNew(type, machine, dueDate, message) {
  const key = { type, machineId: machine.id, dueDate: startOfDay(dueDate) };
  const existing = await prisma.notification.findFirst({ where: key });
  if (existing) return null;
  return prisma.notification.create({ data: { ...key, message } });
}

async function runDailyReminders({ today = new Date() } = {}) {
  const found = await upcoming({ today, serviceDays: SERVICE_DAYS, coverDays: COVER_DAYS });
  const admins = await prisma.user.findMany({ where: { role: 'ADMIN', isActive: true }, select: { email: true } });
  const adminEmails = admins.map((a) => a.email);

  const groups = [
    ['SERVICE_DUE', found.serviceDue, 'nextServiceDue'],
    ['AMC_EXPIRING', found.amcExpiring, 'amcEnd'],
    ['WARRANTY_EXPIRING', found.warrantyExpiring, 'warrantyEnd'],
  ];

  const summary = { SERVICE_DUE: 0, AMC_EXPIRING: 0, WARRANTY_EXPIRING: 0, LOW_STOCK: 0, emailsSent: 0, skippedExisting: 0 };

  for (const [type, machines, dateField] of groups) {
    for (const machine of machines) {
      const message = describe(type, machine, machine.daysLeft);
      const notification = await createIfNew(type, machine, machine[dateField], message);
      if (!notification) {
        summary.skippedExisting += 1;
        continue;
      }
      summary[type] += 1;

      try {
        await sendMail({
          to: machine.customer.email,
          cc: adminEmails.join(','),
          subject: `Reminder: ${message.split(' for ')[0]}`, // e.g. "Reminder: Warranty ends in 12 day(s)"
          text: `Dear ${machine.customer.contactPerson},\n\n${message}\n\nPlease reply to this email or raise a request in the customer portal to book a visit.\n\nRegards,\nService Team`,
        });
        await prisma.notification.update({ where: { id: notification.id }, data: { emailSent: true } });
        summary.emailsSent += 1;
      } catch (err) {
        // A failed email must not stop the other reminders. emailSent stays false.
        console.error(`Reminder email failed for machine ${machine.id}:`, err.message);
      }
    }
  }

  // Also make sure every low-stock part has an open notification.
  for (const part of await lowStockParts()) {
    const before = await prisma.notification.count({ where: { type: 'LOW_STOCK', partId: part.id, isRead: false } });
    await notifyLowStock(part);
    if (before === 0) summary.LOW_STOCK += 1;
  }

  return summary;
}

module.exports = { runDailyReminders, SERVICE_DAYS, COVER_DAYS };
