/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { ESLint, Linter } from 'eslint';
import { differenceInDays } from 'date-fns';
import { buildTodoDatum, buildTodoData, getDatePart } from '../src';
import { TemplateLintMessage, TemplateLintResult, TodoDataV1, TodoDataV2 } from '../src/types';
import { createTmpDir } from './__utils__/tmp-dir';
import { updatePath } from './__utils__/update-path';
import { getFixture } from './__utils__/get-fixture';
import { normalizeToV2 } from '../src/builders';

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

      const todoDatum = buildTodoDatum(tmp, eslintResult, eslintMessage);

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
      const todoData = buildTodoData(tmp, getFixture('eslint-with-errors', tmp));

      expect(todoData.size).toEqual(18);
    });

    it('can returns empty array with only warnings', () => {
      const todoData = buildTodoData(tmp, getFixture('eslint-with-warnings', tmp));

      expect(todoData.size).toEqual(0);
    });

    it('can returns empty array with no results', () => {
      const todoData = buildTodoData(tmp, getFixture('eslint-no-results', tmp));

      expect(todoData.size).toEqual(0);
    });

    it('can build todo data from results with days to decay warn only', () => {
      const todoData = buildTodoData(tmp, getFixture('eslint-single-error', tmp), {
        daysToDecay: { warn: 30 },
      });
      const todoDatum: TodoDataV1 = todoData.values().next().value;

      expect(differenceInDays(todoDatum.warnDate!, todoDatum.createdDate)).toEqual(30);
    });

    it('can build todo data from results with days to decay error only', () => {
      const todoData = buildTodoData(tmp, getFixture('eslint-single-error', tmp), {
        daysToDecay: { error: 30 },
      });
      const todoDatum: TodoDataV1 = todoData.values().next().value;

      expect(differenceInDays(todoDatum.errorDate!, todoDatum.createdDate)).toEqual(30);
    });

    it('can build todo data from results with days to decay warn and error', () => {
      const todoData = buildTodoData(tmp, getFixture('eslint-single-error', tmp), {
        daysToDecay: {
          warn: 30,
          error: 60,
        },
      });
      const todoDatum: TodoDataV1 = todoData.values().next().value;

      expect(differenceInDays(todoDatum.warnDate!, todoDatum.createdDate)).toEqual(30);
      expect(differenceInDays(todoDatum.errorDate!, todoDatum.createdDate)).toEqual(60);
    });

    it('can build todo data with a custom createdDate', () => {
      process.env.TODO_CREATED_DATE = new Date(2015, 1, 23).toJSON();

      const todoData = buildTodoData(tmp, getFixture('eslint-single-error', tmp), {
        daysToDecay: { warn: 30 },
      });
      const todoDatum: TodoDataV1 = todoData.values().next().value;

      expect(todoDatum.createdDate).toEqual(getDatePart(new Date(2015, 1, 23)).getTime());

      process.env.TODO_CREATED_DATE = '';
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

      const todoDatum = buildTodoDatum(tmp, emberTemplateLintResult, emberTemplateLintMessage);

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
      const todoData = buildTodoData(tmp, getFixture('ember-template-lint-with-errors', tmp));

      expect(todoData.size).toEqual(39);
    });

    it('can returns empty array with only warnings', () => {
      const todoData = buildTodoData(tmp, getFixture('ember-template-lint-with-warnings', tmp));

      expect(todoData.size).toEqual(0);
    });

    it('can returns empty array with no results', () => {
      const todoData = buildTodoData(tmp, getFixture('ember-template-lint-no-results', tmp));

      expect(todoData.size).toEqual(0);
    });

    it('can build todo data from results with days to decay warn only', () => {
      const todoData = buildTodoData(tmp, getFixture('ember-template-lint-single-error', tmp), {
        daysToDecay: {
          warn: 30,
        },
      });
      const todoDatum: TodoDataV1 = todoData.values().next().value;

      expect(differenceInDays(todoDatum.warnDate!, todoDatum.createdDate)).toEqual(30);
    });

    it('can build todo data from results with days to decay error only', () => {
      const todoData = buildTodoData(tmp, getFixture('ember-template-lint-single-error', tmp), {
        daysToDecay: {
          error: 30,
        },
      });
      const todoDatum: TodoDataV1 = todoData.values().next().value;

      expect(differenceInDays(todoDatum.errorDate!, todoDatum.createdDate)).toEqual(30);
    });

    it('can build todo data from results with days to decay warn and error', () => {
      const todoData = buildTodoData(tmp, getFixture('ember-template-lint-single-error', tmp), {
        daysToDecay: {
          warn: 30,
          error: 60,
        },
      });
      const todoDatum: TodoDataV1 = todoData.values().next().value;

      expect(differenceInDays(todoDatum.warnDate!, todoDatum.createdDate)).toEqual(30);
      expect(differenceInDays(todoDatum.errorDate!, todoDatum.createdDate)).toEqual(60);
    });
  });

  describe('normalizeToV2', () => {
    it('returns a v2 todo when a v1 is provided', () => {
      const todoDatum: TodoDataV1 = {
        engine: 'eslint',
        filePath: 'app/controllers/settings.js',
        ruleId: 'no-prototype-builtins',
        line: 25,
        column: 21,
        createdDate: getDatePart(new Date('2021-01-01')).getTime(),
      };

      expect(normalizeToV2(todoDatum)).toMatchInlineSnapshot(`
        Object {
          "createdDate": 1609459200000,
          "engine": "eslint",
          "filePath": "app/controllers/settings.js",
          "range": Object {
            "end": Object {
              "column": null,
              "line": null,
            },
            "start": Object {
              "column": 21,
              "line": 25,
            },
          },
          "ruleId": "no-prototype-builtins",
          "source": "",
        }
      `);
    });

    it('returns a v2 todo when a v2 is provided', () => {
      const todoDatum: TodoDataV2 = {
        engine: 'eslint',
        filePath: 'app/controllers/settings.js',
        ruleId: 'no-prototype-builtins',
        range: {
          start: {
            line: 25,
            column: 21,
          },
          end: {
            line: 25,
            column: 29,
          },
        },
        source: '',
        createdDate: getDatePart(new Date('2021-01-01')).getTime(),
      };

      expect(normalizeToV2(todoDatum)).toMatchInlineSnapshot(`
        Object {
          "createdDate": 1609459200000,
          "engine": "eslint",
          "filePath": "app/controllers/settings.js",
          "range": Object {
            "end": Object {
              "column": 29,
              "line": 25,
            },
            "start": Object {
              "column": 21,
              "line": 25,
            },
          },
          "ruleId": "no-prototype-builtins",
          "source": "",
        }
      `);
    });
  });
});
