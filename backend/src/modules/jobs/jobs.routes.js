const router = require('express').Router();
const { authenticate, requireRole } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const { jobBody, jobUpdateBody, statusBody, partUsedBody, jobListQuery } = require('./jobs.schema');
const controller = require('./jobs.controller');

router.use(authenticate);

// Everyone can list/read jobs, scoped by role in the controller.
router.get('/', validate({ query: jobListQuery }), controller.list);
router.get('/:id', controller.getOne);

// Admin manages jobs.
router.post('/', requireRole('ADMIN'), validate({ body: jobBody }), controller.create);
router.put('/:id', requireRole('ADMIN'), validate({ body: jobUpdateBody }), controller.update);
router.delete('/:id', requireRole('ADMIN'), controller.remove);

// Technicians (on their own jobs) and admins do the field work.
const fieldRoles = requireRole('ADMIN', 'TECHNICIAN');
router.patch('/:id/status', fieldRoles, validate({ body: statusBody }), controller.updateStatus);
router.post('/:id/parts', fieldRoles, validate({ body: partUsedBody }), controller.addPart);
router.delete('/:id/parts/:partUsedId', fieldRoles, controller.removePart);

module.exports = router;
