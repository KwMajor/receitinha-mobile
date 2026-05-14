const https = require('https');
const jwt = require('jsonwebtoken');

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const CERTS_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

let cachedKeys = null;
let cacheExpiresAt = 0;

function fetchPublicKeys() {
  return new Promise((resolve, reject) => {
    https.get(CERTS_URL, (res) => {
      // Firebase informa o TTL pelo header Cache-Control
      const cc = res.headers['cache-control'] ?? '';
      const maxAgeMatch = cc.match(/max-age=(\d+)/);
      const ttl = maxAgeMatch ? parseInt(maxAgeMatch[1], 10) * 1000 : 3_600_000;
      cacheExpiresAt = Date.now() + ttl;

      let raw = '';
      res.on('data', (chunk) => (raw += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(raw));
        } catch (e) {
          reject(e);
        }
      });
      res.on('error', reject);
    });
  });
}

async function getPublicKeys() {
  if (!cachedKeys || Date.now() >= cacheExpiresAt) {
    cachedKeys = await fetchPublicKeys();
  }
  return cachedKeys;
}

async function verifyToken(token) {
  const keys = await getPublicKeys();
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded) throw new Error('Token malformado.');

  const cert = keys[decoded.header.kid];
  if (!cert) throw new Error('Chave pública não encontrada.');

  return jwt.verify(token, cert, {
    algorithms: ['RS256'],
    audience: PROJECT_ID,
    issuer: `https://securetoken.google.com/${PROJECT_ID}`,
  });
}

async function authMiddleware(req, res, next) {
  const header = req.headers.authorization ?? '';
  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token ausente.' });
  }

  try {
    const payload = await verifyToken(header.slice(7));
    req.user = {
      uid: payload.sub,
      name: payload.name || payload.email || 'Anônimo',
    };
    next();
  } catch {
    return res.status(401).json({ message: 'Token inválido ou expirado.' });
  }
}

module.exports = authMiddleware;
