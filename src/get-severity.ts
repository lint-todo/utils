import { isExpired, getDatePart } from './date-utils';
import { Severity, TodoDataV1 } from './types';

/**
 * Returns the correct severity level based on the todo data's decay dates.
 *
 * @param todo - The todo data.
 * @param today - A number representing a date (UNIX Epoch - milliseconds)
 * @returns Severity - the lint severity based on the evaluation of the decay dates.
 */
export function getSeverity(todo: TodoDataV1, today: number = getDatePart().getTime()): Severity {
  if (isExpired(todo.errorDate, today)) {
    return Severity.error;
  } else if (isExpired(todo.warnDate)) {
    return Severity.warn;
  }

  return Severity.todo;
}
