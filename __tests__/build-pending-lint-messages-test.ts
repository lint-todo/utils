import { ESLint, Linter } from 'eslint';
import { buildPendingLintMessage, buildPendingLintMessages } from '../src';
import { TemplateLintMessage, TemplateLintResult } from '../src/types';
import fixtures from './__fixtures__/fixtures';

describe('buildPendingLintMessages', () => {
  describe('eslint', () => {
    it('builds a pending lint message from eslint result', () => {
      const eslintResult: ESLint.LintResult = {
        filePath: '/Users/fake/app/controllers/settings.js',
        messages: [
          {
            ruleId: 'no-prototype-builtins',
            severity: 2,
            message: "Do not access Object.prototype method 'hasOwnProperty' from target object.",
            line: 25,
            column: 21,
            nodeType: 'CallExpression',
            messageId: 'prototypeBuildIn',
            endLine: 25,
            endColumn: 35,
          },
        ],
        errorCount: 3,
        warningCount: 0,
        fixableErrorCount: 0,
        fixableWarningCount: 0,
        source: '',
        usedDeprecatedRules: [],
      };

      const eslintMessage: Linter.LintMessage = {
        ruleId: 'no-prototype-builtins',
        severity: 2,
        message: "Do not access Object.prototype method 'hasOwnProperty' from target object.",
        line: 25,
        column: 21,
        nodeType: 'CallExpression',
        messageId: 'prototypeBuildIn',
        endLine: 25,
        endColumn: 35,
      };

      const pendingLintMessage = buildPendingLintMessage(eslintResult, eslintMessage);

      expect(pendingLintMessage).toEqual(
        expect.objectContaining({
          engine: 'eslint',
          filePath: '/Users/fake/app/controllers/settings.js',
          ruleId: 'no-prototype-builtins',
          line: 25,
          column: 21,
        })
      );
    });

    it('can build pending lint messages from results', () => {
      const pendingLintMessages = buildPendingLintMessages(fixtures.eslintWithErrors);

      expect(pendingLintMessages).toHaveLength(18);
    });

    it('can returns empty array with only warnings', () => {
      const pendingLintMessages = buildPendingLintMessages(fixtures.eslintWithWarnings);

      expect(pendingLintMessages).toHaveLength(0);
    });

    it('can returns empty array with no results', () => {
      const pendingLintMessages = buildPendingLintMessages(fixtures.eslintNoResults);

      expect(pendingLintMessages).toHaveLength(0);
    });
  });

  describe('ember-template-lint', () => {
    it('builds a pending lint message from eslint result', () => {
      const emberTemplateLintResult: TemplateLintResult = {
        messages: [
          {
            rule: 'require-input-label',
            severity: 2,
            moduleId: '/Users/fake/app/templates/components/add-ssh-key.hbs',
            message: 'Input elements require a valid associated label.',
            line: 3,
            column: 4,
            source: '',
          },
        ],
        errorCount: 2,
        filePath: '/Users/fake/app/templates/components/add-ssh-key.hbs',
        source: '',
      };

      const emberTemplateLintMessage: TemplateLintMessage = {
        rule: 'require-input-label',
        severity: 2,
        moduleId: '/Users/fake/app/templates/components/add-ssh-key.hbs',
        message: 'Input elements require a valid associated label.',
        line: 3,
        column: 4,
        source: '',
      };

      const pendingLintMessage = buildPendingLintMessage(
        emberTemplateLintResult,
        emberTemplateLintMessage
      );
      debugger;
      expect(pendingLintMessage).toEqual(
        expect.objectContaining({
          engine: 'ember-template-lint',
          filePath: '/Users/fake/app/templates/components/add-ssh-key.hbs',
          ruleId: 'require-input-label',
          line: 3,
          column: 4,
        })
      );
    });

    it('can build pending lint messages from results', () => {
      const pendingLintMessages = buildPendingLintMessages(fixtures.emberTemplateLintWithErrors);

      expect(pendingLintMessages).toHaveLength(39);
    });

    it('can returns empty array with only warnings', () => {
      const pendingLintMessages = buildPendingLintMessages(fixtures.emberTemplateLintWithWarnings);

      expect(pendingLintMessages).toHaveLength(0);
    });

    it('can returns empty array with no results', () => {
      const pendingLintMessages = buildPendingLintMessages(fixtures.emberTemplateLintNoResults);

      expect(pendingLintMessages).toHaveLength(0);
    });
  });
});
