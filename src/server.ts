/**
 * Petit serveur pour exposer les certifications (et optionnellement lancer le job).
 * Le radar Netlify peut appeler GET /api/certifications?keys=AF718|CDG|DKR,... pour fusionner is_certified_amadeus.
 */

require('dotenv').config();
import http from 'http';
import { getCertifiedKeys } from './db/robinDb';
import { runCertification } from './services/monitoringService';

const PORT = Number(process.env.CERTIFICATION_PORT) || 3456;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://localhost:${PORT}`);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (url.pathname === '/api/certifications') {
    const keysParam = url.searchParams.get('keys') || '';
    const keys = keysParam ? keysParam.split(',').map((k) => k.trim()).filter(Boolean) : [];
    const map = getCertifiedKeys(keys);
    res.end(JSON.stringify(map));
    return;
  }

  if (url.pathname === '/api/run-certification' && req.method === 'POST') {
    try {
      const result = await runCertification();
      res.end(JSON.stringify({ ok: true, ...result }));
    } catch (e) {
      res.statusCode = 500;
      res.end(JSON.stringify({ ok: false, error: (e as Error).message }));
    }
    return;
  }

  res.statusCode = 404;
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`Certification API écoute sur http://localhost:${PORT} (GET /api/certifications?keys=...)`);
});
