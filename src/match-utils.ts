import { TodoData, FilePath } from './types';

/**
 * Checks to see if a todo might be a fuzzy match.
 * @param testTodo - The todo data from the lint results.
 * @param refTodo - The existing todo data to check against.
 * @returns true or false - true if filePath, ruleId and source are a match. At least line or column should not match.
 */

export function isFuzzyMatch(testTodo: TodoData, refTodo: TodoData): boolean {
  if (
    testTodo.filePath === refTodo.filePath &&
    testTodo.ruleId === refTodo.ruleId &&
    testTodo.source === refTodo.source &&
    (testTodo.line !== refTodo.line || testTodo.column !== refTodo.column)
  ) {
      return true;
  } return false;
}

/**
 * Checks to see if a todo has a fuzzy match within a reference Map
 * @param testTodo - The todo data needle to look for
 * @param refTodoMap - The reference Map whose values are the todo haystack to look in
 * @returns boolean - the testTodo fuzzy matches against at least one todo in the reference Map
 * Note: a fuzzy match is false for an exact match
 */
export function hasFuzzyMatch(testTodo: TodoData, refTodoMap: Map<FilePath, TodoData>): boolean {
  return [...refTodoMap.values()].some(refTodoDatum => isFuzzyMatch(testTodo, refTodoDatum));
}