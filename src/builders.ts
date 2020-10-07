import { generateFileName } from './io';
import { LintMessage, LintResult, TodoData } from './types';

/**
 * Adapts a list of {ESLint.LintResult} or {TemplateLintResult} to a map of fileHash, todoDatum.
 *
 * @param lintResults A list of {LintResult} objects to convert to {TodoData} objects.
 */
export function buildTodoData(lintResults: LintResult[]): Map<string, TodoData> {
  const results = lintResults.filter((result) => result.messages.length > 0);

  const todoData = results.reduce((converted, lintResult) => {
    lintResult.messages.forEach((message: LintMessage) => {
      if (message.severity === 2) {
        const todoDatum = _buildTodoDatum(lintResult, message);

        converted.set(generateFileName(todoDatum), todoDatum);
      }
    });

    return converted;
  }, new Map<string, TodoData>());

  return todoData;
}

/**
 * Adapts an {ESLint.LintResult} or {TemplateLintResult} to a {TodoData}
 *
 * @param lintResult The lint result object, either an {ESLint.LintResult} or a {TemplateLintResult}.
 * @param lintMessage A lint message object representing a specific violation for a file.
 */
export function _buildTodoDatum(lintResult: LintResult, lintMessage: LintMessage): TodoData {
  return {
    engine: getEngine(lintResult),
    filePath: lintResult.filePath,
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
