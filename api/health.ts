import { handleHealth } from '../server-lib/handlers.js';
import { SECURITY_HEADERS } from '../server-lib/securityHeaders.js';

export default function handler(_req: any, res: any) {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    res.setHeader(k, v);
  }
  res.status(200).json(handleHealth());
}
