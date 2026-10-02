// Smart features. The heavy lifting happens in the Python ML service (ml-service/).
const router = require('express').Router();
const { authenticate, requireRole } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const controller = require('./ml.controller');

router.post('/product-selector', validate({ body: controller.selectorBody }), controller.productSelector);
router.get('/parts-forecast', authenticate, requireRole('ADMIN'), validate({ query: controller.forecastQuery }), controller.partsForecast);

module.exports = router;
