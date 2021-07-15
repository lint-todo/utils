/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { ESLint, Linter } from 'eslint';
import { differenceInDays } from 'date-fns';
import { buildTodoDatum, buildTodoData, getDatePart } from '../src';
import {
  LintMessage,
  TemplateLintMessage,
  TemplateLintResult,
  TodoDataV1,
  TodoDataV2,
} from '../src/types';
import { normalizeToV2 } from '../src/builders';
import { createTmpDir } from './__utils__/tmp-dir';
import { updatePath } from './__utils__/update-path';
import { getFixture } from './__utils__/get-fixture';

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
          range: {
            start: {
              line: 25,
              column: 21,
            },
            end: {
              line: 25,
              column: 35,
            },
          },
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

    it('can build todo data with the correct range and source', () => {
      process.env.TODO_CREATED_DATE = new Date(2015, 1, 23).toJSON();

      const lintResult = getFixture('eslint-with-source', tmp)[0];
      const lintMessage: LintMessage = lintResult.messages[0];

      const todoData = buildTodoDatum(tmp, lintResult, lintMessage);

      expect(todoData).toMatchInlineSnapshot(`
        Object {
          "createdDate": 1424649600000,
          "engine": "eslint",
          "fileFormat": 2,
          "filePath": "app/components/foo.js",
          "range": Object {
            "end": Object {
              "column": 12,
              "line": 7,
            },
            "start": Object {
              "column": 9,
              "line": 7,
            },
          },
          "ruleId": "no-unused-vars",
          "source": "0beec7b5ea3f0fdbc95d0dd47f3c5bc275da8a33",
        }
      `);
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
          range: {
            start: {
              line: 3,
              column: 4,
            },
            end: {
              line: 3,
              column: 4,
            },
          },
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

    it('can build todo data with the correct range and source', () => {
      process.env.TODO_CREATED_DATE = new Date(2015, 1, 23).toJSON();

      const lintResult = getFixture('ember-template-lint-with-source', tmp)[0];
      const lintMessage: LintMessage = lintResult.messages[0];

      const todoData = buildTodoDatum(tmp, lintResult, lintMessage);

      expect(todoData).toMatchInlineSnapshot(`
        Object {
          "createdDate": 1424649600000,
          "engine": "ember-template-lint",
          "fileFormat": 2,
          "filePath": "app/components/foo.hbs",
          "range": Object {
            "end": Object {
              "column": 5,
              "line": 3,
            },
            "start": Object {
              "column": 5,
              "line": 3,
            },
          },
          "ruleId": "no-bare-strings",
          "source": "01aa3d7ff88426197cfc22dc02216cd1d6a1825a",
        }
      `);
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
        fileFormat: 1,
      };

      expect(normalizeToV2(todoDatum)).toMatchInlineSnapshot(`
        Object {
          "createdDate": 1609459200000,
          "engine": "eslint",
          "fileFormat": 1,
          "filePath": "app/controllers/settings.js",
          "range": Object {
            "end": Object {
              "column": 21,
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
        fileFormat: 2,
      };

      expect(normalizeToV2(todoDatum)).toMatchInlineSnapshot(`
        Object {
          "createdDate": 1609459200000,
          "engine": "eslint",
          "fileFormat": 2,
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
