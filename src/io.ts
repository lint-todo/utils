import { createHash } from 'crypto';
import { join, parse } from 'path';
import { ensureDir, readdir, readJSON, unlink, writeFile } from 'fs-extra';
import { LintResult, TodoData } from './types';
import { buildTodoData } from './builders';

/**
 * Creates, or ensures the creation of, the .lint-todo directory.
 *
 * @param baseDir The base directory that contains the .lint-todo storage directory.
 */
export async function ensureTodoDir(baseDir: string): Promise<string> {
  const path = getTodoDirPath(baseDir);

  await ensureDir(path);

  return path;
}

export function getTodoDirPath(baseDir: string): string {
  return join(baseDir, '.lint-todo');
}

/**
 * Generates a unique filename for a todo lint data.
 *
 * @param todoData The linting data for an individual violation.
 */
export function generateFileName(todoData: TodoData): string {
  const hashParams = `${todoData.engine}${todoData.filePath}${todoData.ruleId}${todoData.line}${todoData.column}`;

  return createHash('sha1').update(hashParams).digest('hex');
}

/**
 * Generates files for todo lint violations. One file is generated for each violation, using a generated
 * hash to identify each.
 *
 * Given a list of todo lint violations, this function will also delete existing files that no longer
 * have a todo lint violation.
 *
 * @param baseDir The base directory that contains the .lint-todo storage directory.
 * @param lintResults The raw linting data.
 * @param filePath? The absolute file path of the file to update violations for.
 */
export async function generateTodoFiles(
  baseDir: string,
  lintResults: LintResult[],
  filePath?: string
): Promise<string> {
  const todoDir: string = await ensureTodoDir(baseDir);

  const existing: Map<string, TodoData> = await readTodoFiles(todoDir, filePath);

  const [add, remove] = await getTodoBatches(buildTodoData(lintResults), existing);

  await _generateFiles(baseDir, add, remove);

  return todoDir;
}

/**
 * Reads all todo files in the .lint-todo directory.
 *
 * @param todoDir The .lint-todo storage directory.
 * @param filePath? The absolute file path of the file to return todo items for.
 */
export async function readTodoFiles(
  todoDir: string,
  filePath?: string
): Promise<Map<string, TodoData>> {
  const fileNames = await readdir(todoDir);

  const map = new Map();
  for (const fileName of fileNames) {
    const todoDatum = await readJSON(join(todoDir, fileName));

    if (filePath && todoDatum.filePath !== filePath) {
      continue;
    }
    map.set(parse(fileName).name, todoDatum);
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
  lintResults: Map<string, TodoData>,
  existing: Map<string, TodoData>
): Promise<Map<string, TodoData>[]> {
  const add = new Map<string, TodoData>();
  const remove = new Map<string, TodoData>();
  const stable = new Map<string, TodoData>();

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
  baseDir: string,
  add: Map<string, TodoData>,
  remove: Map<string, TodoData>
) {
  const path = getTodoDirPath(baseDir);

  for (const [fileHash, todoDatum] of add) {
    // eslint-disable-next-line unicorn/no-null
    await writeFile(join(path, `${fileHash}.json`), JSON.stringify(todoDatum, null, 2));
  }

  for (const [fileHash] of remove) {
    await unlink(join(path, `${fileHash}.json`));
  }
}
