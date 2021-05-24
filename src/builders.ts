import { isAbsolute, relative } from 'path';
import slash = require('slash');
import { todoFilePathFor } from './io';
import { DaysToDecay, FilePath, LintMessage, LintResult, TodoConfig, TodoData } from './types';
import { getDatePart } from './date-utils';

/**
 * Adapts a list of {@link https://github.com/ember-template-lint/ember-template-lint-todo-utils/blob/master/src/types/index.ts#L32|LintResult} to a map of {@link https://github.com/ember-template-lint/ember-template-lint-todo-utils/blob/master/src/types/index.ts#L35|FilePath}, {@link https://github.com/ember-template-lint/ember-template-lint-todo-utils/blob/master/src/types/index.ts#L36|TodoData}.
 *
 * @param baseDir - The base directory that contains the .lint-todo storage directory.
 * @param lintResults - A list of {@link https://github.com/ember-template-lint/ember-template-lint-todo-utils/blob/master/src/types/index.ts#L32|LintResult} objects to convert to {@link https://github.com/ember-template-lint/ember-template-lint-todo-utils/blob/master/src/types/index.ts#L36|TodoData} objects.
 * @param todoConfig - An object containing the warn or error days, in integers.
 * @returns - A Promise resolving to a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map|Map} of {@link https://github.com/ember-template-lint/ember-template-lint-todo-utils/blob/master/src/types/index.ts#L35|FilePath}/{@link https://github.com/ember-template-lint/ember-template-lint-todo-utils/blob/master/src/types/index.ts#L36|TodoData}.
 */
export function buildTodoData(
  baseDir: string,
  lintResults: LintResult[],
  todoConfig?: TodoConfig
): Map<FilePath, TodoData> {
  const results = lintResults.filter((result) => result.messages.length > 0);

  const todoData = results.reduce((converted, lintResult) => {
    lintResult.messages.forEach((message: LintMessage) => {
      if (message.severity === 2) {
        const todoDatum = _buildTodoDatum(baseDir, lintResult, message, todoConfig);

        converted.set(todoFilePathFor(todoDatum), todoDatum);
      }
    });

    return converted;
  }, new Map<FilePath, TodoData>());

  return todoData;
}

/**
 * Adapts an {@link https://github.com/ember-template-lint/ember-template-lint-todo-utils/blob/master/src/types/index.ts#L32|LintResult} to a {@link https://github.com/ember-template-lint/ember-template-lint-todo-utils/blob/master/src/types/index.ts#L36|TodoData}. FilePaths are absolute
 * when received from a lint result, so they're converted to relative paths for stability in
 * serializing the contents to disc.
 *
 * @param lintResult - The lint result object.
 * @param lintMessage - A lint message object representing a specific violation for a file.
 * @param todoConfig - An object containing the warn or error days, in integers.
 * @returns - A {@link https://github.com/ember-template-lint/ember-template-lint-todo-utils/blob/master/src/types/index.ts#L36|TodoData} object.
 */
export function _buildTodoDatum(
  baseDir: string,
  lintResult: LintResult,
  lintMessage: LintMessage,
  todoConfig?: TodoConfig
): TodoData {
  // Note: If https://github.com/nodejs/node/issues/13683 is fixed, remove slash() and use posix.relative
  // provided that the fix is landed on the supported node versions of this lib
  const createdDate = getCreatedDate();
  const filePath = isAbsolute(lintResult.filePath)
    ? relative(baseDir, lintResult.filePath)
    : lintResult.filePath;
  const ruleId = getRuleId(lintMessage);
  const todoDatum: TodoData = {
    engine: getEngine(lintResult),
    filePath: slash(filePath),
    ruleId: getRuleId(lintMessage),
    line: lintMessage.line,
    column: lintMessage.column,
    createdDate: createdDate.getTime(),
  };

  const daysToDecay: DaysToDecay | undefined = getDaysToDecay(ruleId, todoConfig);

  if (daysToDecay?.warn) {
    todoDatum.warnDate = addDays(createdDate, daysToDecay.warn).getTime();
  }

  if (daysToDecay?.error) {
    todoDatum.errorDate = addDays(createdDate, daysToDecay.error).getTime();
  }

  return todoDatum;
}

function getDaysToDecay(ruleId: string, todoConfig?: TodoConfig) {
  if (!todoConfig) {
    return;
  }

  if (todoConfig?.daysToDecayByRule && todoConfig.daysToDecayByRule[ruleId]) {
    return todoConfig.daysToDecayByRule[ruleId];
  } else if (todoConfig?.daysToDecay) {
    return todoConfig.daysToDecay;
  }
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

function getCreatedDate(): Date {
  const date = process.env.TODO_CREATED_DATE ? new Date(process.env.TODO_CREATED_DATE) : new Date();

  return getDatePart(date);
}

function addDays(createdDate: Date, days: number): Date {
  const datePlusDays = new Date(createdDate.valueOf());

  datePlusDays.setDate(datePlusDays.getDate() + days);

  return datePlusDays;
}
