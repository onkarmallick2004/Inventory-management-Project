const router = require('express').Router();
const validate = require('../../middleware/validate');
const controller = require('./public.controller');

router.get('/machines/:qrToken', controller.getMachine);
router.post('/machines/:qrToken/requests', validate({ body: controller.publicRequestBody }), controller.createRequest);

module.exports = router;
