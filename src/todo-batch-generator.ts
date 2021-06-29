import { buildTodoData } from './builders';
import { isExpired } from './date-utils';
import { todoDirFor, todoFilePathFor } from './io';
import TodoMatcher from './todo-matcher';
import {
  LintResult,
  TodoBatches,
  TodoData,
  TodoFileHash,
  TodoFilePathHash,
  WriteTodoOptions,
} from './types';

/**
 * Creates todo batches based on lint results.
 */
export default class TodoBatchGenerator {
  /**
   * Create a TodoBatchGenerator
   *
   * @param baseDir - The base directory that contains the .lint-todo storage directory.
   * @param options - An object containing write options.
   */
  constructor(private baseDir: string, private options?: Partial<WriteTodoOptions>) {}

  /**
   * Matches todos to their associated {@link https://github.com/ember-template-lint/ember-template-lint-todo-utils/blob/master/src/types/index.ts#L36|TodoData} object.
   *
   * The matching algorithm uses the following logic:
   *
   * For each unmatched lint result
   *   Find associated TodoMatcher by filePath
   *   Try to exact match against any of the TodoMatcher's Todos
   *
   *   if is exact match
   *     if expired && shouldRemove then add to "expired"
   *     else then add to "stable"
   *     remove from unmatched for either case above
   *
   * For each remaining unmatched lint result
   *   Find associated TodoMatcher by filePath
   *   Try to fuzzy match against any of the TodoMatcher's Todos
   *
   *   if is fuzzy match
   *     if expired && shouldRemove then add to "expired"
   *     else then add to "stable"
   *     remove from unmatched for either case above
   *   else
   *     then add to "add"
   *
   * For each remaining existing todos
   *   if shouldRemove then add to "remove
   *
   * Exact matches match on engine, ruleID, line and column
   * Fuzzy matches match on engine, ruleID and source
   *
   * @param lintResults - The raw linting data.
   * @param existingTodos - Existing todo lint data.
   * @returns
   */
  generate(
    lintResults: LintResult[],
    existingTodos: Map<TodoFilePathHash, TodoMatcher>
  ): TodoBatches {
    const add = new Map<TodoFileHash, TodoData>();
    const expired = new Map<TodoFileHash, TodoData>();
    const stable = new Map<TodoFileHash, TodoData>();
    let remove = new Set<TodoFileHash>();

    const unmatched = buildTodoData(this.baseDir, lintResults, this.options?.todoConfig);

    for (const unmatchedTodoData of unmatched) {
      const todoFilePathHash = todoDirFor(unmatchedTodoData.filePath);
      const matcher = existingTodos.get(todoFilePathHash);

      if (matcher) {
        const todoDatum = matcher.exactMatch(unmatchedTodoData);

        if (todoDatum) {
          const todoFilePath = todoFilePathFor(todoDatum);
          if (isExpired(todoDatum.errorDate) && this.options?.shouldRemove?.(todoDatum)) {
            expired.set(todoFilePath, todoDatum);
          } else {
            stable.set(todoFilePath, todoDatum);
          }

          unmatched.delete(unmatchedTodoData);
        }
      }
    }

    for (const unmatchedTodoData of unmatched) {
      const todoFilePathHash = todoDirFor(unmatchedTodoData.filePath);
      const matcher = existingTodos.get(todoFilePathHash);

      if (matcher) {
        const todoDatum = matcher.fuzzyMatch(unmatchedTodoData);

        if (todoDatum) {
          const todoFilePath = todoFilePathFor(todoDatum);

          if (isExpired(todoDatum.errorDate) && this.options?.shouldRemove?.(todoDatum)) {
            expired.set(todoFilePath, todoDatum);
          } else {
            stable.set(todoFilePath, todoDatum);
          }
        } else {
          add.set(todoFilePathFor(unmatchedTodoData), unmatchedTodoData);
        }
      } else {
        add.set(todoFilePathFor(unmatchedTodoData), unmatchedTodoData);
      }

      unmatched.delete(unmatchedTodoData);
    }

    for (const matcher of [...existingTodos.values()]) {
      remove = new Set([...remove, ...matcher.unmatched(this.options?.shouldRemove)]);
    }

    return {
      add,
      expired,
      stable,
      remove,
    };
  }
}
