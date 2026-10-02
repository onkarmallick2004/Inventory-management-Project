// Entry point: starts the HTTP server.
const app = require('./app');
const { port } = require('./config/env');

app.listen(port, () => {
  console.log(`API running on http://localhost:${port}  (docs: http://localhost:${port}/api/docs)`);
});
