import { createHash } from 'crypto';
import { join, parse } from 'path';
import { ensureDir, existsSync, readdir, readJSON, unlink, writeJson } from 'fs-extra';
import { buildTodoData } from './builders';
import { FilePath, LintResult, TodoData } from './types';

export function todoStorageDirExists(baseDir: string): boolean {
  return existsSync(getTodoStorageDirPath(baseDir));
}

/**
 * Creates, or ensures the creation of, the .lint-todo directory.
 *
 * @param baseDir The base directory that contains the .lint-todo storage directory.
 */
export async function ensureTodoStorageDir(baseDir: string): Promise<string> {
  const path = getTodoStorageDirPath(baseDir);

  await ensureDir(path);

  return path;
}

/**
 * @param baseDir The base directory that contains the .lint-todo storage directory.
 */
export function getTodoStorageDirPath(baseDir: string): string {
  return join(baseDir, '.lint-todo');
}

/**
 * Creates a file path from the linting data. Excludes extension.
 *
 * @example
 * 42b8532cff6da75c5e5895a6f33522bf37418d0c/6e3be839
 *
 * @param baseDir The base directory that contains the .lint-todo storage directory.
 * @param todoData The linting data for an individual violation.
 */
export function todoFilePathFor(todoData: TodoData): string {
  return join(todoDirFor(todoData.filePath), todoFileNameFor(todoData));
}

/**
 * Creates a short hash for the todo's file path.
 *
 * @param filePath The filePath from linting data for an individual violation.
 */
export function todoDirFor(filePath: string): string {
  return createHash('sha1').update(filePath).digest('hex');
}

/**
 * Generates a unique filename for a todo lint data.
 *
 * @param todoData The linting data for an individual violation.
 */
export function todoFileNameFor(todoData: TodoData): string {
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
 * @param baseDir The base directory that contains the .lint-todo storage directory.
 * @param lintResults The raw linting data.
 * @param filePath? The relative file path of the file to update violations for.
 */
export async function writeTodos(
  baseDir: string,
  lintResults: LintResult[],
  filePath?: string
): Promise<string> {
  const todoStorageDir: string = await ensureTodoStorageDir(baseDir);
  const existing: Map<FilePath, TodoData> = filePath
    ? await readTodosForFilePath(todoStorageDir, filePath)
    : await readTodos(todoStorageDir);
  const [add, remove] = await getTodoBatches(buildTodoData(baseDir, lintResults), existing);

  await _generateFiles(todoStorageDir, add, remove);

  return todoStorageDir;
}

/**
 * Reads all todo files in the .lint-todo directory.
 *
 * @param todoStorageDir The .lint-todo storage directory.
 */
export async function readTodos(todoStorageDir: string): Promise<Map<FilePath, TodoData>> {
  const map = new Map();
  const todoFileDirs = await readdir(todoStorageDir);

  for (const todoFileDir of todoFileDirs) {
    const fileNames = await readdir(join(todoStorageDir, todoFileDir));

    for (const fileName of fileNames) {
      const todo = await readJSON(join(todoStorageDir, todoFileDir, fileName));
      map.set(join(todoFileDir, parse(fileName).name), todo);
    }
  }

  return map;
}

/**
 * Reads todo files in the .lint-todo directory for a specific filePath.
 *
 * @param todoStorageDir The .lint-todo storage directory.
 * @param filePath The relative file path of the file to return todo items for.
 */
export async function readTodosForFilePath(
  todoStorageDir: string,
  filePath: string
): Promise<Map<FilePath, TodoData>> {
  const map = new Map();
  const todoFileDir = todoDirFor(filePath);
  const todoFilePathDir = join(todoStorageDir, todoFileDir);

  try {
    const fileNames = await readdir(todoFilePathDir);

    for (const fileName of fileNames) {
      const todo = await readJSON(join(todoFilePathDir, fileName));
      map.set(join(todoFileDir, parse(fileName).name), todo);
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
 * @param lintResults The linting data for all violations.
 * @param existing Existing todo lint data.
 */
export async function getTodoBatches(
  lintResults: Map<FilePath, TodoData>,
  existing: Map<FilePath, TodoData>
): Promise<Map<FilePath, TodoData>[]> {
  const add = new Map<FilePath, TodoData>();
  const remove = new Map<FilePath, TodoData>();
  const stable = new Map<FilePath, TodoData>();

  for (const [fileHash, todoDatum] of lintResults) {
    if (!existing.has(fileHash)) {
      add.set(fileHash, todoDatum);
    } else {
      stable.set(fileHash, todoDatum);
    }
  }

  for (const [fileHash, todoDatum] of existing) {
    if (!lintResults.has(fileHash)) {
      remove.set(fileHash, todoDatum);
    } else {
      stable.set(fileHash, todoDatum);
    }
  }

  return [add, remove, stable];
}

async function _generateFiles(
  todoStorageDir: string,
  add: Map<FilePath, TodoData>,
  remove: Map<FilePath, TodoData>
) {
  for (const [fileHash, todoDatum] of add) {
    const { dir } = parse(fileHash);

    await ensureDir(join(todoStorageDir, dir));
    await writeJson(join(todoStorageDir, `${fileHash}.json`), todoDatum);
  }

  for (const [fileHash] of remove) {
    await unlink(join(todoStorageDir, `${fileHash}.json`));
  }
}
