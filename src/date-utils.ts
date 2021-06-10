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
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0));
}

/**
 * Returns the difference in days between two dates.
 *
 * @param startDate - The start date
 * @param endDate - The end date
 * @returns a number representing the days between the dates
 */
export function differenceInDays(startDate: Date, endDate: Date): number {
  const millisecondsPerDay = 86400000;

  return Math.round(
    (getDatePart(endDate).getTime() - getDatePart(startDate).getTime()) / millisecondsPerDay
  );
}

/**
 * Formats the date in short form, eg. 2021-01-01
 *
 * @param date - The date to format
 * @returns A string representing the formatted date
 */
export function format(date: string | number | Date): string {
  if (!(date instanceof Date)) {
    date = new Date(date);
  }

  return getDatePart(date).toISOString().split('T')[0];
}
