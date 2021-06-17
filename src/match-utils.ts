import { TodoData } from './types';

/**
 * Checks to see if a todo might be a fuzzy match.
 * @param testTodo - The todo data from the lint results.
 * @param refTodo - The existing todo data to check against.
 * @returns true or false - true if filePath, ruleId and source are a match. At least line or column should not match.
 */

export function isFuzzyMatch(testTodo: TodoData, refTodo: TodoData): boolean {
  // if the filePath, ruleId and source match
  if (
    testTodo.filePath === refTodo.filePath &&
    testTodo.ruleId === refTodo.ruleId &&
    testTodo.source === refTodo.source &&
  // if the line or column (or both) have changed
    (testTodo.line !== refTodo.line || testTodo.column !== refTodo.column)
  ) {
      return true;
  } return false;
}
