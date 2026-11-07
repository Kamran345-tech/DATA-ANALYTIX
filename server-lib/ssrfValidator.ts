import { promises as dnsPromises } from 'node:dns';

export interface SsrfValidationResult {
  valid: boolean;
  error?: string;
  ip?: string;
}

/**
 * Standard SSRF Validator (Classic behavior)
 * Synchronous regex and hostname check for private ranges
 */
export function validateExternalUrl(rawUrl: string): { valid: boolean; error?: string } {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { valid: false, error: 'Only HTTP and HTTPS protocols are permitted.' };
    }

    const hostname = parsed.hostname.toLowerCase();

    // Block loopback and local domain names
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname === '::1' ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal') ||
      hostname === 'metadata.google.internal' ||
      hostname === '169.254.169.254'
    ) {
      return { valid: false, error: 'Access to loopback, internal hosts, and cloud metadata is prohibited.' };
    }

    // Block private IPv4 ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8, 169.254.0.0/16)
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const ipMatch = hostname.match(ipv4Regex);
    if (ipMatch) {
      const p1 = parseInt(ipMatch[1], 10);
      const p2 = parseInt(ipMatch[2], 10);

      if (p1 === 10) return { valid: false, error: 'Access to private 10.x.x.x addresses is prohibited.' };
      if (p1 === 127) return { valid: false, error: 'Access to loopback 127.x.x.x addresses is prohibited.' };
      if (p1 === 169 && p2 === 254) return { valid: false, error: 'Access to link-local 169.254.x.x addresses is prohibited.' };
      if (p1 === 192 && p2 === 168) return { valid: false, error: 'Access to private 192.168.x.x addresses is prohibited.' };
      if (p1 === 172 && p2 >= 16 && p2 <= 31) return { valid: false, error: 'Access to private 172.16-31.x.x addresses is prohibited.' };
    }

    return { valid: true };
  } catch (err: any) {
    return { valid: false, error: `Invalid URL format: ${err?.message || 'Malformed URL'}` };
  }
}

/**
 * Hardened SSRF Validator with asynchronous DNS resolution checks
 * Prevents DNS rebinding and internal network traversal
 */
export async function validateExternalUrlHardened(rawUrl: string): Promise<SsrfValidationResult> {
  const basic = validateExternalUrl(rawUrl);
  if (!basic.valid) {
    return basic;
  }

  try {
    const parsed = new URL(rawUrl);
    const hostname = parsed.hostname;

    // Check port: allow standard HTTP(S) and approved data ports (80, 443, 8080, 8443, 3000, 5000)
    if (parsed.port) {
      const portNum = parseInt(parsed.port, 10);
      const allowedPorts = [80, 443, 8080, 8443, 3000, 5000, 9000];
      if (!allowedPorts.includes(portNum)) {
        return { valid: false, error: `Port ${portNum} is not permitted for remote live connections.` };
      }
    }

    // Resolve DNS to verify the target does not resolve to private addresses
    let addresses: string[] = [];
    try {
      const resolved = await dnsPromises.lookup(hostname, { all: true });
      addresses = resolved.map(r => r.address);
    } catch {
      // If DNS resolution fails, reject to prevent blind SSRF
      return { valid: false, error: `Could not resolve hostname "${hostname}".` };
    }

    for (const address of addresses) {
      if (isPrivateIp(address)) {
        return { valid: false, error: `Hostname "${hostname}" resolves to private address ${address}.`, ip: address };
      }
    }

    return { valid: true, ip: addresses[0] };
  } catch (err: any) {
    return { valid: false, error: `Hardened SSRF verification failed: ${err.message}` };
  }
}

/**
 * Evaluates whether an IPv4 or IPv6 string is private/internal
 */
