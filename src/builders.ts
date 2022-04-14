import { isAbsolute, relative, normalize } from 'upath';
import slash = require('slash');
import { createHash } from 'crypto';
import {
  DaysToDecay,
  Engine,
  FilePath,
  GenericLintData,
  Operation,
  OperationType,
  TodoConfig,
  TodoData,
  TodoDates,
} from './types';
import { getDatePart } from './date-utils';
import TodoMatcher from './todo-matcher';

const SEPARATOR = '|';

export function buildFromTodoOperations(
  todoOperations: string[],
  engine: Engine
): Map<FilePath, TodoMatcher> {
  const existingTodos = new Map<FilePath, TodoMatcher>();

  for (const todoOperation of todoOperations) {
    const [operation, todoDatum] = toTodoDatum(todoOperation);

    if (todoDatum.engine !== engine) {
      continue;
    }

    if (!existingTodos.has(todoDatum.filePath)) {
      existingTodos.set(todoDatum.filePath, new TodoMatcher());
    }

    const matcher = existingTodos.get(todoDatum.filePath);

    matcher?.addOrRemove(operation, todoDatum);
  }

  for (const [filePath, matcher] of existingTodos.entries()) {
    if (matcher.unprocessed.size === 0) {
      existingTodos.delete(filePath);
    }
  }

  return existingTodos;
}

export function buildTodoOperations(add: Set<TodoData>, remove: Set<TodoData>): Operation[] {
  if (add.size === 0 && remove.size === 0) {
    return [];
  }

  const ops: string[] = [];

  for (const todoDatum of add) {
    ops.push(toOperation('add', todoDatum));
  }

  for (const todoDatum of remove) {
    ops.push(toOperation('remove', todoDatum));
  }

  return ops as Operation[];
}

export function toTodoDatum(todoOperation: string): [OperationType, TodoData] {
  const [
    operation,
    engine,
    ruleId,
    line,
    column,
    endLine,
    endColumn,
    source,
    createdDate,
    warnDate,
    errorDate,
    ...filePathSegments
  ] = todoOperation.split(SEPARATOR);

  // The only case where we need to join back on the separator is when the filePath itself
  // contains a pipe ('|') char. The vast majority of normal filePaths will simply join without
  // the separator.
  const filePath = filePathSegments.join(SEPARATOR);

  return [
    <OperationType>operation,
    {
      engine,
      ruleId,
      filePath,
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
      warnDate: warnDate ? Number.parseInt(warnDate, 10) : undefined,
      errorDate: errorDate ? Number.parseInt(errorDate, 10) : undefined,
    },
  ];
}

export function toOperation(operation: OperationType, todoDatum: TodoData): string {
  return [
    operation,
    todoDatum.engine,
    todoDatum.ruleId,
    todoDatum.range.start.line,
    todoDatum.range.start.column,
    todoDatum.range.end.line,
    todoDatum.range.end.column,
    todoDatum.source,
    todoDatum.createdDate,
    todoDatum.warnDate,
    todoDatum.errorDate,
    todoDatum.filePath,
  ].join(SEPARATOR);
}

/**
 * Adapts a {@link https://github.com/lint-todo/utils/blob/master/src/types/lint.ts#L31|LintResult} to a {@link https://github.com/lint-todo/utils/blob/master/src/types/todo.ts#L61|TodoData}. FilePaths are absolute
 * when received from a lint result, so they're converted to relative paths for stability in
 * serializing the contents to disc.
 *
 * @param lintResult - The lint result object.
 * @param lintMessage - A lint message object representing a specific violation for a file.
 * @param todoConfig - An object containing the warn or error days, in integers.
 * @returns - A {@link https://github.com/lint-todo/utils/blob/master/src/types/todo.ts#L61|TodoData} object.
 */
export function buildTodoDatum(
  baseDir: string,
  genericLintData: GenericLintData,
  todoConfig?: TodoConfig
): TodoData {
  const filePath = isAbsolute(genericLintData.filePath)
    ? relative(baseDir, genericLintData.filePath)
    : normalize(genericLintData.filePath);
  const todoDatum: TodoData = Object.assign(
    genericLintData,
    {
      source: generateHash(genericLintData.source),
      filePath: slash(filePath),
    },
    getTodoDates(genericLintData.ruleId, todoConfig)
  );

  return todoDatum;
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
