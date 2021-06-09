/**
 * Evaluates whether a date is expired (earlier than today)
 *
 * @param date - The date to evaluate
 * @param today - A number representing a date (UNIX Epoch - milliseconds)
 * @returns true if the date is earlier than today, otherwise false
 */
export function isExpired(
  date: number | undefined,
  today: number = getDatePart().getTime()
): boolean {
  return date !== undefined && today > date;
}

/**
 * Converts a date to include year, month, and day values only (time is zeroed out).
 *
 * @param date - The date to convert
 * @returns Date - A date with the time zeroed out eg. '2021-01-01T08:00:00.000Z'
 */
export function getDatePart(date: Date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0,0,0));
}
