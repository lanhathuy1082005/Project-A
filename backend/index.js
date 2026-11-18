import 'dotenv/config';
import https      from 'https';
import http       from 'http';
import fs         from 'fs';

import app, { allowedOrigins } from './app.js';

const PORT = process.env.PORT || 3000;

// ─── Server: HTTPS if cert exists, HTTP fallback ──────────────────────────────────
const keyPath  = process.env.SSL_KEY_PATH;
const certPath = process.env.SSL_CERT_PATH;

const useHttps = keyPath && certPath && fs.existsSync(keyPath) && fs.existsSync(certPath);

if (useHttps) {
  const sslOptions = {
    key:  fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  };
  https.createServer(sslOptions, app).listen(PORT, '0.0.0.0', () => {
    console.log(`  HTTPS server running on port ${PORT}`);
    console.log(`    Allowed origins: ${allowedOrigins.join(', ')}`);
  });
} else {
  http.createServer(app).listen(PORT, '0.0.0.0', () => {
    console.log(`  HTTP server running on port ${PORT}`);
    console.log(`    Tip: add SSL_KEY_PATH / SSL_CERT_PATH to .env for HTTPS`);
    console.log(`    Allowed origins: ${allowedOrigins.join(', ')}`);
  });
}
