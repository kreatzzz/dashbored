export function boundedNumber(value: number, lower: number, upper: number) {
  return Number.isFinite(value) ? Math.min(upper, Math.max(lower, Math.floor(value))) : lower;
}

export function backoffDelayMs(failures: number, baseMs: number, maxMs: number, random = Math.random) {
  const exponential = Math.min(maxMs, Math.max(baseMs, baseMs * 2 ** Math.max(0, failures)));
  return Math.round(exponential * (0.9 + random() * 0.2));
}

export async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker() {
    for (;;) {
      const index = next++;
      if (index >= items.length) return;
      results[index] = await fn(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(Math.max(1, limit), items.length) }, worker));
  return results;
}
