import ipaddr from 'ipaddr.js';

/** Сети и хосты из документации YooKassa (уведомления) */
const CIDRS = [
  '185.71.77.0/27',
  '185.71.76.0/27',
  '77.75.154.128/25',
  '77.75.153.0/25',
  '2a02:5180::/32',
] as const;

const EXACT_IPV4 = new Set(['77.75.156.35', '77.75.156.11']);

export function isYooKassaNotificationIp(rawIp: string | undefined): boolean {
  if (!rawIp) return false;
  const ip = rawIp.replace(/^::ffff:/i, '');
  if (EXACT_IPV4.has(ip)) return true;
  try {
    const addr = ipaddr.parse(ip);
    for (const c of CIDRS) {
      const cidr = ipaddr.parseCIDR(c);
      if (addr.kind() !== cidr[0].kind()) continue;
      // ipaddr union overloads: match([range, bits]) when kinds match
      if ((addr as { match(mask: [typeof cidr[0], number]): boolean }).match(cidr)) return true;
    }
  } catch {
    return false;
  }
  return false;
}
