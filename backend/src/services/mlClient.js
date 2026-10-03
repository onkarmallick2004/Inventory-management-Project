// Talks to the Python ML service (FastAPI). The ML service has no database:
// we send it the data, it sends back results.
const ApiError = require('../utils/ApiError');

const ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

async function callMl(path, body) {
  let res;
  try {
    res = await fetch(`${ML_URL}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw new ApiError(503, 'ML_UNAVAILABLE', 'The ML service is not reachable. Start it with: cd ml-service && uvicorn app.main:app --port 8000');
  }
  if (!res.ok) {
    throw new ApiError(502, 'ML_ERROR', `The ML service returned an error (${res.status})`, await res.json().catch(() => undefined));
  }
  return res.json();
}

module.exports = { callMl, ML_URL };
