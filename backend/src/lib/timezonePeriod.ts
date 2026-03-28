/** UTC offset in ms for timezone at a given instant (used for billing period boundaries). */
export function getTzOffsetMs(tz: string, date: Date): number {
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone: tz }));
  return tzDate.getTime() - utcDate.getTime();
}

/**
 * Current billing period boundaries in UTC, adjusted for the user's timezone.
 */
export function getCurrentPeriod(tz: string, periodStart: number): { dateFrom: Date; dateTo: Date } {
  const now = new Date();
  const offsetMs = getTzOffsetMs(tz, now);

  const localNow = new Date(now.getTime() + offsetMs);
  const year = localNow.getUTCFullYear();
  const month = localNow.getUTCMonth();
  const day = localNow.getUTCDate();

  let dateFrom: Date;
  let dateTo: Date;

  if (day >= periodStart) {
    dateFrom = new Date(Date.UTC(year, month, periodStart) - offsetMs);
    dateTo = new Date(Date.UTC(year, month + 1, periodStart) - offsetMs);
  } else {
    dateFrom = new Date(Date.UTC(year, month - 1, periodStart) - offsetMs);
    dateTo = new Date(Date.UTC(year, month, periodStart) - offsetMs);
  }

  return { dateFrom, dateTo };
}
