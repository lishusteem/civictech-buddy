export function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

/** The /64 prefix of an IPv6 address (one subscriber usually holds a whole /64), or null if it does not parse. */
function ipv6Prefix64(ip: string): string | null {
  const addr = ip.split('%')[0].toLowerCase();
  const halves = addr.split('::');
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(':') : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  const missing = 8 - head.length - tail.length;
  if (halves.length === 1 ? missing !== 0 : missing < 1) return null;
  const groups = [...head, ...Array<string>(halves.length === 2 ? missing : 0).fill('0'), ...tail];
  if (!groups.every((g) => /^[0-9a-f]{1,4}$/.test(g))) return null;
  return `${groups.slice(0, 4).map((g) => parseInt(g, 16).toString(16)).join(':')}::/64`;
}

/** The client address used for rate limits: IPv4 as is, IPv6 bucketed by /64. */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const first = forwarded?.split(',')[0]?.trim();
  if (!first) return 'unknown';
  if (!first.includes(':')) return first;
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(first);
  if (mapped) return mapped[1];
  return ipv6Prefix64(first) ?? first.toLowerCase();
}

export const INVALID_LINK = 'Linkul nu mai e valid.';
