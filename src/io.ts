/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { posix } from 'path';
import { EOL } from 'os';
import {
  existsSync,
  ensureDirSync,
  readFileSync,
  appendFileSync,
  writeFileSync,
  ensureFileSync,
  lstatSync,
} from 'fs-extra';
import { FilePath, TodoDataV2, TodoBatchCounts, TodoBatches, WriteTodoOptions } from './types';
import TodoMatcher from './todo-matcher';
import TodoBatchGenerator from './todo-batch-generator';
import { buildFromTodoOperations, buildTodoOperations, generateHash } from './builders';

/**
 * Determines if the .lint-todo storage directory exists.
 *
 * @param baseDir - The base directory that contains the .lint-todo storage directory.
 * @returns - true if the todo storage directory exists, otherwise false.
 */
export function todoStorageDirExists(baseDir: string): boolean {
  const todoStorageFilePath = getTodoStorageFilePath(baseDir);
  return existsSync(todoStorageFilePath) && !lstatSync(todoStorageFilePath).isDirectory();
}

/**
 * Creates, or ensures the creation of, the .lint-todo directory.
 *
 * @param baseDir - The base directory that contains the .lint-todo storage directory.
 * @returns - The todo storage directory path.
 */
export function ensureTodoStorageDir(baseDir: string): string {
  const path = getTodoStorageFilePath(baseDir);

  ensureDirSync(path);

  return path;
}

/**
 * Determines if the .lint-todo storage file exists.
 *
 * @param baseDir - The base directory that contains the .lint-todo storage file.
 * @returns - true if the todo storage file exists, otherwise false.
 */
export function todoStorageFileExists(baseDir: string): boolean {
  const todoStorageFilePath = getTodoStorageFilePath(baseDir);
  return existsSync(todoStorageFilePath) && !lstatSync(todoStorageFilePath).isDirectory();
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
 * Creates a file path from the linting data. Excludes extension.
 *
 * @example
 * 42b8532cff6da75c5e5895a6f33522bf37418d0c/6e3be839
 *
 * @param baseDir - The base directory that contains the .lint-todo storage directory.
 * @param todoData - The linting data for an individual violation.
 * @returns - The todo file path for a {@link https://github.com/ember-template-lint/ember-template-lint-todo-utils/blob/master/src/types/todo.ts#L61|TodoDataV2} object.
 */
export function todoFilePathFor(todoData: TodoDataV2): string {
  return posix.join(todoDirFor(todoData.filePath), todoFileNameFor(todoData));
}

/**
 * Creates a short hash for the todo's file path.
 *
 * @param filePath - The filePath from linting data for an individual violation.
 * @returns - The todo directory for a specific filepath.
 */
export function todoDirFor(filePath: string): string {
  return generateHash(filePath);
}

/**
 * Generates a unique filename for a todo lint data.
 *
 * @param todoData - The linting data for an individual violation.
 * @returns - The todo file name for a {@link https://github.com/ember-template-lint/ember-template-lint-todo-utils/blob/master/src/types/todo.ts#L61|TodoDataV2} object.
 */
export function todoFileNameFor(todoData: TodoDataV2): string {
  const fileContentsHash = `${todoData.engine}${todoData.ruleId}${todoData.range.start.line}${todoData.range.start.column}`;

  return generateHash(fileContentsHash, 'sha256').slice(0, 8);
}

export function readTodoStorageFile(todoStorageFilePath: string): string[] {
  return readFileSync(todoStorageFilePath, {
    encoding: 'utf-8',
  })
    .split(EOL)
    .filter(Boolean);
}

/**
 * Writes files for todo lint violations. One file is generated for each violation, using a generated
 * hash to identify each.
 *
 * Given a list of todo lint violations, this function will also delete existing files that no longer
 * have a todo lint violation.
 *
 * @param baseDir - The base directory that contains the .lint-todo storage directory.
 * @param maybeTodos - The linting data, converted to TodoDataV2 format.
 * @param options - An object containing write options.
 * @returns - The counts of added and removed todos.
 */
export function writeTodos(
  baseDir: string,
  maybeTodos: Set<TodoDataV2>,
  options?: Partial<WriteTodoOptions>
): TodoBatchCounts {
  options = Object.assign({ shouldRemove: () => true, overwrite: false }, options ?? {});

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
    todoOperations.filter((operation) => operation.includes(filePath))
  );
}

/**
 * Reads todo files in the .lint-todo directory and returns Todo data in an array.
 *
 * @param baseDir - The base directory that contains the .lint-todo storage directory.
 * @returns An array of {@link https://github.com/ember-template-lint/ember-template-lint-todo-utils/blob/master/src/types/todo.ts#L61|TodoDataV2}
 */
export function readTodoData(baseDir: string): TodoDataV2[] {
  return [...readTodos(baseDir).values()].reduce(
    (matcherResults: TodoDataV2[], matcher: TodoMatcher) => {
      return [...matcherResults, ...matcher.unprocessed];
    },
    []
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
  maybeTodos: Set<TodoDataV2>,
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
  add: Set<TodoDataV2>,
  remove: Set<TodoDataV2>,
  options: Partial<WriteTodoOptions>
): void {
  const ops = buildTodoOperations(add, remove);

  if (options.overwrite) {
    writeFileSync(todoStorageFilePath, ops);
  } else {
    appendFileSync(todoStorageFilePath, ops);
  }
}
