import { join } from 'node:path';
import { normalize } from 'upath';
import { EOL } from 'node:os';
import { lockSync } from 'proper-lockfile';
import { readFileSync, appendFileSync, writeFileSync, ensureFileSync, lstatSync } from 'fs-extra';

import {
  FilePath,
  TodoData,
  TodoBatchCounts,
  TodoBatches,
  WriteTodoOptions,
  Operation,
  OperationOrConflictLine,
  ReadTodoOptions,
} from './types';
import TodoMatcher from './todo-matcher';
import TodoBatchGenerator from './todo-batch-generator';
import { buildFromTodoOperations, buildTodoOperations } from './builders';

const CONFLICT_PATTERN = /^\|{7,}|<{7,}|={7,}|>{7,}|!.*/;

/**
 * Determines if the .lint-todo storage file exists.
 *
 * @param baseDir - The base directory that contains the .lint-todo storage file.
 * @returns - true if the todo storage file exists, otherwise false.
 */
export function todoStorageFileExists(baseDir: string): boolean {
  try {
    return !lstatSync(getTodoStorageFilePath(baseDir)).isDirectory();
  } catch (error) {
    if ((<any>error).code === 'ENOENT') {
      return false;
    }

    throw error;
  }
}

/**
 * Creates, or ensures the creation of, the .lint-todo file.
 *
 * @param baseDir - The base directory that contains the .lint-todo storage file.
 * @returns - The todo storage file path.
 */
export function ensureTodoStorageFile(baseDir: string): string {
  const path = getTodoStorageFilePath(baseDir);

  ensureFileSync(path);

  return path;
}

/**
 * @param baseDir - The base directory that contains the .lint-todo storage file.
 * @returns - The todo storage file path.
 */
export function getTodoStorageFilePath(baseDir: string): string {
  return join(baseDir, '.lint-todo');
}

/**
 * Determines if the .lint-todo storage file has conflicts.
 *
 * @param todoContents - The unparsed contents of the .lint-todo file.
 * @returns true if the file has conflicts, otherwise false.
 */
export function hasConflicts(todoContents: string): boolean {
  return CONFLICT_PATTERN.test(todoContents);
}

/**
 * Resolves git conflicts in todo operations by removing any lines that match conflict markers.
 *
 * @param operations - An array of string operations that are used to recreate todos.
 * @returns An array of string operations excluding any operations that were identified as git conflict lines.
 */
export function resolveConflicts(operations: OperationOrConflictLine[]): Operation[] {
  return operations.filter((operation) => !CONFLICT_PATTERN.test(operation)) as Operation[];
}

/**
 * Reads the .lint-todo storage file.
 *
 * @param todoStorageFilePath - The .lint-todo storage file path.
 * @returns A array of todo operations.
 */
export function readTodoStorageFile(todoStorageFilePath: string): Operation[] {
  const todoContents = readFileSync(todoStorageFilePath, {
    encoding: 'utf8',
  });

  // when splitting by EOL, make sure to filter off the '' caused by the final EOL
  let operations: OperationOrConflictLine[] = todoContents.split(EOL).filter((op: OperationOrConflictLine | '') => op !== '')

  if (hasConflicts(todoContents)) {
    operations = resolveConflicts(operations);

    writeTodoStorageFile(todoStorageFilePath, operations as Operation[]);
  }

  return operations.filter(Boolean) as Operation[];
}

/**
 * Writes the operations to the .lint-todo storage file to the path provided by todoStorageFilePath.
 *
 * @param todoStorageFilePath - The .lint-todo storage file path.
 * @param operations - An array of string operations that are used to recreate todos.
 */
export function writeTodoStorageFile(todoStorageFilePath: string, operations: Operation[]): void {
  writeFileSync(todoStorageFilePath, operations.join(EOL) + EOL);
}

/**
 * Writes files for todo lint violations. One file is generated for each violation, using a generated
 * hash to identify each.
 *
 * Given a list of todo lint violations, this function will also delete existing files that no longer
 * have a todo lint violation.
 *
 * @param baseDir - The base directory that contains the .lint-todo storage file.
 * @param maybeTodos - The linting data, converted to TodoData format.
 * @param options - An object containing write options.
 * @returns - The counts of added and removed todos.
 */
