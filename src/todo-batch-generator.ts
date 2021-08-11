import { isExpired } from './date-utils';
import { todoDirFor, todoFilePathFor } from './io';
import TodoMatcher from './todo-matcher';
import { TodoBatches, TodoDataV2, TodoFileHash, TodoFilePathHash, WriteTodoOptions } from './types';

/**
 * Creates todo batches based on lint results.
 */
export default class TodoBatchGenerator {
  /**
   * Create a TodoBatchGenerator
   *
   * @param options - An object containing write options.
   */
  constructor(private options?: Partial<WriteTodoOptions>) {}

  /**
   * Matches todos to their associated {@link https://github.com/ember-template-lint/ember-template-lint-todo-utils/blob/master/src/types/todo.ts#L61|TodoDataV2} object.
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
   * @param maybeTodos - The linting data, converted to TodoDataV2 format.
   * @param existingTodos - Existing todo lint data.
   * @returns
   */
  generate(
    maybeTodos: Set<TodoDataV2>,
    existingTodos: Map<TodoFilePathHash, TodoMatcher>
  ): TodoBatches {
    const add = new Map<TodoFileHash, TodoDataV2>();
    const expired = new Map<TodoFileHash, TodoDataV2>();
    const stable = new Map<TodoFileHash, TodoDataV2>();
    let remove = new Map<TodoFileHash, TodoDataV2>();

    maybeTodos = new Set(maybeTodos);

    for (const unmatchedTodoData of maybeTodos) {
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

          maybeTodos.delete(unmatchedTodoData);
        }
      }
    }

    for (const unmatchedTodoData of maybeTodos) {
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

      maybeTodos.delete(unmatchedTodoData);
    }

    for (const matcher of [...existingTodos.values()]) {
      remove = new Map([...remove, ...matcher.unmatched(this.options?.shouldRemove)]);
    }

    return {
      add,
      expired,
      stable,
      remove,
    };
  }
}
