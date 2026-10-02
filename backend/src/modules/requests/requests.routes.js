const router = require('express').Router();
const { authenticate, requireRole } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const { requestBody, requestStatusBody, assignBody, requestListQuery } = require('./requests.schema');
const controller = require('./requests.controller');

router.use(authenticate, requireRole('ADMIN', 'CUSTOMER'));

router.get('/', validate({ query: requestListQuery }), controller.list);
router.get('/:id', controller.getOne);
router.post('/', validate({ body: requestBody }), controller.create);
router.patch('/:id', validate({ body: requestStatusBody }), controller.updateStatus);
router.post('/:id/assign', requireRole('ADMIN'), validate({ body: assignBody }), controller.assign);

module.exports = router;