export function writeTodos(
  baseDir: string,
  maybeTodos: Set<TodoData>,
  options: WriteTodoOptions
): TodoBatchCounts {
  options = Object.assign({ shouldRemove: () => true, overwrite: false }, options);

  let batches: TodoBatches;

  ensureTodoStorageFile(baseDir);
  const release = tryLockStorageFile(baseDir);

  try {
    const existing: Map<FilePath, TodoMatcher> = options.filePath
      ? readTodosForFilePath(baseDir, options, false)
      : readTodos(baseDir, options, false);
    batches = getTodoBatches(maybeTodos, existing, options);

    applyTodoChanges(baseDir, batches.add, batches.remove, false);
  } finally {
    release();
  }

  return {
    addedCount: batches.add.size,
    removedCount: batches.remove.size,
    stableCount: batches.stable.size,
    expiredCount: batches.expired.size,
  };
}

/**
 * Reads all todo files in the .lint-todo file.
 *
 * @param baseDir - The base directory that contains the .lint-todo storage file.
 * @param options - An object containing read options.
 * @param shouldLock - True if the .lint-todo storage file should be locked, otherwise false. Default: true.
 * @returns - A {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map|Map} of {@link https://github.com/lint-todo/utils/blob/master/src/types/todo.ts#L25|FilePath}/{@link https://github.com/lint-todo/utils/blob/master/src/todo-matcher.ts#L4|TodoMatcher}.
 */
export function readTodos(
  baseDir: string,
  options: ReadTodoOptions,
  shouldLock = true
): Map<FilePath, TodoMatcher> {
  const release =
    shouldLock && todoStorageFileExists(baseDir)
      ? tryLockStorageFile(baseDir)
      : // eslint-disable-next-line @typescript-eslint/no-empty-function
        () => {};

  try {
    const todoOperations = readTodoStorageFile(getTodoStorageFilePath(baseDir));

    return buildFromTodoOperations(todoOperations, options.engine);
  } finally {
    release();
  }
}

/**
 * Reads todo files in the .lint-todo file for a specific filePath.
 *
 * @param baseDir - The base directory that contains the .lint-todo storage file.
 * @param options - An object containing read options.
 * @param shouldLock - True if the .lint-todo storage file should be locked, otherwise false. Default: true.
 * @returns - A {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map|Map} of {@link https://github.com/lint-todo/utils/blob/master/src/types/todo.ts#L25|FilePath}/{@link https://github.com/lint-todo/utils/blob/master/src/todo-matcher.ts#L4|TodoMatcher}.
 */
export function readTodosForFilePath(
  baseDir: string,
  options: ReadTodoOptions,
  shouldLock = true
): Map<FilePath, TodoMatcher> {
  const existingTodos = readTodos(baseDir, options, shouldLock);
  const normalizedFilePath = normalize(options.filePath);

  const matcher = existingTodos.get(normalizedFilePath) || new TodoMatcher();

  return new Map([[normalizedFilePath, matcher]]);
}

/**
 * Reads todos in the .lint-todo file and returns Todo data in an array.
 *
 * @param baseDir - The base directory that contains the .lint-todo storage file.
 * @param options - An object containing read options.
 * @returns An array of {@link https://github.com/lint-todo/utils/blob/master/src/types/todo.ts#L61|TodoData}
 */
export function readTodoData(baseDir: string, options: ReadTodoOptions): Set<TodoData> {
  return new Set(
    [...readTodos(baseDir, options).values()].reduce(
      (matcherResults: TodoData[], matcher: TodoMatcher) => {
        return [...matcherResults, ...matcher.unprocessed];
      },
      []
    )
  );
}

/**
 * Reads todos for a single filePath in the .lint-todo file and returns Todo data in an array.
 *
 * @param baseDir - The base directory that contains the .lint-todo storage file.
 * @param options - An object containing read options.
 * @returns An array of {@link https://github.com/lint-todo/utils/blob/master/src/types/todo.ts#L61|TodoData}
 */
