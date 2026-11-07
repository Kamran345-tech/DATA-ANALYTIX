import { handleTestConnection } from '../../server-lib/handlers.js';
import { SECURITY_HEADERS } from '../../server-lib/securityHeaders.js';

export default async function handler(req: any, res: any) {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    res.setHeader(k, v);
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const result = await handleTestConnection(body);
    return res.status(result.status).json(result.data);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Connection test failed' });
  }
}
