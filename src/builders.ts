import { isAbsolute, relative } from 'path';
import { EOL } from 'os';
import slash = require('slash');
import { createHash } from 'crypto';
import {
  DaysToDecay,
  GenericLintData,
  Location,
  Operation,
  TodoConfig,
  TodoData,
  TodoDataV1,
  TodoDataV2,
  TodoDates,
  TodoFileFormat,
  TodoFileHash,
  TodoFilePathHash,
} from './types';
import { getDatePart } from './date-utils';
import { todoDirFor } from './io';
import TodoMatcher from './todo-matcher';

const SEPARATOR = '|';

export function buildFromTodoOperations(
  todoOperations: string[]
): Map<TodoFilePathHash, TodoMatcher> {
  const existingTodos = new Map<TodoFilePathHash, TodoMatcher>();

  for (const todoOperation of todoOperations) {
    const [
      operation,
      engine,
      ruleId,
      line,
      column,
      endLine,
      endColumn,
      source,
      fileFormat,
      createdDate,
      warnDate,
      errorDate,
      ...filePathSegments
    ] = todoOperation.split(SEPARATOR);

    // The only case where we need to join back on the separator is when the filePath itself
    // contains a pipe ('|') char. Normal filePaths will simply join without the separator.
    const filePath = filePathSegments.join(SEPARATOR);
    const todoFileDir = todoDirFor(filePath);

    if (!existingTodos.has(todoFileDir)) {
      existingTodos.set(todoFileDir, new TodoMatcher());
    }

    const matcher = existingTodos.get(todoFileDir);

    matcher?.addOrRemove(<Operation>operation, {
      engine,
      ruleId,
      filePath,
      fileFormat: Number.parseInt(fileFormat, 10),
      range: {
        start: {
          line: Number.parseInt(line, 10),
          column: Number.parseInt(column, 10),
        },
        end: {
          line: Number.parseInt(endLine, 10),
          column: Number.parseInt(endColumn, 10),
        },
      },
      source,
      createdDate: Number.parseInt(createdDate, 10),
      warnDate: Number.parseInt(warnDate, 10),
      errorDate: Number.parseInt(errorDate, 10),
    });
  }

  for (const [filePath, matcher] of existingTodos.entries()) {
    if (matcher.unprocessed.size === 0) {
      existingTodos.delete(filePath);
    }
  }

  return existingTodos;
}

export function buildTodoOperations(
  add: Map<TodoFileHash, TodoDataV2>,
  remove: Map<TodoFileHash, TodoDataV2>
): string {
  const ops: string[] = [];

  for (const [, todoDatum] of add) {
    ops.push(toOperation('add', todoDatum));
  }

  for (const [, todoDatum] of remove) {
    ops.push(toOperation('remove', todoDatum));
  }

  return ops.join(EOL);
}

export function toOperation(operation: Operation, todoDatum: TodoDataV2): string {
  return [
    operation,
    todoDatum.engine,
    todoDatum.ruleId,
    todoDatum.range.start.line,
    todoDatum.range.start.column,
    todoDatum.range.end.line,
    todoDatum.range.end.column,
    todoDatum.source,
    todoDatum.fileFormat,
    todoDatum.createdDate,
    todoDatum.warnDate,
    todoDatum.errorDate,
    todoDatum.filePath,
  ].join(SEPARATOR);
}

/**
 * Adapts a {@link https://github.com/ember-template-lint/ember-template-lint-todo-utils/blob/master/src/types/lint.ts#L31|LintResult} to a {@link https://github.com/ember-template-lint/ember-template-lint-todo-utils/blob/master/src/types/todo.ts#L61|TodoDataV2}. FilePaths are absolute
 * when received from a lint result, so they're converted to relative paths for stability in
 * serializing the contents to disc.
 *
 * @param lintResult - The lint result object.
 * @param lintMessage - A lint message object representing a specific violation for a file.
 * @param todoConfig - An object containing the warn or error days, in integers.
 * @returns - A {@link https://github.com/ember-template-lint/ember-template-lint-todo-utils/blob/master/src/types/todo.ts#L61|TodoDataV2} object.
 */
export function buildTodoDatum(
  baseDir: string,
  genericLintData: GenericLintData,
  todoConfig?: TodoConfig
): TodoDataV2 {
  // Note: If https://github.com/nodejs/node/issues/13683 is fixed, remove slash() and use posix.relative
  // provided that the fix is landed on the supported node versions of this lib
  const filePath = isAbsolute(genericLintData.filePath)
    ? relative(baseDir, genericLintData.filePath)
    : genericLintData.filePath;
  const todoDatum: TodoDataV2 = Object.assign(
    genericLintData,
    {
      source: generateHash(genericLintData.source),
      filePath: slash(filePath),
      fileFormat: TodoFileFormat.Version2,
    },
    getTodoDates(genericLintData.ruleId, todoConfig)
  );

  return todoDatum;
}

export function normalizeToV2(todoDatum: TodoData): TodoDataV2 {
  // if we have a range property, we're already in V2 format
  if ('range' in todoDatum) {
    todoDatum.fileFormat = TodoFileFormat.Version2;

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
    fileFormat: TodoFileFormat.Version1,
  };

  if (todoDatumV1.warnDate) {
    todoDatumV2.warnDate = todoDatumV1.warnDate;
  }

  if (todoDatumV1.errorDate) {
    todoDatumV2.errorDate = todoDatumV1.errorDate;
  }

  return todoDatumV2;
}

export function generateHash(input: string, algorithm = 'sha1'): string {
  return createHash(algorithm).update(input).digest('hex');
}

function getTodoDates(ruleId: string, todoConfig?: TodoConfig): TodoDates {
  const createdDate = getCreatedDate();
  const todoDates: TodoDates = {
    createdDate: createdDate.getTime(),
  };
  const daysToDecay: DaysToDecay | undefined = getDaysToDecay(ruleId, todoConfig);

  if (daysToDecay?.warn) {
    todoDates.warnDate = addDays(createdDate, daysToDecay.warn).getTime();
  }

  if (daysToDecay?.error) {
    todoDates.errorDate = addDays(createdDate, daysToDecay.error).getTime();
  }

  return todoDates;
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

function getCreatedDate(): Date {
  const date = process.env.TODO_CREATED_DATE ? new Date(process.env.TODO_CREATED_DATE) : new Date();

  return getDatePart(date);
}

function addDays(createdDate: Date, days: number): Date {
  const datePlusDays = new Date(createdDate.valueOf());

  datePlusDays.setDate(datePlusDays.getDate() + days);

  return datePlusDays;
}
