import { realpathSync } from 'node:fs';

import tmp = require('tmp');

export function createTmpDir(): string {
  return realpathSync(tmp.dirSync({ unsafeCleanup: true }).name);
}
