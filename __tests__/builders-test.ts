/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { ESLint, Linter } from 'eslint';
import { differenceInDays } from 'date-fns'
import { _buildTodoDatum, buildTodoData } from '../src';
import { TemplateLintMessage, TemplateLintResult, TodoData } from '../src/types';
import fixtures from './__fixtures__/fixtures';
import { createTmpDir } from './__utils__/tmp-dir';
import { updatePath } from './__utils__/update-path';

describe('builders', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = createTmpDir();
  });

  describe('eslint', () => {
    it('builds a todo from eslint result', () => {
      const eslintResult: ESLint.LintResult = updatePath(tmp, {
        filePath: '{{path}}/app/controllers/settings.js',
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
      });

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

      const todoDatum = _buildTodoDatum(tmp, eslintResult, eslintMessage);

      expect(todoDatum).toEqual(
        expect.objectContaining({
          engine: 'eslint',
          filePath: 'app/controllers/settings.js',
          ruleId: 'no-prototype-builtins',
          line: 25,
          column: 21,
        })
      );
    });

    it('can build todo data from results', () => {
      const todoData = buildTodoData(tmp, fixtures.eslintWithErrors(tmp));

      expect(todoData.size).toEqual(18);
    });

    it('can returns empty array with only warnings', () => {
      const todoData = buildTodoData(tmp, fixtures.eslintWithWarnings(tmp));

      expect(todoData.size).toEqual(0);
    });

    it('can returns empty array with no results', () => {
      const todoData = buildTodoData(tmp, fixtures.eslintNoResults(tmp));

      expect(todoData.size).toEqual(0);
    });

    it('can build todo data from results with days to decay warn only', () => {
      const todoData = buildTodoData(tmp, fixtures.eslintSingleError(tmp), { warn: 30 });
      const todoDatum: TodoData = todoData.values().next().value;

      expect(differenceInDays(todoDatum.warnDate!, todoDatum.createdDate)).toEqual(30);
    });

    it('can build todo data from results with days to decay error only', () => {
      const todoData = buildTodoData(tmp, fixtures.eslintSingleError(tmp), { error: 30 });
      const todoDatum: TodoData = todoData.values().next().value;

      expect(differenceInDays(todoDatum.errorDate!, todoDatum.createdDate)).toEqual(30);
    });

    it('can build todo data from results with days to decay warn and error', () => {
      const todoData = buildTodoData(tmp, fixtures.eslintSingleError(tmp), { warn: 30, error: 60 });
      const todoDatum: TodoData = todoData.values().next().value;

      expect(differenceInDays(todoDatum.warnDate!, todoDatum.createdDate)).toEqual(30);
      expect(differenceInDays(todoDatum.errorDate!, todoDatum.createdDate)).toEqual(60);
    });
  });

  describe('ember-template-lint', () => {
    it('builds a todo from ember-template-lint result', () => {
      const emberTemplateLintResult: TemplateLintResult = updatePath(tmp, {
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
        filePath: '{{path}}/app/templates/components/add-ssh-key.hbs',
        source: '',
      });

      const emberTemplateLintMessage: TemplateLintMessage = {
        rule: 'require-input-label',
        severity: 2,
        moduleId: '/Users/fake/app/templates/components/add-ssh-key.hbs',
        message: 'Input elements require a valid associated label.',
        line: 3,
        column: 4,
        source: '',
      };

      const todoDatum = _buildTodoDatum(tmp, emberTemplateLintResult, emberTemplateLintMessage);

      expect(todoDatum).toEqual(
        expect.objectContaining({
          engine: 'ember-template-lint',
          filePath: 'app/templates/components/add-ssh-key.hbs',
          ruleId: 'require-input-label',
          line: 3,
          column: 4,
        })
      );
    });

    it('can build todo data from results', () => {
      const todoData = buildTodoData(tmp, fixtures.emberTemplateLintWithErrors(tmp));

      expect(todoData.size).toEqual(39);
    });

    it('can returns empty array with only warnings', () => {
      const todoData = buildTodoData(tmp, fixtures.emberTemplateLintWithWarnings(tmp));

      expect(todoData.size).toEqual(0);
    });

    it('can returns empty array with no results', () => {
      const todoData = buildTodoData(tmp, fixtures.emberTemplateLintNoResults(tmp));

      expect(todoData.size).toEqual(0);
    });


    it('can build todo data from results with days to decay warn only', () => {
      const todoData = buildTodoData(tmp, fixtures.emberTemplateLintSingleError(tmp), { warn: 30 });
      const todoDatum: TodoData = todoData.values().next().value;

      expect(differenceInDays(todoDatum.warnDate!, todoDatum.createdDate)).toEqual(30);
    });

    it('can build todo data from results with days to decay error only', () => {
      const todoData = buildTodoData(tmp, fixtures.emberTemplateLintSingleError(tmp), { error: 30 });
      const todoDatum: TodoData = todoData.values().next().value;

      expect(differenceInDays(todoDatum.errorDate!, todoDatum.createdDate)).toEqual(30);
    });

    it('can build todo data from results with days to decay warn and error', () => {
      const todoData = buildTodoData(tmp, fixtures.emberTemplateLintSingleError(tmp), { warn: 30, error: 60 });
      const todoDatum: TodoData = todoData.values().next().value;

      expect(differenceInDays(todoDatum.warnDate!, todoDatum.createdDate)).toEqual(30);
      expect(differenceInDays(todoDatum.errorDate!, todoDatum.createdDate)).toEqual(60);
    });
  });
});
