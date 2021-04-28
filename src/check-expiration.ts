import { ExpirationCheck, TodoData } from './types';
import { getDatePart } from './get-severity';

/**
 * If the todo errorDate is before today, mark it as expired.
 *
 * @param todo - The todo data.
 * @param today - A number representing a date (UNIX Epoch - milliseconds)
 * @returns expired - A boolean that represents if the todo has expired or not.
 */
 export function checkExpiration(todo: TodoData, expired: ExpirationCheck): boolean {
  const today = getDatePart().getTime();

  if (todo.errorDate && today > todo.errorDate) {
    return expired.isExpired = true;
  }
  return expired.isExpired = false;
}

