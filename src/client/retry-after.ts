export function retryAfterMessage(headers: ReadonlyMap<string, string>): string {
  const raw = headers.get('retry-after');
  const seconds = raw === undefined ? Number.NaN : Number(raw);
  if (Number.isFinite(seconds) && seconds > 0) {
    return `Plane rate limit reached. Try again in ${Math.trunc(seconds)} seconds.`;
  }
  return 'Plane rate limit reached. Try again in a minute.';
}
