const router = require('express').Router();
const { authenticate, requireRole } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const { machineBody, machineUpdateBody, machineListQuery } = require('./machines.schema');
const controller = require('./machines.controller');

router.use(authenticate);

// All roles can read; customers only see their own machines (enforced in the controller).
router.get('/', validate({ query: machineListQuery }), controller.list);
router.get('/:id', controller.getOne);
router.get('/:id/qr', controller.qrCode);

router.post('/', requireRole('ADMIN'), validate({ body: machineBody }), controller.create);
router.put('/:id', requireRole('ADMIN'), validate({ body: machineUpdateBody }), controller.update);
router.delete('/:id', requireRole('ADMIN'), controller.remove);

module.exports = router;
