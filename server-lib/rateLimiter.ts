/**
 * Rate limiter with sliding window and automatic pruning of expired entries
 */
interface RateRecord {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateRecord>();

// Prune expired entries every 60 seconds to prevent memory leaks
let pruneInterval: NodeJS.Timeout | null = null;
function ensurePruneInterval() {
  if (!pruneInterval && typeof setInterval !== 'undefined') {
    pruneInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, record] of rateLimitMap.entries()) {
        if (now > record.resetTime) {
          rateLimitMap.delete(key);
        }
      }
    }, 60000);
    // Don't keep Node process alive just for the cleanup timer
    if (pruneInterval.unref) {
      pruneInterval.unref();
    }
  }
}

export function checkRateLimit(
  ip: string,
  limit: number = 30,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetTime: number } {
  ensurePruneInterval();
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    const resetTime = now + windowMs;
    rateLimitMap.set(ip, { count: 1, resetTime });
    return { allowed: true, remaining: limit - 1, resetTime };
  }

  if (record.count >= limit) {
    return { allowed: false, remaining: 0, resetTime: record.resetTime };
  }

  record.count++;
  return { allowed: true, remaining: limit - record.count, resetTime: record.resetTime };
}

// Daily quota tracker for unauthenticated AI requests when REQUIRE_AUTH_FOR_AI=true
const guestDailyAiMap = new Map<string, { count: number; dateStr: string }>();

export function checkGuestAiQuota(ip: string, dailyLimit: number = 5): boolean {
  const today = new Date().toISOString().split('T')[0];
  const record = guestDailyAiMap.get(ip);
  if (!record || record.dateStr !== today) {
    guestDailyAiMap.set(ip, { count: 1, dateStr: today });
    return true;
  }
  if (record.count >= dailyLimit) {
    return false;
  }
  record.count++;
  return true;
}