export function isPrivateIp(ip: string): boolean {
  if (ip === '127.0.0.1' || ip === '::1' || ip === '0.0.0.0' || ip === '::') {
    return true;
  }

  // IPv4 checks
  const ipv4Match = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const p1 = parseInt(ipv4Match[1], 10);
    const p2 = parseInt(ipv4Match[2], 10);

    // 10.0.0.0/8
    if (p1 === 10) return true;
    // 127.0.0.0/8
    if (p1 === 127) return true;
    // 169.254.0.0/16 (Link Local / Cloud Metadata)
    if (p1 === 169 && p2 === 254) return true;
    // 172.16.0.0/12
    if (p1 === 172 && p2 >= 16 && p2 <= 31) return true;
    // 192.168.0.0/16
    if (p1 === 192 && p2 === 168) return true;
    // 100.64.0.0/10 (Carrier-grade NAT)
    if (p1 === 100 && p2 >= 64 && p2 <= 127) return true;
    // 0.0.0.0/8
    if (p1 === 0) return true;
  }

  // IPv6 checks
  const lowerIp = ip.toLowerCase();
  if (
    lowerIp.startsWith('fc') || // Unique local
    lowerIp.startsWith('fd') ||
    lowerIp.startsWith('fe80') || // Link local
    lowerIp.startsWith('::ffff:127.') || // IPv4 mapped loopback
    lowerIp.startsWith('::ffff:10.') ||
    lowerIp.startsWith('::ffff:192.168.') ||
    lowerIp.startsWith('::ffff:172.')
  ) {
    return true;
  }

  return false;
}

/**
 * Safe fetch with manual redirect checking (max 3 hops) and response size limit (5MB)
 */
export async function safeFetch(
  targetUrl: string,
  options: {
    headers?: Record<string, string>;
    signal?: AbortSignal;
    maxRedirects?: number;
    maxBytes?: number;
  } = {}
): Promise<{ ok: boolean; status: number; statusText: string; json: () => Promise<any>; text: () => Promise<string> }> {
  const maxRedirects = options.maxRedirects ?? 3;
  const maxBytes = options.maxBytes ?? 5 * 1024 * 1024; // 5MB cap
  let currentUrl = targetUrl;
  let redirectsCount = 0;

  // Sanitized headers allowlist
  const allowedHeaderKeys = ['accept', 'content-type', 'authorization', 'user-agent', 'x-request-id'];
  const sanitizedHeaders: Record<string, string> = {};
  if (options.headers) {
    for (const [k, v] of Object.entries(options.headers)) {
      if (allowedHeaderKeys.includes(k.toLowerCase())) {
        sanitizedHeaders[k] = v;
      }
    }
  }

  while (redirectsCount <= maxRedirects) {
    // Validate each hop
    const check = await validateExternalUrlHardened(currentUrl);
    if (!check.valid) {
      throw new Error(`SSRF security check failed for URL: ${check.error}`);
    }

    const response = await fetch(currentUrl, {
      method: 'GET',
      headers: sanitizedHeaders,
      redirect: 'manual', // Enforce manual inspection of redirect destinations
      signal: options.signal || AbortSignal.timeout(8000),
    });

    // Check for redirect status codes (301, 302, 303, 307, 308)
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      redirectsCount++;
      if (redirectsCount > maxRedirects) {
        throw new Error(`Exceeded maximum allowed redirects (${maxRedirects}).`);
      }
      const location = response.headers.get('location');
      if (!location) {
        throw new Error('Redirect response missing Location header.');
      }
      currentUrl = new URL(location, currentUrl).toString();
      continue;
    }

    // Check response size via Content-Length if present
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > maxBytes) {
      throw new Error(`Response payload size (${contentLength} bytes) exceeds the ${maxBytes} byte safety limit.`);
    }

    // Wrap body readers with size verification
    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      text: async () => {
        const text = await response.text();
        if (text.length > maxBytes) {
          throw new Error(`Response body exceeds maximum permitted size of ${maxBytes} bytes.`);
        }
        return text;
      },
      json: async () => {
        const text = await response.text();
        if (text.length > maxBytes) {
          throw new Error(`Response body exceeds maximum permitted size of ${maxBytes} bytes.`);
        }
        return JSON.parse(text);
      }
    };
  }

  throw new Error('Too many redirects');
}
