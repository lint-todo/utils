/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { createHash } from 'crypto';
import { posix } from 'path';
import {
  existsSync,
  ensureDirSync,
  readdirSync,
  readJSONSync,
  writeJsonSync,
  unlinkSync,
  rmdirSync,
} from 'fs-extra';
import {
  TodoFileHash,
  LintResult,
  TodoDataV1,
  TodoBatchCounts,
  WriteTodoOptions,
  TodoFilePathHash,
  TodoBatches,
} from './types';
import TodoMatcher from './todo-matcher';
import TodoBatchGenerator from './todo-batch-generator';

/**
 * Determines if the .lint-todo storage directory exists.
 *
 * @param baseDir - The base directory that contains the .lint-todo storage directory.
 * @returns - true if the todo storage directory exists, otherwise false.
 */
export function todoStorageDirExists(baseDir: string): boolean {
  return existsSync(getTodoStorageDirPath(baseDir));
}

/**
 * Creates, or ensures the creation of, the .lint-todo directory.
 *
 * @param baseDir - The base directory that contains the .lint-todo storage directory.
 * @returns - The todo storage directory path.
 */
export function ensureTodoStorageDir(baseDir: string): string {
  const path = getTodoStorageDirPath(baseDir);

  ensureDirSync(path);

  return path;
}

/**
 * @param baseDir - The base directory that contains the .lint-todo storage directory.
 * @returns - The todo storage directory path.
 */
