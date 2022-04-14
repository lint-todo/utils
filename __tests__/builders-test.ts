/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, beforeEach, it, expect } from 'vitest';
import { differenceInDays } from 'date-fns';
import { getDatePart } from '../src/date-utils';
import { buildFromTodoOperations, buildTodoDatum, buildTodoOperations } from '../src/builders';
import { createTmpDir } from './__utils__/tmp-dir';
import { buildMaybeTodosFromFixture } from './__utils__/build-todo-data';

describe('builders', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = createTmpDir();
  });

  describe('buildTodoDatum', () => {
    it('builds a todo from eslint result', () => {
      const fakeLintResult = { fake: true };
      const todoDatum = buildTodoDatum(tmp, {
        engine: 'eslint',
        filePath: `${tmp}/app/controllers/settings.js`,
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
        source: '',
        originalLintResult: fakeLintResult,
      });

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
          originalLintResult: fakeLintResult,
        })
      );
    });

    it('can build todo data from results with days to decay warn only', () => {
      const fakeLintResult = { fake: true };
      const todoDatum = buildTodoDatum(
        tmp,
        {
          engine: 'eslint',
          filePath: `${tmp}/app/controllers/settings.js`,
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
          source: '',
          originalLintResult: fakeLintResult,
        },
        {
          daysToDecay: { warn: 30 },
        }
      );

      expect(differenceInDays(todoDatum.warnDate!, todoDatum.createdDate)).toEqual(30);
    });

    it('can build todo data from results with days to decay error only', () => {
      const fakeLintResult = { fake: true };
      const todoDatum = buildTodoDatum(
        tmp,
        {
          engine: 'eslint',
          filePath: `${tmp}/app/controllers/settings.js`,
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
          source: '',
          originalLintResult: fakeLintResult,
        },
        {
          daysToDecay: { error: 30 },
        }
      );

      expect(differenceInDays(todoDatum.errorDate!, todoDatum.createdDate)).toEqual(30);
    });

    it('can build todo data from results with days to decay warn and error', () => {
      const fakeLintResult = { fake: true };
      const todoDatum = buildTodoDatum(
        tmp,
        {
          engine: 'eslint',
          filePath: `${tmp}/app/controllers/settings.js`,
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
          source: '',
          originalLintResult: fakeLintResult,
        },
        {
          daysToDecay: {
            warn: 30,
            error: 60,
          },
        }
      );

      expect(differenceInDays(todoDatum.warnDate!, todoDatum.createdDate)).toEqual(30);
      expect(differenceInDays(todoDatum.errorDate!, todoDatum.createdDate)).toEqual(60);
    });

    it('can build todo data with a custom createdDate', () => {
      process.env.TODO_CREATED_DATE = new Date(2015, 1, 23).toJSON();
      const fakeLintResult = { fake: true };
      const todoDatum = buildTodoDatum(
        tmp,
        {
          engine: 'eslint',
          filePath: `${tmp}/app/controllers/settings.js`,
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
          source: '',
          originalLintResult: fakeLintResult,
        },
        {
          daysToDecay: { warn: 30 },
        }
      );

      expect(todoDatum.createdDate).toEqual(getDatePart(new Date(2015, 1, 23)).getTime());
      process.env.TODO_CREATED_DATE = '';
    });

    it('can build todo data with the correct range and source', () => {
      process.env.TODO_CREATED_DATE = new Date(2015, 1, 23).toJSON();

      const fakeLintResult = { fake: true };
      const todoData = buildTodoDatum(tmp, {
        engine: 'eslint',
        filePath: `${tmp}/app/components/foo.js`,
        ruleId: 'no-unused-vars',
        range: {
          start: {
            line: 7,
            column: 9,
          },
          end: {
            line: 7,
            column: 12,
          },
        },
        source: 'foo',
        originalLintResult: fakeLintResult,
      });

      expect(todoData).toMatchInlineSnapshot(`
        {
          "createdDate": 1424649600000,
          "engine": "eslint",
          "filePath": "app/components/foo.js",
          "originalLintResult": {
            "fake": true,
          },
          "range": {
            "end": {
              "column": 12,
              "line": 7,
            },
            "start": {
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

  describe('buildFromOperations', () => {
    it('builds single todo from single add', () => {
      const todoOperations: string[] = [
        'add|ember-template-lint|no-implicit-this|174|8|174|8|864e3ef2438ac413d96a032cdd141e567fcc04b3|1629331200000|2493248400000|2493334800000|addon/templates/components/foo.hbs',
      ];

      const todos = buildFromTodoOperations(todoOperations, 'ember-template-lint');

      expect(todos.size).toEqual(1);
      expect(todos).toMatchInlineSnapshot(`
        Map {
          "addon/templates/components/foo.hbs" => TodoMatcher {
            "unprocessed": Set {
              {
                "createdDate": 1629331200000,
                "engine": "ember-template-lint",
                "errorDate": 2493334800000,
                "filePath": "addon/templates/components/foo.hbs",
                "range": {
                  "end": {
                    "column": 8,
                    "line": 174,
                  },
                  "start": {
                    "column": 8,
                    "line": 174,
                  },
                },
                "ruleId": "no-implicit-this",
                "source": "864e3ef2438ac413d96a032cdd141e567fcc04b3",
                "warnDate": 2493248400000,
              },
            },
          },
        }
      `);
    });

    it('builds single todo from single add with pipes in filePath', () => {
      const todoOperations: string[] = [
        'add|ember-template-lint|no-implicit-this|174|8|174|8|864e3ef2438ac413d96a032cdd141e567fcc04b3|1629331200000|2493248400000|2493334800000|addon/templates/components/fo|o.hbs',
      ];

      const todos = buildFromTodoOperations(todoOperations, 'ember-template-lint');

      expect(todos.size).toEqual(1);
      expect(todos).toMatchInlineSnapshot(`
        Map {
          "addon/templates/components/fo|o.hbs" => TodoMatcher {
            "unprocessed": Set {
              {
                "createdDate": 1629331200000,
                "engine": "ember-template-lint",
                "errorDate": 2493334800000,
                "filePath": "addon/templates/components/fo|o.hbs",
                "range": {
                  "end": {
                    "column": 8,
                    "line": 174,
                  },
                  "start": {
                    "column": 8,
                    "line": 174,
                  },
                },
                "ruleId": "no-implicit-this",
                "source": "864e3ef2438ac413d96a032cdd141e567fcc04b3",
                "warnDate": 2493248400000,
              },
            },
          },
        }
      `);
    });

    it('builds single todo from multiple identical adds', () => {
      const todoOperations: string[] = [
        'add|ember-template-lint|no-implicit-this|174|8|174|8|864e3ef2438ac413d96a032cdd141e567fcc04b3|1629331200000|2493248400000|2493334800000|addon/templates/components/foo.hbs',
        'add|ember-template-lint|no-implicit-this|174|8|174|8|864e3ef2438ac413d96a032cdd141e567fcc04b3|1629331200000|2493248400000|2493334800000|addon/templates/components/foo.hbs',
      ];

      expect(buildFromTodoOperations(todoOperations, 'ember-template-lint')).toMatchInlineSnapshot(`
        Map {
          "addon/templates/components/foo.hbs" => TodoMatcher {
            "unprocessed": Set {
              {
                "createdDate": 1629331200000,
                "engine": "ember-template-lint",
                "errorDate": 2493334800000,
                "filePath": "addon/templates/components/foo.hbs",
                "range": {
                  "end": {
                    "column": 8,
                    "line": 174,
                  },
                  "start": {
                    "column": 8,
                    "line": 174,
                  },
                },
                "ruleId": "no-implicit-this",
                "source": "864e3ef2438ac413d96a032cdd141e567fcc04b3",
                "warnDate": 2493248400000,
              },
            },
          },
        }
      `);
    });

    it('builds empty todos from single add and remove', () => {
      const todoOperations: string[] = [
        'add|ember-template-lint|no-implicit-this|174|8|174|8|864e3ef2438ac413d96a032cdd141e567fcc04b3|1629331200000|2493248400000|2493334800000|addon/templates/components/foo.hbs',
        'remove|ember-template-lint|no-implicit-this|174|8|174|8|864e3ef2438ac413d96a032cdd141e567fcc04b3|1629331200000|2493248400000|2493334800000|addon/templates/components/foo.hbs',
      ];

      expect(buildFromTodoOperations(todoOperations, 'ember-template-lint')).toMatchInlineSnapshot(
        `Map {}`
      );
    });

    it('builds empty todos from single add and multiple identical removes', () => {
      const todoOperations: string[] = [
        'add|ember-template-lint|no-implicit-this|174|8|174|8|864e3ef2438ac413d96a032cdd141e567fcc04b3|1629331200000|2493248400000|2493334800000|addon/templates/components/foo.hbs',
        'remove|ember-template-lint|no-implicit-this|174|8|174|8|864e3ef2438ac413d96a032cdd141e567fcc04b3|1629331200000|2493248400000|2493334800000|addon/templates/components/foo.hbs',
        'remove|ember-template-lint|no-implicit-this|174|8|174|8|864e3ef2438ac413d96a032cdd141e567fcc04b3|1629331200000|2493248400000|2493334800000|addon/templates/components/foo.hbs',
      ];

      expect(buildFromTodoOperations(todoOperations, 'ember-template-lint')).toMatchInlineSnapshot(
        `Map {}`
      );
    });
  });

  describe('buildTodoOperations', () => {
    it('returns empty array when add and remove are empty', () => {
      const ops = buildTodoOperations(new Set(), new Set());

      expect(ops).toEqual([]);
    });

    it('returns array containing adds', () => {
      const todos = buildMaybeTodosFromFixture(tmp, 'new-batches');
      const ops = buildTodoOperations(todos, new Set());

      expect(ops).toMatchInlineSnapshot(`
        [
          "add|eslint|no-prototype-builtins|25|21|25|35|da39a3ee5e6b4b0d3255bfef95601890afd80709|1424649600000|||app/controllers/settings.js",
          "add|eslint|no-prototype-builtins|26|19|26|33|da39a3ee5e6b4b0d3255bfef95601890afd80709|1424649600000|||app/controllers/settings.js",
          "add|eslint|no-prototype-builtins|32|34|32|48|da39a3ee5e6b4b0d3255bfef95601890afd80709|1424649600000|||app/controllers/settings.js",
          "add|eslint|no-redeclare|1|11|1|17|da39a3ee5e6b4b0d3255bfef95601890afd80709|1424649600000|||app/initializers/tracer.js",
          "add|eslint|no-redeclare|1|19|1|33|da39a3ee5e6b4b0d3255bfef95601890afd80709|1424649600000|||app/initializers/tracer.js",
          "add|eslint|no-redeclare|1|119|1|133|da39a3ee5e6b4b0d3255bfef95601890afd80709|1424649600000|||app/initializers/tracer.js",
        ]
      `);
    });

    it('returns array containing adds and removes', () => {
      const todos = buildMaybeTodosFromFixture(tmp, 'new-batches');
      const ops = buildTodoOperations(todos, todos);

      expect(ops).toMatchInlineSnapshot(`
        [
          "add|eslint|no-prototype-builtins|25|21|25|35|da39a3ee5e6b4b0d3255bfef95601890afd80709|1424649600000|||app/controllers/settings.js",
          "add|eslint|no-prototype-builtins|26|19|26|33|da39a3ee5e6b4b0d3255bfef95601890afd80709|1424649600000|||app/controllers/settings.js",
          "add|eslint|no-prototype-builtins|32|34|32|48|da39a3ee5e6b4b0d3255bfef95601890afd80709|1424649600000|||app/controllers/settings.js",
          "add|eslint|no-redeclare|1|11|1|17|da39a3ee5e6b4b0d3255bfef95601890afd80709|1424649600000|||app/initializers/tracer.js",
          "add|eslint|no-redeclare|1|19|1|33|da39a3ee5e6b4b0d3255bfef95601890afd80709|1424649600000|||app/initializers/tracer.js",
          "add|eslint|no-redeclare|1|119|1|133|da39a3ee5e6b4b0d3255bfef95601890afd80709|1424649600000|||app/initializers/tracer.js",
          "remove|eslint|no-prototype-builtins|25|21|25|35|da39a3ee5e6b4b0d3255bfef95601890afd80709|1424649600000|||app/controllers/settings.js",
          "remove|eslint|no-prototype-builtins|26|19|26|33|da39a3ee5e6b4b0d3255bfef95601890afd80709|1424649600000|||app/controllers/settings.js",
          "remove|eslint|no-prototype-builtins|32|34|32|48|da39a3ee5e6b4b0d3255bfef95601890afd80709|1424649600000|||app/controllers/settings.js",
          "remove|eslint|no-redeclare|1|11|1|17|da39a3ee5e6b4b0d3255bfef95601890afd80709|1424649600000|||app/initializers/tracer.js",
          "remove|eslint|no-redeclare|1|19|1|33|da39a3ee5e6b4b0d3255bfef95601890afd80709|1424649600000|||app/initializers/tracer.js",
          "remove|eslint|no-redeclare|1|119|1|133|da39a3ee5e6b4b0d3255bfef95601890afd80709|1424649600000|||app/initializers/tracer.js",
        ]
      `);
    });
  });
});
