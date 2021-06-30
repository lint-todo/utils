import { isAbsolute, relative } from 'path';
import slash = require('slash');
import {
  DaysToDecay,
  LintMessage,
  LintResult,
  Location,
  Range,
  TodoConfig,
  TodoData,
  TodoDataV1,
  TodoDataV2,
} from './types';
import { getDatePart } from './date-utils';

const LINES_PATTERN = /(.*?(?:\r\n?|\n|$))/gm;

/**
 * Adapts a list of {@link https://github.com/ember-template-lint/ember-template-lint-todo-utils/blob/master/src/types/index.ts#L32|LintResult} to a map of {@link https://github.com/ember-template-lint/ember-template-lint-todo-utils/blob/master/src/types/index.ts#L35|TodoFileHash}, {@link https://github.com/ember-template-lint/ember-template-lint-todo-utils/blob/master/src/types/index.ts#L36|TodoData}.
 *
 * @param baseDir - The base directory that contains the .lint-todo storage directory.
 * @param lintResults - A list of {@link https://github.com/ember-template-lint/ember-template-lint-todo-utils/blob/master/src/types/index.ts#L32|LintResult} objects to convert to {@link https://github.com/ember-template-lint/ember-template-lint-todo-utils/blob/master/src/types/index.ts#L36|TodoData} objects.
 * @param todoConfig - An object containing the warn or error days, in integers.
 * @returns - A Promise resolving to a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set|Set} of {@link https://github.com/ember-template-lint/ember-template-lint-todo-utils/blob/master/src/types/index.ts#L36|TodoData}.
 */
export function buildTodoData(
  baseDir: string,
  lintResults: LintResult[],
  todoConfig?: TodoConfig
): Set<TodoDataV2> {
  const results = lintResults.filter((result) => result.messages.length > 0);

  const todoData = results.reduce((converted, lintResult) => {
    lintResult.messages.forEach((message: LintMessage) => {
      if (message.severity === 2) {
        const todoDatum = buildTodoDatumV2(baseDir, lintResult, message, todoConfig);

        converted.add(todoDatum);
      }
    });

    return converted;
  }, new Set<TodoDataV2>());

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
export function buildTodoDatum(
  baseDir: string,
  lintResult: LintResult,
  lintMessage: LintMessage,
  todoConfig?: TodoConfig
): TodoDataV1 {
  // Note: If https://github.com/nodejs/node/issues/13683 is fixed, remove slash() and use posix.relative
  // provided that the fix is landed on the supported node versions of this lib
  const createdDate = getCreatedDate();
  const filePath = isAbsolute(lintResult.filePath)
    ? relative(baseDir, lintResult.filePath)
    : lintResult.filePath;
  const ruleId = getRuleId(lintMessage);
  const todoDatum: TodoDataV1 = {
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
export function buildTodoDatumV2(
  baseDir: string,
  lintResult: LintResult,
  lintMessage: LintMessage,
  todoConfig?: TodoConfig
): TodoDataV2 {
  // Note: If https://github.com/nodejs/node/issues/13683 is fixed, remove slash() and use posix.relative
  // provided that the fix is landed on the supported node versions of this lib
  const createdDate = getCreatedDate();
  const filePath = isAbsolute(lintResult.filePath)
    ? relative(baseDir, lintResult.filePath)
    : lintResult.filePath;
  const ruleId = getRuleId(lintMessage);
  const range = getRange(lintMessage);
  const todoDatum: TodoDataV2 = {
    engine: getEngine(lintResult),
    filePath: slash(filePath),
    ruleId: getRuleId(lintMessage),
    range,
    source: getSource(lintResult, lintMessage, range),
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

export function normalizeToV2(todoDatum: TodoData): TodoDataV2 {
  // if we have a range property, we're already in V2 format
  if ('range' in todoDatum) {
    return <TodoDataV2>todoDatum;
  }

  const todoDatumV1 = <TodoDataV1>todoDatum;

  const todoDatumV2: TodoDataV2 = {
    engine: todoDatumV1.engine,
    filePath: todoDatumV1.filePath,
    ruleId: todoDatumV1.ruleId,
    range: getRange(todoDatumV1),
    source: '',
    createdDate: todoDatumV1.createdDate,
  };

  if (todoDatumV1.warnDate) {
    todoDatumV2.warnDate = todoDatumV1.warnDate;
  }

  if (todoDatumV1.errorDate) {
    todoDatumV2.errorDate = todoDatumV1.errorDate;
  }

  return todoDatumV2;
}

function getRange(loc: Location) {
  return {
    start: {
      line: loc.line,
      column: loc.column,
    },
    end: {
      // eslint-disable-next-line unicorn/no-null
      line: loc.endLine ?? loc.line,
      // eslint-disable-next-line unicorn/no-null
      column: loc.endColumn ?? loc.column,
    },
  };
}

function getSource(lintResult: LintResult, lintMessage: LintMessage, range: Range) {
  if (lintResult.source) {
    return getSourceForRange(lintResult.source.match(LINES_PATTERN) || [], range);
  }

  if (lintMessage.source) {
    return lintMessage.source;
  }

  return '';
}

function getSourceForRange(source: string[], range: Range) {
  const firstLine = range.start.line - 1;
  const lastLine = range.end.line - 1;
  let currentLine = firstLine - 1;
  const firstColumn = range.start.column - 1;
  const lastColumn = range.end.column - 1;
  const string = [];
  let line;

  while (currentLine < lastLine) {
    currentLine++;
    line = source[currentLine];

    if (currentLine === firstLine) {
      if (firstLine === lastLine) {
        string.push(line.slice(firstColumn, lastColumn));
      } else {
        string.push(line.slice(firstColumn));
      }
    } else if (currentLine === lastLine) {
      string.push(line.slice(0, lastColumn));
    } else {
      string.push(line);
    }
  }

  return string.join('');
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
