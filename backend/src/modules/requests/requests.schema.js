const { z } = require('zod');
const { REQUEST_STATUSES, JOB_TYPES } = require('../../config/constants');
const { listQuery } = require('../../utils/pagination');

const requestBody = z.object({
  machineId: z.number().int().positive(),
  description: z.string().trim().min(10, 'Please describe the problem in at least 10 characters'),
  contactName: z.string().trim().optional(),
  contactPhone: z.string().trim().optional(),
});

const requestStatusBody = z.object({ status: z.enum(REQUEST_STATUSES) });

// Admin turns a request into a service job for a technician.
const assignBody = z.object({
  technicianId: z.number().int().positive(),
  scheduledDate: z.coerce.date(),
  type: z.enum(JOB_TYPES).default('BREAKDOWN'),
  notes: z.string().trim().optional(),
});

const requestListQuery = listQuery.extend({
  status: z.enum(REQUEST_STATUSES).optional(),
  machineId: z.coerce.number().int().positive().optional(),
});

module.exports = { requestBody, requestStatusBody, assignBody, requestListQuery };