export function readTodoDataForFilePath(baseDir: string, options: ReadTodoOptions): Set<TodoData> {
  return new Set(
    [...readTodosForFilePath(baseDir, options).values()].reduce(
      (matcherResults: TodoData[], matcher: TodoMatcher) => {
        return [...matcherResults, ...matcher.unprocessed];
      },
      []
    )
  );
}

/**
 * Gets 4 data structures containing todo items to add, remove, those that are expired, and those that are stable (not to be modified).
 *
 * @param baseDir - The base directory that contains the .lint-todo storage file.
 * @param maybeTodos - The linting data for violations.
 * @param options - An object containing write options.
 * @returns - An object of {@link https://github.com/lint-todo/utils/blob/master/src/types/todo.ts#L36|TodoBatches}.
 */
export function generateTodoBatches(
  baseDir: string,
  maybeTodos: Set<TodoData>,
  options: Partial<WriteTodoOptions>
): TodoBatches {
  const existingTodos = readTodosForFilePath(baseDir, options as ReadTodoOptions);

  return getTodoBatches(maybeTodos, existingTodos, options);
}

/**
 * Gets 4 data structures containing todo items to add, remove, those that are expired, and those that are stable (not to be modified).
 *
 * @param maybeTodos - The linting data for violations.
 * @param existing - Existing todo lint data.
 * @param options - An object containing write options.
 * @returns - An object of {@link https://github.com/lint-todo/utils/blob/master/src/types/todo.ts#L36|TodoBatches}.
 */
export function getTodoBatches(
  maybeTodos: Set<TodoData>,
  existing: Map<FilePath, TodoMatcher>,
  options: Partial<WriteTodoOptions>
): TodoBatches {
  const todoBatchGenerator = new TodoBatchGenerator(options);
  return todoBatchGenerator.generate(maybeTodos, existing);
}

/**
 * Applies todo changes, either adding or removing, based on batches from `getTodoBatches`.
 *
 * @param baseDir - The base directory that contains the .lint-todo storage file.
 * @param add - Batch of todos to add.
 * @param remove - Batch of todos to remove.
 * @param shouldLock - True if the .lint-todo storage file should be locked, otherwise false. Default: true.
 */
export function applyTodoChanges(
  baseDir: string,
  add: Set<TodoData>,
  remove: Set<TodoData>,
  shouldLock = true
): void {
  const todoStorageFilePath = getTodoStorageFilePath(baseDir);
  const ops = buildTodoOperations(add, remove);
  const release =
    shouldLock && todoStorageFileExists(baseDir)
      ? tryLockStorageFile(baseDir)
      : // eslint-disable-next-line @typescript-eslint/no-empty-function
        () => {};

  if (ops.length === 0) {
    return;
  }

  try {
    appendFileSync(todoStorageFilePath, ops.join(EOL) + EOL);
  } finally {
    release();
  }
}

/**
 * Compacts the .lint-todo storage file.
 *
 * @param baseDir - The base directory that contains the .lint-todo storage file.
 * @returns The count of compacted todos.
 */
export function compactTodoStorageFile(baseDir: string): {
  originalOperations: Operation[];
  compactedOperations: Operation[];
  compacted: number;
} {
  const todoStorageFilePath = getTodoStorageFilePath(baseDir);
  const todos = readTodoData(baseDir, {
    engine: 'all',
    filePath: '',
  });
  const release = tryLockStorageFile(baseDir);

  try {
    const originalOperations = readTodoStorageFile(todoStorageFilePath);
    const compactedOperations = buildTodoOperations(todos, new Set());

    writeTodoStorageFile(todoStorageFilePath, compactedOperations);

    return {
      originalOperations,
      compactedOperations,
      compacted: originalOperations.length - compactedOperations.length,
    };
  } finally {
    release();
  }
}

function tryLockStorageFile(baseDir: string, attempts = 0): () => void {
  const todoStorageFilePath = getTodoStorageFilePath(baseDir);

  try {
    return lockSync(todoStorageFilePath);
  } catch (error) {
    if (attempts > 5) {
      throw error;
    }

    if ((<any>error).code === 'ELOCKED') {
      const start = Date.now();
      while (Date.now() - start < 500) {
        // artifical wait for other process to unlock file
      }

      return tryLockStorageFile(baseDir, attempts + 1);
    }
    throw error;
  }
}
