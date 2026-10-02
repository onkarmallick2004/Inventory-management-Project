// Allowed values for every "enum-like" string column in the database.
// Validators import these, so changing a list here changes what the API accepts.

const ROLES = ['ADMIN', 'TECHNICIAN', 'CUSTOMER'];
const PRODUCT_CATEGORIES = ['AIR_COMPRESSOR', 'VACUUM_PUMP'];
const PRODUCT_TYPES = ['SCREW', 'PISTON', 'ROTARY_VANE', 'SCROLL', 'LIQUID_RING'];
const PHASES = ['SINGLE', 'THREE'];
const JOB_TYPES = ['INSTALLATION', 'ROUTINE', 'BREAKDOWN'];
const JOB_STATUSES = ['OPEN', 'IN_PROGRESS', 'CLOSED'];
const REQUEST_STATUSES = ['NEW', 'ASSIGNED', 'RESOLVED', 'CANCELLED'];
const STOCK_REASONS = ['RESTOCK', 'JOB_CONSUMPTION', 'ADJUSTMENT'];

module.exports = {
  ROLES,
  PRODUCT_CATEGORIES,
  PRODUCT_TYPES,
  PHASES,
  JOB_TYPES,
  JOB_STATUSES,
  REQUEST_STATUSES,
  STOCK_REASONS,
};
