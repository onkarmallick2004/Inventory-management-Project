// Small date helpers used by machines, the public QR page and (Phase 2) reminders.

const DAY_MS = 24 * 60 * 60 * 1000;

function addDays(date, days) {
  return new Date(new Date(date).getTime() + days * DAY_MS);
}

// Whole days from today until `date` (negative if it is in the past).
function daysUntil(date, today = new Date()) {
  return Math.ceil((new Date(date).getTime() - today.getTime()) / DAY_MS);
}

// Status of a warranty or AMC given its end date.
//   NONE           -> no cover recorded
//   EXPIRED        -> end date has passed
//   EXPIRING_SOON  -> ends within `soonDays`
//   ACTIVE         -> otherwise
function coverageStatus(endDate, today = new Date(), soonDays = 30) {
  if (!endDate) return 'NONE';
  const days = daysUntil(endDate, today);
  if (days < 0) return 'EXPIRED';
  if (days <= soonDays) return 'EXPIRING_SOON';
  return 'ACTIVE';
}

module.exports = { DAY_MS, addDays, daysUntil, coverageStatus };
