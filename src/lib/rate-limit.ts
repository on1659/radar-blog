/**
 * 인메모리 토큰버킷 rate limiter.
 *
 * 전제: Railway 단일 replica (현재 railway.toml 구성). 다중 replica로 확장하면
 * 인스턴스별 카운터가 되므로 Redis 등 공유 저장소로 교체해야 한다.
 * 재배포 시 카운터가 리셋되는 것은 수용한다 — GitHub 로그인 요구가 1차 방어선.
 */
interface Bucket {
  tokens: number;
  last: number;
}

const buckets = new Map<string, Bucket>();
const MAX_ENTRIES = 5000;

export const checkRateLimit = (
  key: string,
  opts: { capacity: number; refillPerMin: number }
): boolean => {
  const now = Date.now();

  if (buckets.size > MAX_ENTRIES) {
    const entries = [...buckets.entries()].sort((a, b) => a[1].last - b[1].last);
    for (let i = 0; i < entries.length / 2; i++) buckets.delete(entries[i][0]);
  }

  const bucket = buckets.get(key) ?? { tokens: opts.capacity, last: now };
  const refill = ((now - bucket.last) / 60000) * opts.refillPerMin;
  bucket.tokens = Math.min(opts.capacity, bucket.tokens + refill);
  bucket.last = now;

  if (bucket.tokens < 1) {
    buckets.set(key, bucket);
    return false;
  }
  bucket.tokens -= 1;
  buckets.set(key, bucket);
  return true;
};

export const BOARD_RATE_LIMITS = {
  image: { capacity: 10, refillPerMin: 10 / 60 }, // 10/시간
  post: { capacity: 5, refillPerMin: 0.5 }, // 5/10분
  comment: { capacity: 10, refillPerMin: 10 }, // 10/분
  reaction: { capacity: 30, refillPerMin: 30 }, // 30/분
} as const;
