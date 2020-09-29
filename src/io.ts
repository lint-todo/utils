import { createHash } from 'crypto';
import { join, parse } from 'path';
import { ensureDir, readdir, unlink, writeFile } from 'fs-extra';
import { PendingLintMessage } from './types';

export async function ensurePendingDir(baseDir: string): Promise<string> {
  const path = join(baseDir, '.lint-pending');

  await ensureDir(path);

  return path;
}

export function generateFileName(pendingLintMessage: PendingLintMessage): string {
  const hashParams = `${pendingLintMessage.filePath}${pendingLintMessage.line}${pendingLintMessage.column}`;

  return createHash('sha1').update(hashParams).digest('hex');
}

export async function generatePendingFiles(
  baseDir: string,
  pendingLintMessages: PendingLintMessage[]
): Promise<string> {
  const path: string = await ensurePendingDir(baseDir);

  const pendingLintMessagesMap = pendingLintMessages.reduce(
    (map: Map<string, PendingLintMessage>, currentLintMessage: PendingLintMessage) => {
      const fileName = generateFileName(currentLintMessage);

      map.set(fileName, currentLintMessage);

      return map;
    },
    new Map()
  );

  const existingPendingItemFilenames = new Set(
    (await readdir(path)).map((fileName: string) => parse(fileName).name)
  );

  const pendingFileNamesToWrite = new Set(
    [...pendingLintMessagesMap.keys()].filter(
      (fileName) => !existingPendingItemFilenames.has(fileName)
    )
  );

  for (const fileName of pendingFileNamesToWrite) {
    const pendingLintMessage = pendingLintMessagesMap.get(fileName);

    if (pendingLintMessage) {
      // eslint-disable-next-line unicorn/no-null
      await writeFile(join(path, `${fileName}.json`), JSON.stringify(pendingLintMessage, null, 2));
    }
  }

  const pendingFileNamesToDelete = new Set(
    [...existingPendingItemFilenames].filter(
      (fileName) => !new Set(pendingLintMessagesMap.keys()).has(fileName)
    )
  );

  for (const fileName of pendingFileNamesToDelete) {
    await unlink(join(path, `${fileName}.json`));
  }

  return path;
}
