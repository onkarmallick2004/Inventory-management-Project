const { z } = require('zod');
const { JOB_TYPES, JOB_STATUSES } = require('../../config/constants');
const { listQuery } = require('../../utils/pagination');

const jobBody = z.object({
  machineId: z.number().int().positive(),
  technicianId: z.number().int().positive().nullable().optional(),
  type: z.enum(JOB_TYPES),
  scheduledDate: z.coerce.date(),
  notes: z.string().trim().optional(),
});

// Status cannot be set to CLOSED here: closing goes through POST /jobs/:id/close
// (Phase 2) so stock deduction and due-date updates always happen.
const openStatuses = JOB_STATUSES.filter((s) => s !== 'CLOSED');

const jobUpdateBody = jobBody.partial().extend({ status: z.enum(openStatuses).optional() });

const statusBody = z.object({
  status: z.enum(openStatuses, { message: 'Use POST /api/jobs/:id/close to close a job' }),
  notes: z.string().trim().optional(),
});

const partUsedBody = z.object({
  partId: z.number().int().positive(),
  quantity: z.number().int().positive(),
});

const jobListQuery = listQuery.extend({
  status: z.enum(JOB_STATUSES).optional(),
  type: z.enum(JOB_TYPES).optional(),
  technicianId: z.coerce.number().int().positive().optional(),
  machineId: z.coerce.number().int().positive().optional(),
  from: z.coerce.date().optional(), // scheduledDate >= from
  to: z.coerce.date().optional(), // scheduledDate <= to
});

module.exports = { jobBody, jobUpdateBody, statusBody, partUsedBody, jobListQuery };
