/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { differenceInDays } from 'date-fns';
import { getDatePart } from '../src/date-utils';
import { TodoDataV1, TodoDataV2 } from '../src/types';
import { buildTodoDatum, normalizeToV2 } from '../src/builders';
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
