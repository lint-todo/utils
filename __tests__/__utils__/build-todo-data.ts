import { buildTodoDatum } from '../../src/builders';
import { todoDirFor } from '../../src/io';
import TodoMatcher from '../../src/todo-matcher';
import { LintMessage, LintResult, TodoConfig, TodoFilePathHash } from '../../src/types';

export function buildTodoDataForTesting(
  baseDir: string,
  lintResults: LintResult[],
  todoConfig?: TodoConfig
): Map<TodoFilePathHash, TodoMatcher> {
  const results = lintResults.filter((result) => result.messages.length > 0);

  const todoData = results.reduce((converted, lintResult) => {
    lintResult.messages.forEach((message: LintMessage) => {
      if (message.severity === 2) {
        const todoDatum = buildTodoDatum(baseDir, lintResult, message, todoConfig);
        const todoFilePathHash = todoDirFor(todoDatum.filePath);

        if (!converted.has(todoFilePathHash)) {
          converted.set(todoFilePathHash, new TodoMatcher());
        }

        const matcher = converted.get(todoFilePathHash);

        matcher?.add(todoDatum);
      }
    });

    return converted;
  }, new Map<TodoFilePathHash, TodoMatcher>());

  return todoData;
}
