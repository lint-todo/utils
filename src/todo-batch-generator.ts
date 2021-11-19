import { isExpired } from './date-utils';
import TodoMatcher from './todo-matcher';
import { TodoBatches, TodoData, FilePath, WriteTodoOptions } from './types';

function copyLintResult(todoDatum: TodoData, unmatchedTodoData: TodoData) {
  // this is a key transfer of information that allows us to match the identify
  // of the original lint result to the todo data. This is important as it allows
  // us to subsequently modify the severity of the original lint result. This is
  // only required for todo data that is generated for the stable batch, as those
  // are the only ones that are use to match back to the original lint result.
  todoDatum.originalLintResult = unmatchedTodoData.originalLintResult;
}

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
   * Matches todos to their associated {@link https://github.com/ember-template-lint/ember-template-lint-todo-utils/blob/master/src/types/todo.ts#L61|TodoData} object.
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
   * @param maybeTodos - The linting data, converted to TodoData format.
   * @param existingTodos - Existing todo lint data.
   * @returns
   */
  generate(maybeTodos: Set<TodoData>, existingTodos: Map<FilePath, TodoMatcher>): TodoBatches {
    const add = new Set<TodoData>();
    const expired = new Set<TodoData>();
    const stable = new Set<TodoData>();
    let remove = new Set<TodoData>();

    maybeTodos = new Set(maybeTodos);

    for (const unmatchedTodoData of maybeTodos) {
      const matcher = existingTodos.get(unmatchedTodoData.filePath);

      if (matcher) {
        const todoDatum = matcher.exactMatch(unmatchedTodoData);

        if (todoDatum) {
          if (isExpired(todoDatum.errorDate) && this.options?.shouldRemove?.(todoDatum)) {
            expired.add(todoDatum);
          } else {
            copyLintResult(todoDatum, unmatchedTodoData);
            stable.add(todoDatum);
          }

          maybeTodos.delete(unmatchedTodoData);
        }
      }
    }

    for (const unmatchedTodoData of maybeTodos) {
      const matcher = existingTodos.get(unmatchedTodoData.filePath);

      if (matcher) {
        const todoDatum = matcher.fuzzyMatch(unmatchedTodoData);

        if (todoDatum) {
          if (isExpired(todoDatum.errorDate) && this.options?.shouldRemove?.(todoDatum)) {
            expired.add(todoDatum);
          } else {
            copyLintResult(todoDatum, unmatchedTodoData);
            stable.add(todoDatum);
          }
        } else {
          add.add(unmatchedTodoData);
        }
      } else {
        add.add(unmatchedTodoData);
      }

      maybeTodos.delete(unmatchedTodoData);
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
