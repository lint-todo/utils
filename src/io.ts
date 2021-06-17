/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { createHash } from 'crypto';
import { posix } from 'path';
import {
  ensureDir,
  existsSync,
  readdir,
  readJSON,
  unlink,
  writeJson,
  ensureDirSync,
  readdirSync,
  readJSONSync,
  writeJsonSync,
  unlinkSync,
  rmdirSync,
  rmdir,
} from 'fs-extra';
import { buildTodoData } from './builders';
import { FilePath, LintResult, TodoData, TodoBatchCounts, WriteTodoOptions } from './types';
import { isExpired } from './date-utils';
// import { isFuzzyMatch } from './match-utils';

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
export function ensureTodoStorageDirSync(baseDir: string): string {
  const path = getTodoStorageDirPath(baseDir);

  ensureDirSync(path);

  return path;
}

/**
 * Creates, or ensures the creation of, the .lint-todo directory.
 *
 * @param baseDir - The base directory that contains the .lint-todo storage directory.
 * @returns - A promise that resolves to the todo storage directory path.
 */
export async function ensureTodoStorageDir(baseDir: string): Promise<string> {
  const path = getTodoStorageDirPath(baseDir);

  await ensureDir(path);

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
export function todoFilePathFor(todoData: TodoData): string {
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
export function todoFileNameFor(todoData: TodoData): string {
  const hashParams = `${todoData.engine}${todoData.ruleId}${todoData.line}${todoData.column}`;

  return createHash('sha256').update(hashParams).digest('hex').slice(0, 8);
}

/**
 * Generates a unique hash for the filename for a todo lint data based on the violation source.
 *
 * @param todoData - The linting data for an individual violation.
 * @returns  - The todo file name for a {@link https://github.com/ember-template-lint/ember-template-lint-todo-utils/blob/master/src/types/index.ts#L36|TodoData} object (based on the source, not the line and column).
 */

export function todoFileNameForSource(todoData: TodoData): string {
  const hashParams = `${todoData.engine}${todoData.ruleId}${todoData.source}`;
  console.log(`${todoData.source}`);
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
export function writeTodosSync(
  baseDir: string,
  lintResults: LintResult[],
  options?: Partial<WriteTodoOptions>
): TodoBatchCounts {
  options = Object.assign({ shouldRemove: () => true }, options ?? {});

  const todoStorageDir: string = ensureTodoStorageDirSync(baseDir);
  const existing: Map<FilePath, TodoData> = options.filePath
    ? readTodosForFilePathSync(baseDir, options.filePath)
    : readTodosSync(baseDir);
  // eslint-disable-next-line prefer-const
  let [add, remove] = getTodoBatchesSync(
    buildTodoData(baseDir, lintResults, options.todoConfig),
    existing,
    options
  );

  applyTodoChangesSync(todoStorageDir, add, remove);

  return [add.size, remove.size];
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
 * @returns - A promise that resolves to the counts of added and removed todos.
 */
export async function writeTodos(
  baseDir: string,
  lintResults: LintResult[],
  options?: Partial<WriteTodoOptions>
): Promise<TodoBatchCounts> {
  options = Object.assign({ shouldRemove: () => true }, options ?? {});

  const todoStorageDir: string = await ensureTodoStorageDir(baseDir);
  const existing: Map<FilePath, TodoData> = options.filePath
    ? await readTodosForFilePath(baseDir, options.filePath)
    : await readTodos(baseDir);
  // eslint-disable-next-line prefer-const
  let [add, remove] = await getTodoBatches(
    buildTodoData(baseDir, lintResults, options.todoConfig),
    existing,
    options
  );

  await applyTodoChanges(todoStorageDir, add, remove);

  return [add.size, remove.size];
}

/**
 * Reads all todo files in the .lint-todo directory.
 *
 * @param baseDir - The base directory that contains the .lint-todo storage directory.
 * @returns - A {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map|Map} of {@link https://github.com/ember-template-lint/ember-template-lint-todo-utils/blob/master/src/types/index.ts#L35|FilePath}/{@link https://github.com/ember-template-lint/ember-template-lint-todo-utils/blob/master/src/types/index.ts#L36|TodoData}.
 */
export function readTodosSync(baseDir: string): Map<FilePath, TodoData> {
  const map = new Map();
  const todoStorageDir: string = ensureTodoStorageDirSync(baseDir);
  const todoFileDirs = readdirSync(todoStorageDir);

  for (const todoFileDir of todoFileDirs) {
    const fileNames = readdirSync(posix.join(todoStorageDir, todoFileDir));

    for (const fileName of fileNames) {
      const todo = readJSONSync(posix.join(todoStorageDir, todoFileDir, fileName));
      map.set(posix.join(todoFileDir, posix.parse(fileName).name), todo);
    }
  }

  return map;
}

/**
 * Reads all todo files in the .lint-todo directory.
 *
 * @param baseDir - The base directory that contains the .lint-todo storage directory.
 * @returns - A Promise that resolves to a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map|Map} of {@link https://github.com/ember-template-lint/ember-template-lint-todo-utils/blob/master/src/types/index.ts#L35|FilePath}/{@link https://github.com/ember-template-lint/ember-template-lint-todo-utils/blob/master/src/types/index.ts#L36|TodoData}.
 */
export async function readTodos(baseDir: string): Promise<Map<FilePath, TodoData>> {
  const map = new Map();
  const todoStorageDir: string = await ensureTodoStorageDir(baseDir);
  const todoFileDirs = await readdir(todoStorageDir);

  for (const todoFileDir of todoFileDirs) {
    const fileNames = await readdir(posix.join(todoStorageDir, todoFileDir));

    for (const fileName of fileNames) {
      const todo = await readJSON(posix.join(todoStorageDir, todoFileDir, fileName));
      map.set(posix.join(todoFileDir, posix.parse(fileName).name), todo);
    }
  }

  return map;
}

/**
 * Reads todo files in the .lint-todo directory for a specific filePath.
 *
 * @param todoStorageDir - The .lint-todo storage directory.
 * @param filePath - The relative file path of the file to return todo items for.
 * @returns - A {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map|Map} of {@link https://github.com/ember-template-lint/ember-template-lint-todo-utils/blob/master/src/types/index.ts#L35|FilePath}/{@link https://github.com/ember-template-lint/ember-template-lint-todo-utils/blob/master/src/types/index.ts#L36|TodoData}.
 */
export function readTodosForFilePathSync(
  baseDir: string,
  filePath: string
): Map<FilePath, TodoData> {
  const map = new Map();
  const todoStorageDir: string = ensureTodoStorageDirSync(baseDir);
  const todoFileDir = todoDirFor(filePath);
  const todoFilePathDir = posix.join(todoStorageDir, todoFileDir);

  try {
    const fileNames = readdirSync(todoFilePathDir);

    for (const fileName of fileNames) {
      const todo = readJSONSync(posix.join(todoFilePathDir, fileName));
      map.set(posix.join(todoFileDir, posix.parse(fileName).name), todo);
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      return map;
    }

    throw error;
  }

  return map;
}

/**
 * Reads todo files in the .lint-todo directory for a specific filePath.
 *
 * @param todoStorageDir - The .lint-todo storage directory.
 * @param filePath - The relative file path of the file to return todo items for.
 * @returns - A Promise that resolves to a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map|Map} of {@link https://github.com/ember-template-lint/ember-template-lint-todo-utils/blob/master/src/types/index.ts#L35|FilePath}/{@link https://github.com/ember-template-lint/ember-template-lint-todo-utils/blob/master/src/types/index.ts#L36|TodoData}.
 */
export async function readTodosForFilePath(
  baseDir: string,
  filePath: string
): Promise<Map<FilePath, TodoData>> {
  const map = new Map();
  const todoStorageDir: string = await ensureTodoStorageDir(baseDir);
  const todoFileDir = todoDirFor(filePath);
  const todoFilePathDir = posix.join(todoStorageDir, todoFileDir);

  try {
    const fileNames = await readdir(todoFilePathDir);

    for (const fileName of fileNames) {
      const todo = await readJSON(posix.join(todoFilePathDir, fileName));
      map.set(posix.join(todoFileDir, posix.parse(fileName).name), todo);
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      return map;
    }

    throw error;
  }

  return map;
}

/**
 * Gets 3 maps containing todo items to add, remove, or those that are stable (not to be modified).
 *
 * @param lintResults - The linting data for all violations.
 * @param existing - Existing todo lint data.
 * @returns - A {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map|Map} of {@link https://github.com/ember-template-lint/ember-template-lint-todo-utils/blob/master/src/types/index.ts#L35|FilePath}/{@link https://github.com/ember-template-lint/ember-template-lint-todo-utils/blob/master/src/types/index.ts#L36|TodoData}.
 */
export function getTodoBatchesSync(
  lintResults: Map<FilePath, TodoData>,
  existing: Map<FilePath, TodoData>,
  options: Partial<WriteTodoOptions>
): Map<FilePath, TodoData>[] {
  const add = new Map<FilePath, TodoData>();
  const remove = new Map<FilePath, TodoData>();
  const expired = new Map<FilePath, TodoData>();
  const stable = new Map<FilePath, TodoData>();

  for (const [fileHash, todoDatum] of lintResults) {
    if (!existing.has(fileHash)) {
      add.set(fileHash, todoDatum);
    } else {
      const existingTodo = existing.get(fileHash);
      if (existingTodo && !isExpired(existingTodo.errorDate)) {
        stable.set(fileHash, todoDatum);
      }
    }
  }

  for (const [fileHash, todoDatum] of existing) {
    if (
      lintResults.has(fileHash) &&
      isExpired(todoDatum.errorDate) &&
      options.shouldRemove!(todoDatum)
    ) {
      expired.set(fileHash, todoDatum);
    } else if (
      !lintResults.has(fileHash) &&
      options.shouldRemove!(todoDatum)
      ) {
      remove.set(fileHash, todoDatum);
    } else {
      stable.set(fileHash, todoDatum);
    }
  }

  return [add, remove, stable, expired];
}

/**
 * Gets 3 maps containing todo items to add, remove, or those that are stable (not to be modified).
 *
 * @param lintResults - The linting data for all violations.
 * @param existing - Existing todo lint data.
 * @returns - A Promise that resolves to a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map|Map} of {@link https://github.com/ember-template-lint/ember-template-lint-todo-utils/blob/master/src/types/index.ts#L35|FilePath}/{@link https://github.com/ember-template-lint/ember-template-lint-todo-utils/blob/master/src/types/index.ts#L36|TodoData}.
 */
export async function getTodoBatches(
  lintResults: Map<FilePath, TodoData>,
  existing: Map<FilePath, TodoData>,
  options: Partial<WriteTodoOptions>
): Promise<Map<FilePath, TodoData>[]> {
  const add = new Map<FilePath, TodoData>();
  const remove = new Map<FilePath, TodoData>();
  const expired = new Map<FilePath, TodoData>();
  const stable = new Map<FilePath, TodoData>();

  // These lintResults aren't todo data yet
  // but we convert to todo data in order to compare
  // we put lintResults into `stable` without changing lintResults to todo data
  for (const [fileHash, todoDatum] of lintResults) {
    const existingTodo = existing.get(fileHash);

    if (
      existingTodo &&
      !isExpired(existingTodo.errorDate)
      // isFuzzyMatch(lintResults, existing)
      ) {
        stable.set(fileHash, todoDatum);
    } else if (
      !existing.has(fileHash)
      // !isFuzzyMatch(todoDatum)
      ) {
        add.set(fileHash, todoDatum);
    } else {
      console.log(`a condition is falling through the cracks for add/stable`);
    }
  }

  for (const [fileHash, todoDatum] of existing) {
    if (
      lintResults.has(fileHash) &&
      isExpired(todoDatum.errorDate) &&
      options.shouldRemove!(todoDatum)
      ) {
        expired.set(fileHash, todoDatum)
      } else if (
        (options.shouldRemove!(todoDatum) && lintResults.has(fileHash))
        // ||
        // (options.shouldRemove!(todoDatum) && isFuzzyMatch(todoDatum))
      ) {
        stable.set(fileHash, todoDatum)
      } else if (
        !lintResults.has(fileHash) &&
        // !isFuzzyMatch(todoDatum) &&
        options.shouldRemove!(todoDatum)
      ) {
        remove.set(fileHash, todoDatum);
    } else {
      console.log(`A condition is falling through the cracks for expired/remove/stable`)
    }
  }

  return [add, remove, stable, expired];
}

/**
 * Applies todo changes, either adding or removing, based on batches from `getTodoBatches`.
 *
 * @param todoStorageDir - The .lint-todo storage directory.
 * @param add - Batch of todos to add.
 * @param remove - Batch of todos to remove.
 */
export function applyTodoChangesSync(
  todoStorageDir: string,
  add: Map<FilePath, TodoData>,
  remove: Map<FilePath, TodoData>
): void {
  for (const [fileHash, todoDatum] of add) {
    const { dir } = posix.parse(fileHash);

    ensureDirSync(posix.join(todoStorageDir, dir));
    writeJsonSync(posix.join(todoStorageDir, `${fileHash}.json`), todoDatum);
  }

  for (const [fileHash] of remove) {
    const { dir } = posix.parse(fileHash);
    const todoDir = posix.join(todoStorageDir, dir);

    unlinkSync(posix.join(todoStorageDir, `${fileHash}.json`));

    if (readdirSync(todoDir).length === 0) {
      rmdirSync(todoDir);
    }
  }
}

/**
 * Applies todo changes, either adding or removing, based on batches from `getTodoBatches`.
 *
 * @param todoStorageDir - The .lint-todo storage directory.
 * @param add - Batch of todos to add.
 * @param remove - Batch of todos to remove.
 */
export async function applyTodoChanges(
  todoStorageDir: string,
  add: Map<FilePath, TodoData>,
  remove: Map<FilePath, TodoData>
): Promise<void> {
  for (const [fileHash, todoDatum] of add) {
    const { dir } = posix.parse(fileHash);

    await ensureDir(posix.join(todoStorageDir, dir));
    await writeJson(posix.join(todoStorageDir, `${fileHash}.json`), todoDatum);
  }

  for (const [fileHash] of remove) {
    const { dir } = posix.parse(fileHash);
    const todoDir = posix.join(todoStorageDir, dir);

    await unlink(posix.join(todoStorageDir, `${fileHash}.json`));

    if ((await readdir(todoDir)).length === 0) {
      await rmdir(todoDir);
    }
  }
}
