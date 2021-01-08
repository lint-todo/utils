import { Severity, TodoData } from './types';

/**
 * Returns the correct severity level based on the todo data's decay dates.
 *
 * @param todo - The todo data.
 * @param today - A number representing a date (UNIX Epoch - milliseconds)
 * @returns Severity - the lint severity based on the evaluation of the decay dates.
 */
export function getSeverity(todo: TodoData, today: number = getDatePart().getTime()): Severity {
  if (todo.errorDate && today > todo.errorDate) {
    return Severity.error;
  } else if (todo.warnDate && today > todo.warnDate) {
    return Severity.warn;
  }

  return Severity.todo;
}

/**
 * Converts a date to include year, month, and day values only (time is zeroed out).
 *
 * @param date - The date to convert
 * @returns Date - A date with the time zeroed out eg. '2021-01-01T08:00:00.000Z'
 */
export function getDatePart(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
}
