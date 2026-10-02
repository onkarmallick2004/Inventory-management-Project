// Rules for when a machine is next due for routine service.
const { addDays } = require('../utils/dates');

// Only a ROUTINE service resets the service clock. A breakdown repair or an
// installation does not count as the periodic maintenance visit.
function resetsServiceClock(jobType) {
  return jobType === 'ROUTINE';
}

// next due = date the routine job was closed + the machine's service interval.
function calculateNextServiceDue(closedDate, serviceIntervalDays) {
  if (!Number.isInteger(serviceIntervalDays) || serviceIntervalDays <= 0) {
    throw new Error('serviceIntervalDays must be a positive whole number');
  }
  return addDays(closedDate, serviceIntervalDays);
}

module.exports = { resetsServiceClock, calculateNextServiceDue };
