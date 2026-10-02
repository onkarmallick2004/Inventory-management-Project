// Builds the Express app. Kept separate from server.js so tests can import it
// without opening a network port.
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');

const { frontendUrl, nodeEnv } = require('./config/env');
const { errorHandler, notFoundRoute } = require('./middleware/errorHandler');

const app = express();

app.use(helmet());
app.use(cors({ origin: frontendUrl }));
app.use(express.json({ limit: '1mb' }));
if (nodeEnv !== 'test') app.use(morgan('dev'));

// API documentation at /api/docs
const openapi = YAML.load(path.join(__dirname, '..', 'openapi.yaml'));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapi));
app.get('/api/openapi.json', (req, res) => res.json(openapi));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', require('./modules/auth/auth.routes'));
app.use('/api/users', require('./modules/users/users.routes'));
app.use('/api/customers', require('./modules/customers/customers.routes'));
app.use('/api/products', require('./modules/products/products.routes'));
app.use('/api/machines', require('./modules/machines/machines.routes'));
app.use('/api/parts', require('./modules/parts/parts.routes'));
app.use('/api/jobs', require('./modules/jobs/jobs.routes'));
app.use('/api/requests', require('./modules/requests/requests.routes'));
app.use('/api/alerts', require('./modules/alerts/alerts.routes'));
app.use('/api/notifications', require('./modules/notifications/notifications.routes'));
app.use('/api/admin', require('./modules/admin/admin.routes'));
app.use('/api/dashboard', require('./modules/dashboard/dashboard.routes'));
app.use('/api/public', require('./modules/public/public.routes'));

app.use(notFoundRoute);
app.use(errorHandler);

module.exports = app;
