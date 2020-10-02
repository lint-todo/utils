import { createHash } from 'crypto';
import { join, parse } from 'path';
import { ensureDir, readdir, readJSON, unlink, writeFile } from 'fs-extra';
import { PendingLintMessage } from './types';
import { buildPendingLintMessagesMap } from './builders';

/**
 * Creates, or ensures the creation of, the .lint-pending directory.
 *
 * @param baseDir The base directory that contains the .lint-pending storage directory.
 */
export async function ensurePendingDir(baseDir: string): Promise<string> {
  const path = getPendingDirPath(baseDir);

  await ensureDir(path);

  return path;
}

export function getPendingDirPath(baseDir: string): string {
  return join(baseDir, '.lint-pending');
}

/**
 * Generates a unique filename for a pending lint message.
 *
 * @param pendingLintMessage The linting data for an individual violation.
 */
export function generateFileName(pendingLintMessage: PendingLintMessage): string {
  const hashParams = `${pendingLintMessage.engine}${pendingLintMessage.filePath}${pendingLintMessage.ruleId}${pendingLintMessage.line}${pendingLintMessage.column}`;

  return createHash('sha1').update(hashParams).digest('hex');
}

/**
 * Generates files for pending lint violations. One file is generated for each violation, using a generated
 * hash to identify each.
 *
 * Given a list of pending lint violations, this function will also delete existing files that no longer
 * have a pending lint violation.
 *
 * @param baseDir The base directory that contains the .lint-pending storage directory.
 * @param pendingLintMessages The linting data for all violations.
 * @param filePath? The absolute file path of the file to update violations for.
 */
export async function generatePendingFiles(
  baseDir: string,
  pendingLintMessages: PendingLintMessage[],
  filePath?: string
): Promise<string> {
  const pendingDir: string = await ensurePendingDir(baseDir);

  const existing: Map<string, PendingLintMessage> = await readPendingFiles(pendingDir, filePath);

  const [add, remove] = await getPendingBatches(
    buildPendingLintMessagesMap(pendingLintMessages),
    existing
  );

  await _generateFiles(baseDir, add, remove);

  return pendingDir;
}

/**
 * Reads all pending files in the .lint-pending directory.
 *
 * @param baseDir The base directory that contains the .lint-pending storage directory.
 * @param filePath? The absolute file path of the file to return pending items for.
 */
export async function readPendingFiles(
  pendingDir: string,
  filePath?: string
): Promise<Map<string, PendingLintMessage>> {
  const fileNames = await readdir(pendingDir);

  const map = new Map();
  for (const fileName of fileNames) {
    const pendingLintMessage = await readJSON(join(pendingDir, fileName));

    if (filePath && pendingLintMessage.filePath !== filePath) {
      continue;
    }
    map.set(parse(fileName).name, pendingLintMessage);
  }

  return map;
}

/**
 * Gets 3 maps containing pending items to add, remove, or those that are stable (not to be modified).
 *
 * @param lintResults The linting data for all violations.
 * @param existing Existing pending lint data.
 */
export async function getPendingBatches(
  lintResults: Map<string, PendingLintMessage>,
  existing: Map<string, PendingLintMessage>
): Promise<Map<string, PendingLintMessage>[]> {
  const add = new Map<string, PendingLintMessage>();
  const remove = new Map<string, PendingLintMessage>();
  const stable = new Map<string, PendingLintMessage>();

  for (const [fileHash, pendingLintMessage] of lintResults) {
    if (!existing.has(fileHash)) {
      add.set(fileHash, pendingLintMessage);
    } else {
      stable.set(fileHash, pendingLintMessage);
    }
  }

  for (const [fileHash, pendingLintMessage] of existing) {
    if (!lintResults.has(fileHash)) {
      remove.set(fileHash, pendingLintMessage);
    } else {
      stable.set(fileHash, pendingLintMessage);
    }
  }

  return [add, remove, stable];
}

async function _generateFiles(
  baseDir: string,
  add: Map<string, PendingLintMessage>,
  remove: Map<string, PendingLintMessage>
) {
  const path = getPendingDirPath(baseDir);

  for (const [fileHash, pendingLintMessage] of add) {
    // eslint-disable-next-line unicorn/no-null
    await writeFile(join(path, `${fileHash}.json`), JSON.stringify(pendingLintMessage, null, 2));
  }

  for (const [fileHash] of remove) {
    await unlink(join(path, `${fileHash}.json`));
  }
}
