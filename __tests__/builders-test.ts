import { ESLint, Linter } from 'eslint';
import { _buildTodoDatum, buildTodoData } from '../src';
import { TemplateLintMessage, TemplateLintResult } from '../src/types';
import fixtures from './__fixtures__/fixtures';

describe('builders', () => {
  describe('eslint', () => {
    it('builds a todo from eslint result', () => {
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

      const todoDatum = _buildTodoDatum(eslintResult, eslintMessage);

      expect(todoDatum).toEqual(
        expect.objectContaining({
          engine: 'eslint',
          filePath: '/Users/fake/app/controllers/settings.js',
          ruleId: 'no-prototype-builtins',
          line: 25,
          column: 21,
        })
      );
    });

    it('can build todo data from results', () => {
      const todoData = buildTodoData(fixtures.eslintWithErrors);

      expect(todoData.size).toEqual(18);
    });

    it('can returns empty array with only warnings', () => {
      const todoData = buildTodoData(fixtures.eslintWithWarnings);

      expect(todoData.size).toEqual(0);
    });

    it('can returns empty array with no results', () => {
      const todoData = buildTodoData(fixtures.eslintNoResults);

      expect(todoData.size).toEqual(0);
    });
  });

  describe('ember-template-lint', () => {
    it('builds a todo from eslint result', () => {
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

      const todoDatum = _buildTodoDatum(emberTemplateLintResult, emberTemplateLintMessage);

      expect(todoDatum).toEqual(
        expect.objectContaining({
          engine: 'ember-template-lint',
          filePath: '/Users/fake/app/templates/components/add-ssh-key.hbs',
          ruleId: 'require-input-label',
          line: 3,
          column: 4,
        })
      );
    });

    it('can build todo data from results', () => {
      const todoData = buildTodoData(fixtures.emberTemplateLintWithErrors);

      expect(todoData.size).toEqual(39);
    });

    it('can returns empty array with only warnings', () => {
      const todoData = buildTodoData(fixtures.emberTemplateLintWithWarnings);

      expect(todoData.size).toEqual(0);
    });

    it('can returns empty array with no results', () => {
      const todoData = buildTodoData(fixtures.emberTemplateLintNoResults);

      expect(todoData.size).toEqual(0);
    });
  });
});
