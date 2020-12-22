import { isAbsolute, relative } from 'path';
import slash = require('slash');
import { todoFilePathFor } from './io';
import { DaysToDecay, FilePath, LintMessage, LintResult, TodoData } from './types';

/**
 * Adapts a list of {@link LintResult} to a map of {@link FilePath}, {@link TodoData}.
 *
 * @param baseDir - The base directory that contains the .lint-todo storage directory.
 * @param lintResults - A list of {@link LintResult} objects to convert to {@link TodoData} objects.
 * @param daysToDecay - An object containing the warn or error days, in integers.
 * @returns - A Promise resolving to a {@link Map} of {@link FilePath}/{@link TodoData}.
 */
export function buildTodoData(baseDir: string, lintResults: LintResult[], daysToDecay?: DaysToDecay): Map<FilePath, TodoData> {
  const results = lintResults.filter((result) => result.messages.length > 0);

  const todoData = results.reduce((converted, lintResult) => {
    lintResult.messages.forEach((message: LintMessage) => {
      if (message.severity === 2) {
        const todoDatum = _buildTodoDatum(baseDir, lintResult, message, daysToDecay);

        converted.set(todoFilePathFor(todoDatum), todoDatum);
      }
    });

    return converted;
  }, new Map<FilePath, TodoData>());

  return todoData;
}

/**
 * Adapts an {@link LintResult} to a {@link TodoData}. FilePaths are absolute
 * when received from a lint result, so they're converted to relative paths for stability in
 * serializing the contents to disc.
 *
 * @param lintResult - The lint result object.
 * @param lintMessage - A lint message object representing a specific violation for a file.
 * @param daysToDecay - An object containing the warn or error days, in integers.
 * @returns - A {@link TodoData} object.
 */
export function _buildTodoDatum(
  baseDir: string,
  lintResult: LintResult,
  lintMessage: LintMessage,
  daysToDecay?: DaysToDecay
): TodoData {
  // Note: If https://github.com/nodejs/node/issues/13683 is fixed, remove slash() and use posix.relative
  // provided that the fix is landed on the supported node versions of this lib
  const filePath = isAbsolute(lintResult.filePath) ? relative(baseDir, lintResult.filePath) : lintResult.filePath;
  const todoDatum: TodoData = {
    engine: getEngine(lintResult),
    filePath: slash(filePath),
    ruleId: getRuleId(lintMessage),
    line: lintMessage.line,
    column: lintMessage.column,
    createdDate: new Date(),
  };

  if (daysToDecay?.warn) {
    todoDatum.warnDate = addDays(todoDatum.createdDate, daysToDecay.warn);
  }

  if (daysToDecay?.error) {
    todoDatum.errorDate = addDays(todoDatum.createdDate, daysToDecay.error);
  }

  return todoDatum;
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

function addDays(createdDate: Date, days: number): Date {
  const datePlusDays = new Date(createdDate.valueOf());

  datePlusDays.setDate(datePlusDays.getDate() + days);

  return datePlusDays;
}
