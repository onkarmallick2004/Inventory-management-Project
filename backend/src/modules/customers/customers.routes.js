const router = require('express').Router();
const { authenticate, requireRole } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const { listQuery } = require('../../utils/pagination');
const { customerBody, customerUpdateBody } = require('./customers.schema');
const controller = require('./customers.controller');

router.use(authenticate);

// Technicians can look up customer contact details; only admins can change them.
router.get('/', requireRole('ADMIN', 'TECHNICIAN'), validate({ query: listQuery }), controller.list);
router.get('/:id', requireRole('ADMIN', 'TECHNICIAN'), controller.getOne);
router.post('/', requireRole('ADMIN'), validate({ body: customerBody }), controller.create);
router.put('/:id', requireRole('ADMIN'), validate({ body: customerUpdateBody }), controller.update);
router.delete('/:id', requireRole('ADMIN'), controller.remove);

module.exports = router;
