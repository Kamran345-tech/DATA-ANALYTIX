import { handleInterpret } from '../../server-lib/handlers.js';
import { SECURITY_HEADERS } from '../../server-lib/securityHeaders.js';

export default async function handler(req: any, res: any) {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    res.setHeader(k, v);
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const clientIp = (
    req.headers['x-forwarded-for'] ||
    req.socket?.remoteAddress ||
    'vercel-client'
  ).toString().split(',')[0].trim();

  const authHeader = req.headers['authorization'];
  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

  const result = await handleInterpret(body, clientIp, authHeader);
  return res.status(result.status).json(result.data);
}
