import { posix } from 'path';
import { EOL } from 'os';
import { readFileSync, appendFileSync, writeFileSync, ensureFileSync, lstatSync } from 'fs-extra';

import { FilePath, TodoData, TodoBatchCounts, TodoBatches, WriteTodoOptions } from './types';
import TodoMatcher from './todo-matcher';
import TodoBatchGenerator from './todo-batch-generator';
import { buildFromTodoOperations, buildTodoOperations, toTodoDatum } from './builders';
import { isExpired } from './date-utils';

const CONFLICT_PATTERN = /\|{7,}|<{7,}|={7,}|>{7,}/;

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
    if (error.code === 'ENOENT') {
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
  return posix.join(baseDir, '.lint-todo');
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
export function resolveConflicts(operations: string[]): string[] {
  return operations.filter((operation) => !CONFLICT_PATTERN.test(operation));
}

/**
 * Reads the .lint-todo storage file.
 *
 * @param todoStorageFilePath - The .lint-todo storage file path.
 * @returns A array of todo operations.
 */
export function readTodoStorageFile(todoStorageFilePath: string): string[] {
  const todoContents = readFileSync(todoStorageFilePath, {
    encoding: 'utf-8',
  });

  let operations = todoContents.split(EOL);

  if (hasConflicts(todoContents)) {
    operations = resolveConflicts(operations);

    writeTodoStorageFile(todoStorageFilePath, operations);
  }

  return operations.filter(Boolean);
}

export function writeTodoStorageFile(todoStorageFilePath: string, operations: string[]): void {
  writeFileSync(todoStorageFilePath, operations.join(EOL));
}

/**
 * Writes files for todo lint violations. One file is generated for each violation, using a generated
 * hash to identify each.
 *
 * Given a list of todo lint violations, this function will also delete existing files that no longer
 * have a todo lint violation.
 *
 * @param baseDir - The base directory that contains the .lint-todo storage directory.
 * @param maybeTodos - The linting data, converted to TodoData format.
 * @param options - An object containing write options.
 * @returns - The counts of added and removed todos.
 */
export function writeTodos(
  baseDir: string,
  maybeTodos: Set<TodoData>,
  options?: Partial<WriteTodoOptions>
): TodoBatchCounts {
  options = Object.assign({ shouldRemove: () => true, overwrite: false }, options);

  const todoStorageFilePath: string = ensureTodoStorageFile(baseDir);
  const existing: Map<FilePath, TodoMatcher> = options.filePath
    ? readTodosForFilePath(baseDir, options.filePath)
    : readTodos(baseDir);
  const { add, remove, stable, expired } = getTodoBatches(maybeTodos, existing, options);

  applyTodoChanges(todoStorageFilePath, add, remove, options);

  return {
    addedCount: add.size,
    removedCount: remove.size,
    stableCount: stable.size,
    expiredCount: expired.size,
  };
}

// TODO: change from using TodoFilePathHash to just FilePath, but do that once this is all working
/**
 * Reads all todo files in the .lint-todo directory.
 *
 * @param baseDir - The base directory that contains the .lint-todo storage directory.
 * @returns - A {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map|Map} of {@link https://github.com/ember-template-lint/ember-template-lint-todo-utils/blob/master/src/types/todo.ts#L25|FilePath}/{@link https://github.com/ember-template-lint/ember-template-lint-todo-utils/blob/master/src/todo-matcher.ts#L4|TodoMatcher}.
 */
export function readTodos(baseDir: string): Map<FilePath, TodoMatcher> {
  const todoOperations = readTodoStorageFile(getTodoStorageFilePath(baseDir));

  return buildFromTodoOperations(todoOperations);
}

/**
 * Reads todo files in the .lint-todo directory for a specific filePath.
 *
 * @param todoStorageDir - The .lint-todo storage directory.
 * @param filePath - The relative file path of the file to return todo items for.
 * @returns - A {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map|Map} of {@link https://github.com/ember-template-lint/ember-template-lint-todo-utils/blob/master/src/types/todo.ts#L25|FilePath}/{@link https://github.com/ember-template-lint/ember-template-lint-todo-utils/blob/master/src/todo-matcher.ts#L4|TodoMatcher}.
 */
export function readTodosForFilePath(
  baseDir: string,
  filePath: string
): Map<FilePath, TodoMatcher> {
  const todoOperations = readFileSync(getTodoStorageFilePath(baseDir), {
    encoding: 'utf-8',
  }).split(EOL);

  return buildFromTodoOperations(
    todoOperations.filter((operation) => operation.endsWith(filePath))
  );
}

/**
 * Reads todo files in the .lint-todo directory and returns Todo data in an array.
 *
 * @param baseDir - The base directory that contains the .lint-todo storage directory.
 * @returns An array of {@link https://github.com/ember-template-lint/ember-template-lint-todo-utils/blob/master/src/types/todo.ts#L61|TodoData}
 */
export function readTodoData(baseDir: string): Set<TodoData> {
  return new Set(
    [...readTodos(baseDir).values()].reduce((matcherResults: TodoData[], matcher: TodoMatcher) => {
      return [...matcherResults, ...matcher.unprocessed];
    }, [])
  );
}

/**
 * Gets 4 maps containing todo items to add, remove, those that are expired, or those that are stable (not to be modified).
 *
 * @param maybeTodos - The linting data for violations.
 * @param existing - Existing todo lint data.
 * @param options - An object containing write options.
 * @returns - An object of {@link https://github.com/ember-template-lint/ember-template-lint-todo-utils/blob/master/src/types/todo.ts#L36|TodoBatches}.
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
 * @param todoStorageFilePath - The .lint-todo storage file path.
 * @param add - Batch of todos to add.
 * @param remove - Batch of todos to remove.
 * @param options - An object containing write options.
 */
export function applyTodoChanges(
  todoStorageFilePath: string,
  add: Set<TodoData>,
  remove: Set<TodoData>,
  options: Partial<WriteTodoOptions>
): void {
  const ops = buildTodoOperations(add, remove);

  if (options.overwrite) {
    writeFileSync(todoStorageFilePath, ops);
  } else {
    appendFileSync(todoStorageFilePath, ops);
  }
}

/**
 * Compact strategy to leave only add operations in the todo storage file.
 *
 * @param operation - The single line operation read from the todo storage file.
 * @returns True if the line matches an add operation, otherwise false.
 */
export const ADD_OPERATIONS_ONLY = (operation: string): boolean => /^add.*/.test(operation);

/**
 * Compact strategy to remove all expired operations from the todo storage file.
 *
 * @param operation - The single line operation read from the todo storage file.
 * @returns True if the operation is not expired, otherwise false.
 */
export const EXCLUDE_EXPIRED = (operation: string): boolean => {
  const [, todoDatum] = toTodoDatum(operation);

  return !isExpired(todoDatum.errorDate);
};

/**
 * Compacts the .lint-todo storage file based on the compact strategy.
 *
 * @param baseDir - The base directory that contains the .lint-todo storage directory.
 * @param compactStrategy - The strategy to use when compacting the storage file. Default: ADD_OPERATIONS_ONLY
 */
export function compactTodoStorageFile(
  baseDir: string,
  compactStrategy: (operation: string) => boolean = ADD_OPERATIONS_ONLY
): void {
  const todoStorageFilePath = getTodoStorageFilePath(baseDir);

  const operations = readTodoStorageFile(todoStorageFilePath).filter((operation) =>
    compactStrategy(operation)
  );

  writeTodoStorageFile(todoStorageFilePath, operations);
}
