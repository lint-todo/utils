import { relative } from 'path';
import { todoFilePathFor } from './io';
import { FilePath, LintMessage, LintResult, TodoData } from './types';

/**
 * Adapts a list of {@link https://github.com/DefinitelyTyped/DefinitelyTyped/blob/160f43ae6852c4eefec2641e54cff96dd7b63488/types/eslint/index.d.ts#L640 ESLint.LintResult}
 * or {@link TemplateLintResult} to a map of {@link FilePath}, {@link TodoData}.
 *
 * @param baseDir The base directory that contains the .lint-todo storage directory.
 * @param lintResults A list of {LintResult} objects to convert to {TodoData} objects.
 */
export function buildTodoData(baseDir: string, lintResults: LintResult[]): Map<FilePath, TodoData> {
  const results = lintResults.filter((result) => result.messages.length > 0);

  const todoData = results.reduce((converted, lintResult) => {
    lintResult.messages.forEach((message: LintMessage) => {
      if (message.severity === 2) {
        const todoDatum = _buildTodoDatum(baseDir, lintResult, message);

        converted.set(todoFilePathFor(todoDatum), todoDatum);
      }
    });

    return converted;
  }, new Map<FilePath, TodoData>());

  return todoData;
}

/**
 * Adapts an {ESLint.LintResult} or {TemplateLintResult} to a {TodoData}. FilePaths are absolute
 * when received from a lint result, so they're converted to relative paths for stability in
 * serializing the contents to disc.
 *
 * @param lintResult The lint result object, either an {ESLint.LintResult} or a {TemplateLintResult}.
 * @param lintMessage A lint message object representing a specific violation for a file.
 */
export function _buildTodoDatum(
  baseDir: string,
  lintResult: LintResult,
  lintMessage: LintMessage
): TodoData {
  return {
    engine: getEngine(lintResult),
    filePath: relative(baseDir, lintResult.filePath),
    ruleId: getRuleId(lintMessage),
    line: lintMessage.line,
    column: lintMessage.column,
    createdDate: Date.now(),
  };
}

function getEngine(result: LintResult) {
  return result.filePath.endsWith('.js') ? 'eslint' : 'ember-template-lint';
}

function getRuleId(message: any) {
  if (typeof message.ruleId !== 'undefined') {
    return message.ruleId;
  } else if (typeof message.rule !== 'undefined') {
    return message.rule;
  }
  return '';
}
