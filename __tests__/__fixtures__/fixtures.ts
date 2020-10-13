import { TemplateLintReport, TemplateLintResult } from '../../src/types';
import { CLIEngine, ESLint } from 'eslint';

import * as eslintWithErrors from './eslint-with-errors.json';
import * as eslintWithWarnings from './eslint-with-warnings.json';
import * as eslintNoResults from './eslint-no-results.json';
import * as emberTemplateLintWithErrors from './ember-template-lint-with-errors.json';
import * as emberTemplateLintWithWarnings from './ember-template-lint-with-warnings.json';
import * as emberTemplateLintNoResults from './ember-template-lint-no-results.json';
import * as singleFileTodo from './single-file-todo.json';
import * as singleFileNoErrors from './single-file-no-errors.json';
import * as singleFileTodoUpdated from './single-file-todo-updated.json';
import { updatePaths } from '../__utils__';

const fixtures = {
  eslintWithErrors: <ESLint.LintResult[]>(
    (<CLIEngine.LintReport>(eslintWithErrors as unknown)).results
  ),
  eslintWithWarnings: <ESLint.LintResult[]>(
    (<CLIEngine.LintReport>(eslintWithWarnings as unknown)).results
  ),
  eslintNoResults: <ESLint.LintResult[]>(
    (<CLIEngine.LintReport>(eslintNoResults as unknown)).results
  ),
  emberTemplateLintWithErrors: <TemplateLintResult[]>(
    (<TemplateLintReport>(emberTemplateLintWithErrors as unknown)).results
  ),
  emberTemplateLintWithWarnings: <TemplateLintResult[]>(
    (<TemplateLintReport>(emberTemplateLintWithWarnings as unknown)).results
  ),
  emberTemplateLintNoResults: <TemplateLintResult[]>(
    (<TemplateLintReport>(emberTemplateLintNoResults as unknown)).results
  ),
  singleFileTodo: <ESLint.LintResult[]>singleFileTodo,
  singleFileNoErrors: <ESLint.LintResult[]>singleFileNoErrors,
  singleFileTodoUpdated: <ESLint.LintResult[]>singleFileTodoUpdated,
};

function deepCopy<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

export default {
  eslintWithErrors(tmp: string): ESLint.LintResult[] {
    return updatePaths(tmp, deepCopy(fixtures.eslintWithErrors));
  },

  eslintWithWarnings(tmp: string): ESLint.LintResult[] {
    return updatePaths(tmp, deepCopy(fixtures.eslintWithWarnings));
  },

  eslintNoResults(tmp: string): ESLint.LintResult[] {
    return updatePaths(tmp, deepCopy(fixtures.eslintNoResults));
  },

  emberTemplateLintWithErrors(tmp: string): TemplateLintResult[] {
    return updatePaths(tmp, deepCopy(fixtures.emberTemplateLintWithErrors));
  },

  emberTemplateLintWithWarnings(tmp: string): TemplateLintResult[] {
    return updatePaths(tmp, deepCopy(fixtures.emberTemplateLintWithWarnings));
  },

  emberTemplateLintNoResults(tmp: string): TemplateLintResult[] {
    return updatePaths(tmp, deepCopy(fixtures.emberTemplateLintNoResults));
  },

  singleFileTodo(tmp: string): ESLint.LintResult[] {
    return updatePaths(tmp, deepCopy(fixtures.singleFileTodo));
  },

  singleFileNoErrors(tmp: string): ESLint.LintResult[] {
    return updatePaths(tmp, deepCopy(fixtures.singleFileNoErrors));
  },

  singleFileTodoUpdated(tmp: string): ESLint.LintResult[] {
    return updatePaths(tmp, deepCopy(fixtures.singleFileTodoUpdated));
  },
};
