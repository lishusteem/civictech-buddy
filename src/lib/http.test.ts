import { describe, expect, it } from 'vitest';
import { clientIp } from './http';

const req = (xff?: string) => new Request('http://x/', { headers: xff ? { 'x-forwarded-for': xff } : {} });

describe('clientIp', () => {
  it('returns the first forwarded IPv4 address as is', () => {
    expect(clientIp(req('203.0.113.7, 10.0.0.1'))).toBe('203.0.113.7');
  });

  it('returns unknown without the header', () => {
    expect(clientIp(req())).toBe('unknown');
  });

  it('buckets IPv6 addresses by their /64 prefix', () => {
    const a = clientIp(req('2001:db8:1:2:aaaa::1'));
    const b = clientIp(req('2001:0DB8:0001:0002:bbbb:cccc:dddd:eeee'));
    expect(a).toBe('2001:db8:1:2::/64');
    expect(b).toBe(a);
    expect(clientIp(req('2001:db8::1'))).toBe('2001:db8:0:0::/64');
    expect(clientIp(req('fe80::1%eth0'))).toBe('fe80:0:0:0::/64');
  });

  it('reads IPv4-mapped IPv6 addresses as IPv4', () => {
    expect(clientIp(req('::ffff:192.0.2.1'))).toBe('192.0.2.1');
  });
});
