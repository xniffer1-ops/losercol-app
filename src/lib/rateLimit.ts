const mapa = new Map<string, { count: number; time: number }>();

export function rateLimit(key: string, limit = 5, windowMs = 60000) {
  const now = Date.now();
  const data = mapa.get(key);

  if (!data) {
    mapa.set(key, { count: 1, time: now });
    return { ok: true };
  }

  if (now - data.time > windowMs) {
    mapa.set(key, { count: 1, time: now });
    return { ok: true };
  }

  if (data.count >= limit) {
    return { ok: false };
  }

  data.count++;
  return { ok: true };
}