export function getTodoStorageDirPath(baseDir: string): string {
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
 * @returns - The todo file path for a {@link https://github.com/ember-template-lint/ember-template-lint-todo-utils/blob/master/src/types/index.ts#L36|TodoData} object.
 */
export function todoFilePathFor(todoData: TodoDataV1): string {
  return posix.join(todoDirFor(todoData.filePath), todoFileNameFor(todoData));
}

/**
 * Creates a short hash for the todo's file path.
 *
 * @param filePath - The filePath from linting data for an individual violation.
 * @returns - The todo directory for a specific filepath.
 */
export function todoDirFor(filePath: string): string {
  return createHash('sha1').update(filePath).digest('hex');
}

/**
 * Generates a unique filename for a todo lint data.
 *
 * @param todoData - The linting data for an individual violation.
 * @returns - The todo file name for a {@link https://github.com/ember-template-lint/ember-template-lint-todo-utils/blob/master/src/types/index.ts#L36|TodoData} object.
 */
export function todoFileNameFor(todoData: TodoDataV1): string {
  const hashParams = `${todoData.engine}${todoData.ruleId}${todoData.line}${todoData.column}`;

  return createHash('sha256').update(hashParams).digest('hex').slice(0, 8);
}

/**
 * Writes files for todo lint violations. One file is generated for each violation, using a generated
 * hash to identify each.
 *
 * Given a list of todo lint violations, this function will also delete existing files that no longer
 * have a todo lint violation.
 *
 * @param baseDir - The base directory that contains the .lint-todo storage directory.
 * @param lintResults - The raw linting data.
 * @param options - An object containing write options.
 * @returns - The counts of added and removed todos.
 */
export function writeTodos(
  baseDir: string,
  lintResults: LintResult[],
  options?: Partial<WriteTodoOptions>
): TodoBatchCounts {
  options = Object.assign({ shouldRemove: () => true }, options ?? {});

  const todoStorageDir: string = ensureTodoStorageDir(baseDir);
  const existing: Map<TodoFilePathHash, TodoMatcher> = options.filePath
    ? readTodosForFilePath(baseDir, options.filePath)
    : readTodos(baseDir);
  const { add, remove, stable, expired } = getTodoBatchesSync(
    baseDir,
    lintResults,
    existing,
    options
  );

  applyTodoChanges(todoStorageDir, add, remove);

  return [add.size, remove.size, stable.size, expired.size];
}

/**
 * Reads all todo files in the .lint-todo directory.
 *
 * @param baseDir - The base directory that contains the .lint-todo storage directory.
 * @returns - A {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map|Map} of {@link https://github.com/ember-template-lint/ember-template-lint-todo-utils/blob/master/src/types/index.ts#L51|TodoFilePathHash}/{@link https://github.com/ember-template-lint/ember-template-lint-todo-utils/blob/master/src/todo-matcher.ts#L4|TodoMatcher}.
 */
export function readTodos(baseDir: string): Map<TodoFilePathHash, TodoMatcher> {
  const existingTodos = new Map<TodoFilePathHash, TodoMatcher>();
  const todoStorageDir: string = ensureTodoStorageDir(baseDir);
  const todoFileDirs = readdirSync(todoStorageDir);

  for (const todoFileDir of todoFileDirs) {
    const todoFileHashes = readdirSync(posix.join(todoStorageDir, todoFileDir));

    if (!existingTodos.has(todoFileDir)) {
      existingTodos.set(todoFileDir, new TodoMatcher());
    }

    const matcher = existingTodos.get(todoFileDir);

    for (const todoFileHash of todoFileHashes) {
      const todoDatum = readJSONSync(posix.join(todoStorageDir, todoFileDir, todoFileHash));
      matcher!.add(todoDatum);
    }
  }

  return existingTodos;
}

/**
 * Reads todo files in the .lint-todo directory for a specific filePath.
 *
 * @param todoStorageDir - The .lint-todo storage directory.
 * @param filePath - The relative file path of the file to return todo items for.
 * @returns - A {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map|Map} of {@link https://github.com/ember-template-lint/ember-template-lint-todo-utils/blob/master/src/types/index.ts#L51|TodoFilePathHash}/{@link https://github.com/ember-template-lint/ember-template-lint-todo-utils/blob/master/src/todo-matcher.ts#L4|TodoMatcher}.
 */
export function readTodosForFilePath(
  baseDir: string,
  filePath: string
): Map<TodoFilePathHash, TodoMatcher> {
  const existingTodos = new Map<TodoFilePathHash, TodoMatcher>();
  const todoStorageDir: string = ensureTodoStorageDir(baseDir);
  const todoFileDir = todoDirFor(filePath);
  const todoFilePathDir = posix.join(todoStorageDir, todoFileDir);

  try {
    if (!existingTodos.has(todoFileDir)) {
      existingTodos.set(todoFileDir, new TodoMatcher());
    }

    const matcher = existingTodos.get(todoFileDir);
    const fileNames = readdirSync(todoFilePathDir);

    for (const fileName of fileNames) {
      const todoDatum = readJSONSync(posix.join(todoFilePathDir, fileName));
      matcher?.add(todoDatum);
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      return existingTodos;
    }

    throw error;
  }

  return existingTodos;
}

/**
 * Gets 3 maps containing todo items to add, remove, or those that are stable (not to be modified).
 *
 * @param lintResults - The linting data for all violations.
 * @param existing - Existing todo lint data.
 * @returns - A {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map|Map} of {@link https://github.com/ember-template-lint/ember-template-lint-todo-utils/blob/master/src/types/index.ts#L35|TodoFileHash}/{@link https://github.com/ember-template-lint/ember-template-lint-todo-utils/blob/master/src/types/index.ts#L36|TodoData}.
 */
export function getTodoBatchesSync(
  baseDir: string,
  lintResults: LintResult[],
  existing: Map<TodoFilePathHash, TodoMatcher>,
  options: Partial<WriteTodoOptions>
): TodoBatches {
  const todoBatchGenerator = new TodoBatchGenerator(baseDir, options);
  return todoBatchGenerator.generate(lintResults, existing);
}

/**
 * Applies todo changes, either adding or removing, based on batches from `getTodoBatches`.
 *
 * @param todoStorageDir - The .lint-todo storage directory.
 * @param add - Batch of todos to add.
 * @param remove - Batch of todos to remove.
 */
export function applyTodoChanges(
  todoStorageDir: string,
  add: Map<TodoFileHash, TodoDataV1>,
  remove: Set<TodoFileHash>
): void {
  for (const [fileHash, todoDatum] of add) {
    const { dir } = posix.parse(fileHash);

    ensureDirSync(posix.join(todoStorageDir, dir));
    writeJsonSync(posix.join(todoStorageDir, `${fileHash}.json`), todoDatum);
  }

  for (const fileHash of remove) {
    const { dir } = posix.parse(fileHash);
    const todoDir = posix.join(todoStorageDir, dir);

    unlinkSync(posix.join(todoStorageDir, `${fileHash}.json`));

    if (readdirSync(todoDir).length === 0) {
      rmdirSync(todoDir);
    }
  }
}
