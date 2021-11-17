/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { differenceInDays } from 'date-fns';
import { getDatePart } from '../src/date-utils';
import { buildFromTodoOperations, buildTodoDatum } from '../src/builders';
import { createTmpDir } from './__utils__/tmp-dir';

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
        Object {
          "createdDate": 1424649600000,
          "engine": "eslint",
          "fileFormat": 2,
          "filePath": "app/components/foo.js",
          "originalLintResult": Object {
            "fake": true,
          },
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

  describe('buildFromOperations', () => {
    it('builds single todo from single add', () => {
      const todoOperations: string[] = [
        'add|ember-template-lint|no-implicit-this|174|8|174|8|864e3ef2438ac413d96a032cdd141e567fcc04b3|2|1629331200000|2493248400000|2493334800000|addon/templates/components/foo.hbs',
      ];

      const todos = buildFromTodoOperations(todoOperations);

      expect(todos.size).toEqual(1);
      expect(todos).toMatchInlineSnapshot(`
        Map {
          "addon/templates/components/foo.hbs" => TodoMatcher {
            "unprocessed": Set {
              Object {
                "createdDate": 1629331200000,
                "engine": "ember-template-lint",
                "errorDate": 2493334800000,
                "fileFormat": 2,
                "filePath": "addon/templates/components/foo.hbs",
                "range": Object {
                  "end": Object {
                    "column": 8,
                    "line": 174,
                  },
                  "start": Object {
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
        'add|ember-template-lint|no-implicit-this|174|8|174|8|864e3ef2438ac413d96a032cdd141e567fcc04b3|2|1629331200000|2493248400000|2493334800000|addon/templates/components/fo|o.hbs',
      ];

      const todos = buildFromTodoOperations(todoOperations);

      expect(todos.size).toEqual(1);
      expect(todos).toMatchInlineSnapshot(`
        Map {
          "addon/templates/components/fo|o.hbs" => TodoMatcher {
            "unprocessed": Set {
              Object {
                "createdDate": 1629331200000,
                "engine": "ember-template-lint",
                "errorDate": 2493334800000,
                "fileFormat": 2,
                "filePath": "addon/templates/components/fo|o.hbs",
                "range": Object {
                  "end": Object {
                    "column": 8,
                    "line": 174,
                  },
                  "start": Object {
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
        'add|ember-template-lint|no-implicit-this|174|8|174|8|864e3ef2438ac413d96a032cdd141e567fcc04b3|2|1629331200000|2493248400000|2493334800000|addon/templates/components/foo.hbs',
        'add|ember-template-lint|no-implicit-this|174|8|174|8|864e3ef2438ac413d96a032cdd141e567fcc04b3|2|1629331200000|2493248400000|2493334800000|addon/templates/components/foo.hbs',
      ];

      expect(buildFromTodoOperations(todoOperations)).toMatchInlineSnapshot(`
        Map {
          "addon/templates/components/foo.hbs" => TodoMatcher {
            "unprocessed": Set {
              Object {
                "createdDate": 1629331200000,
                "engine": "ember-template-lint",
                "errorDate": 2493334800000,
                "fileFormat": 2,
                "filePath": "addon/templates/components/foo.hbs",
                "range": Object {
                  "end": Object {
                    "column": 8,
                    "line": 174,
                  },
                  "start": Object {
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
        'add|ember-template-lint|no-implicit-this|174|8|174|8|864e3ef2438ac413d96a032cdd141e567fcc04b3|2|1629331200000|2493248400000|2493334800000|addon/templates/components/foo.hbs',
        'remove|ember-template-lint|no-implicit-this|174|8|174|8|864e3ef2438ac413d96a032cdd141e567fcc04b3|2|1629331200000|2493248400000|2493334800000|addon/templates/components/foo.hbs',
      ];

      expect(buildFromTodoOperations(todoOperations)).toMatchInlineSnapshot(`Map {}`);
    });

    it('builds empty todos from single add and multiple identical removes', () => {
      const todoOperations: string[] = [
        'add|ember-template-lint|no-implicit-this|174|8|174|8|864e3ef2438ac413d96a032cdd141e567fcc04b3|2|1629331200000|2493248400000|2493334800000|addon/templates/components/foo.hbs',
        'remove|ember-template-lint|no-implicit-this|174|8|174|8|864e3ef2438ac413d96a032cdd141e567fcc04b3|2|1629331200000|2493248400000|2493334800000|addon/templates/components/foo.hbs',
        'remove|ember-template-lint|no-implicit-this|174|8|174|8|864e3ef2438ac413d96a032cdd141e567fcc04b3|2|1629331200000|2493248400000|2493334800000|addon/templates/components/foo.hbs',
      ];

      expect(buildFromTodoOperations(todoOperations)).toMatchInlineSnapshot(`Map {}`);
    });
  });
});
