import { describe, it, expect } from 'vitest';
import { validateExternalUrl, isPrivateIp } from '../server-lib/ssrfValidator';

describe('SSRF Protection Validator', () => {
  it('allows valid public HTTPS and HTTP URLs', () => {
    expect(validateExternalUrl('https://api.github.com/users').valid).toBe(true);
    expect(validateExternalUrl('https://api.stripe.com/v1/charges').valid).toBe(true);
    expect(validateExternalUrl('http://example.com/data.json').valid).toBe(true);
  });

  it('blocks dangerous loopback addresses', () => {
    expect(validateExternalUrl('http://127.0.0.1:8080').valid).toBe(false);
    expect(validateExternalUrl('http://localhost:3000').valid).toBe(false);
    expect(validateExternalUrl('http://0.0.0.0').valid).toBe(false);
  });

  it('blocks cloud metadata endpoints', () => {
    expect(validateExternalUrl('http://169.254.169.254/latest/meta-data/').valid).toBe(false);
    expect(validateExternalUrl('http://metadata.google.internal/computeMetadata/v1/').valid).toBe(false);
  });

  it('blocks private RFC 1918 subnets', () => {
    expect(validateExternalUrl('http://10.0.0.1/admin').valid).toBe(false);
    expect(validateExternalUrl('http://192.168.1.1').valid).toBe(false);
    expect(validateExternalUrl('http://172.16.0.5').valid).toBe(false);
    expect(validateExternalUrl('http://172.31.255.255').valid).toBe(false);
  });

  it('correctly identifies private IP ranges with isPrivateIp', () => {
    expect(isPrivateIp('127.0.0.1')).toBe(true);
    expect(isPrivateIp('10.10.10.10')).toBe(true);
    expect(isPrivateIp('192.168.0.1')).toBe(true);
    expect(isPrivateIp('169.254.1.1')).toBe(true);
    expect(isPrivateIp('100.64.0.1')).toBe(true); // CGNAT
    expect(isPrivateIp('8.8.8.8')).toBe(false); // Google DNS
    expect(isPrivateIp('1.1.1.1')).toBe(false); // Cloudflare DNS
  });
});
