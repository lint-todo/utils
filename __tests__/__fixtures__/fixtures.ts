import { PendingLintMessage, TemplateLintReport, TemplateLintResult } from '../../src/types';
import { CLIEngine, ESLint } from 'eslint';

import * as eslintWithErrors from './eslint-with-errors.json';
import * as eslintWithWarnings from './eslint-with-warnings.json';
import * as eslintNoResults from './eslint-no-results.json';
import * as emberTemplateLintWithErrors from './ember-template-lint-with-errors.json';
import * as emberTemplateLintWithWarnings from './ember-template-lint-with-warnings.json';
import * as emberTemplateLintNoResults from './ember-template-lint-no-results.json';
import * as pending from './pending.json';
import * as singleFilePending from './single-file-pending.json';
import * as singleFilePendingUpdated from './single-file-pending-updated.json';

export default {
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
  pending: <PendingLintMessage[]>pending,
  singleFilePending: <PendingLintMessage[]>singleFilePending,
  singleFilePendingUpdated: <PendingLintMessage[]>singleFilePendingUpdated,
};
