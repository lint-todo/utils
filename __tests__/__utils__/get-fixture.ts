import { readJsonSync } from 'fs-extra';
import { join, resolve } from 'path';
import { updatePaths } from './update-path';
import { ESLint } from 'eslint';
import { TemplateLintResult } from '../../src/types';

export function getFixture<T extends ESLint.LintResult | TemplateLintResult>(fileName: string, tmp: string): T[] {
  const fixture = readJsonSync(
    resolve(join('./__tests__/__fixtures__/', `${fileName}.json`))
  );

  return updatePaths(tmp, fixture.hasOwnProperty('results') ? fixture.results : fixture);
}