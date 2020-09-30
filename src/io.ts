import { createHash } from 'crypto';
import { join, parse } from 'path';
import { ensureDir, readdir, readJSON, unlink, writeFile } from 'fs-extra';
import { PendingLintMessage } from './types';
import { difference } from 'extra-set';

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
  const hashParams = `${pendingLintMessage.filePath}${pendingLintMessage.line}${pendingLintMessage.column}`;

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
 */
export async function generatePendingFiles(
  baseDir: string,
  pendingLintMessages: PendingLintMessage[]
): Promise<string> {
  const path: string = await ensurePendingDir(baseDir);

  const existingPendingItemFilenames = new Set(
    (await readdir(path)).map((fileName: string) => parse(fileName).name)
  );

  await _generateFiles(baseDir, pendingLintMessages, existingPendingItemFilenames);

  return path;
}

/**
 * Updates violations for a single file.
 *
 * @param baseDir The base directory that contains the .lint-pending storage directory.
 * @param filePath The absolute file path of the file to update violations for.
 * @param pendingLintMessages The linting data for all violations.
 */
export async function updatePendingForFile(
  baseDir: string,
  filePath: string,
  pendingLintMessages: PendingLintMessage[]
): Promise<string> {
  const path: string = await ensurePendingDir(baseDir);

  const pendingLintFiles: PendingLintMessage[] = await readPendingFiles(baseDir);

  const existingPendingItemFilenames = new Set(
    pendingLintFiles
      .filter((pendingFile) => pendingFile.filePath === filePath)
      .map((pendingLintMessage: PendingLintMessage) => generateFileName(pendingLintMessage))
  );

  await _generateFiles(baseDir, pendingLintMessages, existingPendingItemFilenames);

  return path;
}

/**
 * Reads all pending files in the .lint-pending directory.
 *
 * @param baseDir The base directory that contains the .lint-pending storage directory.
 */
async function readPendingFiles(baseDir: string): Promise<PendingLintMessage[]> {
  const pendingDir = getPendingDirPath(baseDir);
  const fileNames = await readdir(pendingDir);

  return await Promise.all(
    fileNames.map(async (fileName: string) => {
      return await readJSON(join(pendingDir, fileName));
    })
  );
}

async function _generateFiles(
  baseDir: string,
  pendingLintMessages: PendingLintMessage[],
  existingPendingItemFilenames: Set<string>
) {
  const path = getPendingDirPath(baseDir);

  const pendingLintMessagesMap = pendingLintMessages.reduce(
    (map: Map<string, PendingLintMessage>, currentLintMessage: PendingLintMessage) => {
      const fileName = generateFileName(currentLintMessage);

      map.set(fileName, currentLintMessage);

      return map;
    },
    new Map()
  );

  const pendingFileNamesToWrite = difference(
    new Set(pendingLintMessagesMap.keys()),
    existingPendingItemFilenames
  );

  const pendingFileNamesToDelete = difference(
    existingPendingItemFilenames,
    new Set(pendingLintMessagesMap.keys())
  );

  for (const fileName of pendingFileNamesToWrite) {
    const pendingLintMessage = pendingLintMessagesMap.get(fileName);

    if (pendingLintMessage) {
      // eslint-disable-next-line unicorn/no-null
      await writeFile(join(path, `${fileName}.json`), JSON.stringify(pendingLintMessage, null, 2));
    }
  }

  for (const fileName of pendingFileNamesToDelete) {
    await unlink(join(path, `${fileName}.json`));
  }
}
