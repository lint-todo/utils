import { describe, beforeEach, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs-extra';
import { subDays } from 'date-fns';
import { EOL } from 'node:os';
import {
  getDatePart,
  getTodoStorageFilePath,
  todoStorageFileExists,
  readTodoData,
  readTodos,
  writeTodos,
  getTodoConfig,
} from '../src';
import {
  FilePath,
  LintResult,
  Operation,
  OperationOrConflictLine,
  ReadTodoOptions,
  TodoData,
  WriteTodoOptions,
} from '../src/types';
import { createTmpDir } from './utils/tmp-dir';
import { getFixture } from './utils/get-fixture';
import TodoMatcher from '../src/todo-matcher';
import {
  buildMaybeTodos,
  buildExistingTodos,
  buildMaybeTodosFromFixture,
  buildExistingTodosFromFixture,
} from './utils/build-todo-data';
import {
  compactTodoStorageFile,
  ensureTodoStorageFile,
  getTodoBatches,
  hasConflicts,
  readTodoDataForFilePath,
  readTodoStorageFile,
  resolveConflicts,
  writeTodoStorageFile,
} from '../src/io';

function chunk<T>(initial: Set<T>, firstChunk = 1): [Set<T>, Set<T>] {
  const fixtureArr = [...initial];
  const firstHalf = fixtureArr.slice(0, firstChunk);
  const secondHalf = fixtureArr.slice(firstChunk, fixtureArr.length);

  return [new Set(firstHalf), new Set(secondHalf)];
}

function stableTodoFragment(todoData: Set<TodoData>) {
  return [...todoData].map((todoDatum) => {
    return {
      filePath: todoDatum.filePath,
      range: todoDatum.range,
      source: todoDatum.source,
    };
  });
}

function buildWriteOptions(tmp: string, options?: Partial<WriteTodoOptions>) {
  return Object.assign(
    {},
    {
      engine: 'eslint',
      filePath: '',
      todoConfig: getTodoConfig(tmp, 'eslint'),
      shouldRemove: () => true,
    },
    options
  );
}

function buildReadOptions(options?: Partial<ReadTodoOptions>) {
  return Object.assign(
    {},
    {
      engine: 'eslint',
      filePath: '',
    },
    options
  );
}

describe('io', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = createTmpDir();
  });

  describe('todoStorageFileExists', () => {
    it('returns false when file does not exist', async () => {
      expect(todoStorageFileExists(tmp)).toEqual(false);
    });

    it('returns true when directory exists sync', async () => {
      ensureTodoStorageFile(tmp);

      expect(todoStorageFileExists(tmp)).toEqual(true);
    });
  });

  describe('writeTodoStorageFile', () => {
    it('writes operations, joining with EOL and ending with EOL', () => {
      const todoStorageFilePath = getTodoStorageFilePath(tmp);
      const operations: Operation[] = [
        'add|eslint|no-prototype-builtins|25|21|25|35|da39a3ee5e6b4b0d3255bfef95601890afd80709|1637107200000|||app/controllers/settings.js',
        'add|eslint|no-prototype-builtins|26|19|26|33|da39a3ee5e6b4b0d3255bfef95601890afd80709|1637107200000|||app/controllers/settings.js',
      ];

      writeTodoStorageFile(todoStorageFilePath, operations);

      const todoContents = readFileSync(todoStorageFilePath, { encoding: 'utf8' });
      expect(todoContents).toEqual(operations[0] + EOL + operations[1] + EOL)
    })
  })

  describe('compactTodoStorageFile', () => {
    it('preserves existing file when no remove operations are present', () => {
      const todoStorageFilePath = getTodoStorageFilePath(tmp);
      const operations: Operation[] = [
        'add|eslint|no-prototype-builtins|25|21|25|35|da39a3ee5e6b4b0d3255bfef95601890afd80709|1637107200000|||app/controllers/settings.js',
        'add|eslint|no-prototype-builtins|26|19|26|33|da39a3ee5e6b4b0d3255bfef95601890afd80709|1637107200000|||app/controllers/settings.js',
      ];

      writeTodoStorageFile(todoStorageFilePath, operations);

      compactTodoStorageFile(tmp, buildReadOptions());

      expect(readTodoStorageFile(todoStorageFilePath)).toEqual(operations);

      const todoContents = readFileSync(todoStorageFilePath, { encoding: 'utf8' });
      expect(todoContents.endsWith(EOL)).toEqual(true)
    });

    it('compacts existing file when remove operations are present', () => {
      const todoStorageFilePath = getTodoStorageFilePath(tmp);
      const addOperations: Operation[] = [
        'add|eslint|no-prototype-builtins|25|21|25|35|da39a3ee5e6b4b0d3255bfef95601890afd80709|1637107200000|||app/controllers/settings.js',
        'add|eslint|no-prototype-builtins|26|19|26|33|da39a3ee5e6b4b0d3255bfef95601890afd80709|1637107200000|||app/controllers/settings.js',
      ];

      const removeOperations: Operation[] = [
        'remove|eslint|no-prototype-builtins|25|21|25|35|da39a3ee5e6b4b0d3255bfef95601890afd80709|1637107200000|||app/controllers/settings.js',
        'remove|eslint|no-prototype-builtins|26|19|26|33|da39a3ee5e6b4b0d3255bfef95601890afd80709|1637107200000|||app/controllers/settings.js',
      ];

      writeTodoStorageFile(todoStorageFilePath, [...addOperations, ...removeOperations]);

      compactTodoStorageFile(tmp);

      expect(readTodoStorageFile(todoStorageFilePath)).toEqual([]);

      const todoContents = readFileSync(todoStorageFilePath, { encoding: 'utf8' });
      expect(todoContents.endsWith(EOL)).toEqual(true)
    });

    it('compacts existing file when interleaved remove operations are present', () => {
      const todoStorageFilePath = getTodoStorageFilePath(tmp);
      const operations: Operation[] = [
        'add|eslint|no-prototype-builtins|25|21|25|35|da39a3ee5e6b4b0d3255bfef95601890afd80709|1637107200000|||app/controllers/settings.js',
        'add|eslint|no-prototype-builtins|26|19|26|33|da39a3ee5e6b4b0d3255bfef95601890afd80709|1637107200000|||app/controllers/settings.js',
        'remove|eslint|no-prototype-builtins|25|21|25|35|da39a3ee5e6b4b0d3255bfef95601890afd80709|1637107200000|||app/controllers/settings.js',
        'add|eslint|no-prototype-builtins|65|27|65|41|da39a3ee5e6b4b0d3255bfef95601890afd80709|1637107200000|||tests/unit/services/insights-test.js',
        'add|eslint|no-prototype-builtins|80|27|80|41|da39a3ee5e6b4b0d3255bfef95601890afd80709|1637107200000|||tests/unit/services/insights-test.js',
        'remove|eslint|no-prototype-builtins|26|19|26|33|da39a3ee5e6b4b0d3255bfef95601890afd80709|1637107200000|||app/controllers/settings.js',
      ];

      writeTodoStorageFile(todoStorageFilePath, operations);

      compactTodoStorageFile(tmp);

      expect(readTodoStorageFile(todoStorageFilePath)).toEqual([
        'add|eslint|no-prototype-builtins|65|27|65|41|da39a3ee5e6b4b0d3255bfef95601890afd80709|1637107200000|||tests/unit/services/insights-test.js',
        'add|eslint|no-prototype-builtins|80|27|80|41|da39a3ee5e6b4b0d3255bfef95601890afd80709|1637107200000|||tests/unit/services/insights-test.js',
      ]);
    });

    it('compacts respects multiple co-existing engines', () => {
      const todoStorageFilePath = getTodoStorageFilePath(tmp);
      const operations: Operation[] = [
        'add|eslint|no-prototype-builtins|25|21|25|35|da39a3ee5e6b4b0d3255bfef95601890afd80709|1637107200000|||app/controllers/settings.js',
        'add|eslint|no-prototype-builtins|30|21|25|35|da39a3ee5e6b4b0d3255bfef95601890afd80709|1637107200000|||app/controllers/settings.js',
        'add|ember-template-lint|no-html-comments|26|19|26|33|da39a3ee5e6b4b0d3255bfef95601890afd80709|1637107200000|||app/templates/settings.hbs',
        'remove|eslint|no-prototype-builtins|25|21|25|35|da39a3ee5e6b4b0d3255bfef95601890afd80709|1637107200000|||app/controllers/settings.js',
        'add|eslint|no-prototype-builtins|65|27|65|41|da39a3ee5e6b4b0d3255bfef95601890afd80709|1637107200000|||tests/unit/services/insights-test.js',
        'add|eslint|no-prototype-builtins|90|27|65|41|da39a3ee5e6b4b0d3255bfef95601890afd80709|1637107200000|||tests/unit/services/insights-test.js',
        'add|ember-template-lint|no-html-comments|80|27|80|41|da39a3ee5e6b4b0d3255bfef95601890afd80709|1637107200000|||app/templates/insights.hbs',
        'remove|eslint|no-prototype-builtins|26|19|26|33|da39a3ee5e6b4b0d3255bfef95601890afd80709|1637107200000|||app/controllers/settings.js',
      ];

      writeTodoStorageFile(todoStorageFilePath, operations);

      compactTodoStorageFile(tmp);

      expect(readTodoStorageFile(todoStorageFilePath)).toEqual([
        'add|eslint|no-prototype-builtins|30|21|25|35|da39a3ee5e6b4b0d3255bfef95601890afd80709|1637107200000|||app/controllers/settings.js',
        'add|ember-template-lint|no-html-comments|26|19|26|33|da39a3ee5e6b4b0d3255bfef95601890afd80709|1637107200000|||app/templates/settings.hbs',
        'add|eslint|no-prototype-builtins|65|27|65|41|da39a3ee5e6b4b0d3255bfef95601890afd80709|1637107200000|||tests/unit/services/insights-test.js',
        'add|eslint|no-prototype-builtins|90|27|65|41|da39a3ee5e6b4b0d3255bfef95601890afd80709|1637107200000|||tests/unit/services/insights-test.js',
        'add|ember-template-lint|no-html-comments|80|27|80|41|da39a3ee5e6b4b0d3255bfef95601890afd80709|1637107200000|||app/templates/insights.hbs',
      ]);
    });
  });

  describe('hasConflicts', () => {
    it('returns false if no conflicts are detected', () => {
      const noConflicts = `add|eslint|no-prototype-builtins|25|21|25|35|da39a3ee5e6b4b0d3255bfef95601890afd80709|1637107200000|||app/controllers/settings.js
add|eslint|no-prototype-builtins|26|19|26|33|da39a3ee5e6b4b0d3255bfef95601890afd80709|1637107200000|||app/controllers/settings.js
      `;

      expect(hasConflicts(noConflicts)).toEqual(false);
    });

    it('returns true if conflicts are detected', () => {
      const conflicts = `add|eslint|no-prototype-builtins|25|21|25|35|da39a3ee5e6b4b0d3255bfef95601890afd80709|1637107200000|||app/controllers/settings.js
add|eslint|no-prototype-builtins|26|19|26|33|da39a3ee5e6b4b0d3255bfef95601890afd80709|1637107200000|||app/controllers/settings.js
<<<<<<< .lint-todo
add|eslint|no-prototype-builtins|30|19|30|33|da39a3ee5e6b4b0d3255bfef95601890afd80709|1637107200000|||app/controllers/settings.js
=======
remove|eslint|no-unused-vars|30|19|30|33|da39a3ee5e6b4b0d3255bfef95601890afd80709|1637107200000|||app/controllers/settings.js
>>>>>>> .lint-todo
      `;

      expect(hasConflicts(conflicts)).toEqual(true);
    });
  });

  describe('resolveConflicts', () => {
    it('does not change operations when no conflicts are present', () => {
      const operations: Operation[] = [
        'add|eslint|no-prototype-builtins|25|21|25|35|da39a3ee5e6b4b0d3255bfef95601890afd80709|1637107200000|||app/controllers/settings.js',
        'add|eslint|no-prototype-builtins|26|19|26|33|da39a3ee5e6b4b0d3255bfef95601890afd80709|1637107200000|||app/controllers/settings.js',
      ];

      expect(resolveConflicts(operations)).toEqual(operations);
    });

    it('resolves conflicts when detected', () => {
      const operations: OperationOrConflictLine[] = [
        'add|eslint|no-prototype-builtins|25|21|25|35|da39a3ee5e6b4b0d3255bfef95601890afd80709|1637107200000|||app/controllers/settings.js',
        'add|eslint|no-prototype-builtins|26|19|26|33|da39a3ee5e6b4b0d3255bfef95601890afd80709|1637107200000|||app/controllers/settings.js',
        '<<<<<<< .lint-todo',
        'add|eslint|no-prototype-builtins|30|19|30|33|da39a3ee5e6b4b0d3255bfef95601890afd80709|1637107200000|||app/controllers/settings.js',
        '=======',
        'remove|eslint|no-unused-vars|30|19|30|33|da39a3ee5e6b4b0d3255bfef95601890afd80709|1637107200000|||app/controllers/settings.js',
        '>>>>>>> .lint-todo',
      ];

      expect(resolveConflicts(operations)).toEqual([
        'add|eslint|no-prototype-builtins|25|21|25|35|da39a3ee5e6b4b0d3255bfef95601890afd80709|1637107200000|||app/controllers/settings.js',
        'add|eslint|no-prototype-builtins|26|19|26|33|da39a3ee5e6b4b0d3255bfef95601890afd80709|1637107200000|||app/controllers/settings.js',
        'add|eslint|no-prototype-builtins|30|19|30|33|da39a3ee5e6b4b0d3255bfef95601890afd80709|1637107200000|||app/controllers/settings.js',
        'remove|eslint|no-unused-vars|30|19|30|33|da39a3ee5e6b4b0d3255bfef95601890afd80709|1637107200000|||app/controllers/settings.js',
      ]);
    });
  });

  describe('writeTodos', () => {
    it("creates .lint-todo file if one doesn't exist", async () => {
      const todoFile = getTodoStorageFilePath(tmp);

      writeTodos(tmp, new Set(), buildWriteOptions(tmp));

      expect(existsSync(todoFile)).toEqual(true);
    });

    it("doesn't write files when no todos provided", async () => {
      writeTodos(tmp, new Set(), buildWriteOptions(tmp));

      expect(readTodos(tmp, buildReadOptions()).size).toEqual(0);
    });

    it('generates todos when todos provided', async () => {
      const { addedCount } = writeTodos(
        tmp,
        buildMaybeTodosFromFixture(tmp, 'eslint-with-errors'),
        buildWriteOptions(tmp)
      );

      expect(addedCount).toEqual(18);
      expect(readTodoData(tmp, buildReadOptions()).size).toEqual(18);
    });

    it("generates todos only if previous todo doesn't exist", async () => {
      const initialTodos: LintResult[] = [
        {
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
            {
              ruleId: 'no-prototype-builtins',
              severity: 2,
              message: "Do not access Object.prototype method 'hasOwnProperty' from target object.",
              line: 26,
              column: 19,
              nodeType: 'CallExpression',
              messageId: 'prototypeBuildIn',
              endLine: 26,
              endColumn: 33,
            },
          ],
          errorCount: 2,
          warningCount: 0,
          fixableErrorCount: 0,
          fixableWarningCount: 0,
          source: '',
          usedDeprecatedRules: [],
        },
      ];

      const { addedCount } = writeTodos(
        tmp,
        buildMaybeTodos(tmp, initialTodos),
        buildWriteOptions(tmp)
      );

      expect(addedCount).toEqual(2);
      expect(readTodoData(tmp, buildReadOptions()).size).toEqual(2);

      writeTodos(
        tmp,
        buildMaybeTodosFromFixture(tmp, 'eslint-with-errors'),
        buildWriteOptions(tmp)
      );

      const subsequentTodos = readTodoData(tmp, buildReadOptions());

      expect(subsequentTodos.size).toEqual(18);
    });

    it('removes old todos if todos no longer contains violations', async () => {
      const fixture = buildMaybeTodosFromFixture(tmp, 'eslint-with-errors');
      const { addedCount } = writeTodos(tmp, fixture, buildWriteOptions(tmp));
      const initialTodos = readTodoData(tmp, buildReadOptions());

      expect(addedCount).toEqual(18);
      expect(initialTodos.size).toEqual(18);

      const [firstHalf] = chunk(fixture, 3);
      const { removedCount } = writeTodos(tmp, new Set(firstHalf), buildWriteOptions(tmp));
      const subsequentTodos = readTodoData(tmp, buildReadOptions());

      expect(removedCount).toEqual(15);
      expect(subsequentTodos.size).toEqual(3);
    });

    it('does not remove old todos if todos no longer contains violations if shouldRemove returns false', async () => {
      const fixture = buildMaybeTodosFromFixture(tmp, 'eslint-with-errors');

      const { addedCount } = writeTodos(tmp, fixture, buildWriteOptions(tmp));

      const initialFiles = readTodoData(tmp, buildReadOptions());

      expect(addedCount).toEqual(18);
      expect(initialFiles.size).toEqual(18);

      const [firstHalf] = chunk(fixture, 3);

      const { removedCount } = writeTodos(
        tmp,
        firstHalf,
        buildWriteOptions(tmp, { shouldRemove: () => false })
      );

      const subsequentFiles = readTodoData(tmp, buildReadOptions());

      expect(removedCount).toEqual(0);
      expect(subsequentFiles.size).toEqual(18);
    });
  });

  describe('writeTodos for single file', () => {
    it('generates todos for a specific filePath', async () => {
      const { addedCount } = writeTodos(
        tmp,
        buildMaybeTodosFromFixture(tmp, 'single-file-todo'),
        buildWriteOptions(tmp, {
          filePath: 'app/controllers/settings.js',
        })
      );

      expect(addedCount).toEqual(3);
      expect(
        stableTodoFragment(
          readTodoDataForFilePath(
            tmp,
            buildReadOptions({
              filePath: 'app/controllers/settings.js',
            })
          )
        )
      ).toMatchInlineSnapshot(`
        [
          {
            "filePath": "app/controllers/settings.js",
            "range": {
              "end": {
                "column": 35,
                "line": 25,
              },
              "start": {
                "column": 21,
                "line": 25,
              },
            },
            "source": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
          },
          {
            "filePath": "app/controllers/settings.js",
            "range": {
              "end": {
                "column": 33,
                "line": 26,
              },
              "start": {
                "column": 19,
                "line": 26,
              },
            },
            "source": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
          },
          {
            "filePath": "app/controllers/settings.js",
            "range": {
              "end": {
                "column": 48,
                "line": 32,
              },
              "start": {
                "column": 34,
                "line": 32,
              },
            },
            "source": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
          },
        ]
      `);
    });

    it('updates todos for a specific filePath', async () => {
      const { addedCount } = writeTodos(
        tmp,
        buildMaybeTodosFromFixture(tmp, 'single-file-todo'),
        buildWriteOptions(tmp, {
          filePath: 'app/controllers/settings.js',
        })
      );

      expect(addedCount).toEqual(3);
      expect(
        stableTodoFragment(
          readTodoDataForFilePath(
            tmp,
            buildReadOptions({
              filePath: 'app/controllers/settings.js',
            })
          )
        )
      ).toMatchInlineSnapshot(`
        [
          {
            "filePath": "app/controllers/settings.js",
            "range": {
              "end": {
                "column": 35,
                "line": 25,
              },
              "start": {
                "column": 21,
                "line": 25,
              },
            },
            "source": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
          },
          {
            "filePath": "app/controllers/settings.js",
            "range": {
              "end": {
                "column": 33,
                "line": 26,
              },
              "start": {
                "column": 19,
                "line": 26,
              },
            },
            "source": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
          },
          {
            "filePath": "app/controllers/settings.js",
            "range": {
              "end": {
                "column": 48,
                "line": 32,
              },
              "start": {
                "column": 34,
                "line": 32,
              },
            },
            "source": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
          },
        ]
      `);

      const counts = writeTodos(
        tmp,
        buildMaybeTodosFromFixture(tmp, 'single-file-todo-updated'),
        buildWriteOptions(tmp, {
          filePath: 'app/controllers/settings.js',
        })
      );

      expect(counts).toStrictEqual({
        addedCount: 1,
        expiredCount: 0,
        removedCount: 1,
        stableCount: 2,
      });
      expect(
        stableTodoFragment(
          readTodoDataForFilePath(
            tmp,
            buildReadOptions({
              filePath: 'app/controllers/settings.js',
            })
          )
        )
      ).toMatchInlineSnapshot(`
        [
          {
            "filePath": "app/controllers/settings.js",
            "range": {
              "end": {
                "column": 35,
                "line": 25,
              },
              "start": {
                "column": 21,
                "line": 25,
              },
            },
            "source": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
          },
          {
            "filePath": "app/controllers/settings.js",
            "range": {
              "end": {
                "column": 33,
                "line": 26,
              },
              "start": {
                "column": 19,
                "line": 26,
              },
            },
            "source": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
          },
          {
            "filePath": "app/controllers/settings.js",
            "range": {
              "end": {
                "column": 110,
                "line": 50,
              },
              "start": {
                "column": 101,
                "line": 50,
              },
            },
            "source": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
          },
        ]
      `);
    });

    it('deletes todos for a specific filePath', async () => {
      const { addedCount } = writeTodos(
        tmp,
        buildMaybeTodosFromFixture(tmp, 'single-file-todo'),
        buildWriteOptions(tmp, {
          filePath: 'app/controllers/settings.js',
        })
      );

      expect(addedCount).toEqual(3);
      expect(
        stableTodoFragment(
          readTodoDataForFilePath(
            tmp,
            buildReadOptions({
              filePath: 'app/controllers/settings.js',
            })
          )
        )
      ).toMatchInlineSnapshot(`
        [
          {
            "filePath": "app/controllers/settings.js",
            "range": {
              "end": {
                "column": 35,
                "line": 25,
              },
              "start": {
                "column": 21,
                "line": 25,
              },
            },
            "source": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
          },
          {
            "filePath": "app/controllers/settings.js",
            "range": {
              "end": {
                "column": 33,
                "line": 26,
              },
              "start": {
                "column": 19,
                "line": 26,
              },
            },
            "source": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
          },
          {
            "filePath": "app/controllers/settings.js",
            "range": {
              "end": {
                "column": 48,
                "line": 32,
              },
              "start": {
                "column": 34,
                "line": 32,
              },
            },
            "source": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
          },
        ]
      `);

      const { addedCount: addedCount2, removedCount } = writeTodos(
        tmp,
        buildMaybeTodosFromFixture(tmp, 'single-file-no-errors'),
        buildWriteOptions(tmp, {
          filePath: 'app/controllers/settings.js',
        })
      );

      expect(addedCount2).toEqual(0);
      expect(removedCount).toEqual(3);
      expect(
        readTodoDataForFilePath(
          tmp,
          buildReadOptions({
            filePath: 'app/controllers/settings.js',
          })
        ).size
      ).toEqual(0);
    });
  });

  describe('readTodos', () => {
    it('can read empty storage file', () => {
      writeTodos(tmp, new Set(), buildWriteOptions(tmp));

      expect(readTodos(tmp, buildReadOptions()).size).toEqual(0);
    });

    it('can read storage file with adds only', () => {
      const initialTodos = buildMaybeTodosFromFixture(tmp, 'eslint-with-errors');
      const { addedCount } = writeTodos(tmp, initialTodos, buildWriteOptions(tmp));

      expect(readTodoData(tmp, buildReadOptions()).size).toEqual(addedCount);
    });

    it('can read storage file with adds and removes', () => {
      const initialTodos = buildMaybeTodosFromFixture(tmp, 'eslint-with-errors');
      const { addedCount } = writeTodos(tmp, initialTodos, buildWriteOptions(tmp));

      expect(readTodoData(tmp, buildReadOptions()).size).toEqual(addedCount);

      const [firstChunk] = chunk(initialTodos, 2);

      const { removedCount } = writeTodos(tmp, firstChunk, buildWriteOptions(tmp));

      expect(readTodoStorageFile(getTodoStorageFilePath(tmp))).toHaveLength(
        addedCount + removedCount
      );
      expect(readTodoData(tmp, buildReadOptions()).size).toEqual(2);
    });

    it('can read storage file with engine isolation', () => {
      const eslintTodos = buildMaybeTodosFromFixture(tmp, 'eslint-with-errors');
      const emberTemplateLintTodos = buildMaybeTodosFromFixture(
        tmp,
        'ember-template-lint-with-errors'
      );

      const { addedCount: eslintAddedCount } = writeTodos(
        tmp,
        eslintTodos,
        buildWriteOptions(tmp, { engine: 'eslint' })
      );
      expect(eslintAddedCount).toEqual(18);

      const { addedCount: emberTemplateLintAddedCount } = writeTodos(
        tmp,
        emberTemplateLintTodos,
        buildWriteOptions(tmp, { engine: 'ember-template-lint' })
      );
      expect(emberTemplateLintAddedCount).toEqual(4);

      expect(
        readTodoData(
          tmp,
          buildReadOptions({
            engine: 'ember-template-lint',
          })
        ).size
      ).toEqual(emberTemplateLintAddedCount);
    });
  });

  describe('readTodosForFilePath', () => {
    it('can read empty storage file', () => {
      writeTodos(tmp, new Set(), buildWriteOptions(tmp));

      expect(
        readTodos(
          tmp,
          buildReadOptions({
            filePath: '/app/controllers/settings.js',
          })
        ).size
      ).toEqual(0);
    });

    it('can read storage file with adds only', () => {
      const initialTodos = buildMaybeTodosFromFixture(tmp, 'single-file-errors');
      const { addedCount } = writeTodos(
        tmp,
        initialTodos,
        buildWriteOptions(tmp, {
          filePath: 'app/controllers/settings.js',
        })
      );
      expect(addedCount).toEqual(3);

      expect(
        readTodoDataForFilePath(
          tmp,
          buildReadOptions({
            filePath: 'app/controllers/settings.js',
          })
        ).size
      ).toEqual(addedCount);
    });

    it('can read todos with non-normalized filePath', () => {
      const initialTodos = buildMaybeTodosFromFixture(tmp, 'single-file-errors');
      const { addedCount } = writeTodos(
        tmp,
        initialTodos,
        buildWriteOptions(tmp, {
          filePath: './app/controllers/settings.js',
        })
      );
      expect(addedCount).toEqual(3);

      expect(
        readTodoDataForFilePath(
          tmp,
          buildReadOptions({
            filePath: './app/controllers/settings.js',
          })
        ).size
      ).toEqual(addedCount);
    });

    it('can read storage file with adds and removes', () => {
      const initialTodos = buildMaybeTodosFromFixture(tmp, 'single-file-errors');
      const { addedCount } = writeTodos(
        tmp,
        initialTodos,
        buildWriteOptions(tmp, {
          filePath: 'app/controllers/settings.js',
        })
      );

      expect(
        readTodoData(
          tmp,
          buildReadOptions({
            filePath: 'app/controllers/settings.js',
          })
        ).size
      ).toEqual(addedCount);

      const [firstChunk] = chunk(initialTodos, 2);

      const { removedCount } = writeTodos(
        tmp,
        firstChunk,
        buildWriteOptions(tmp, {
          filePath: 'app/controllers/settings.js',
        })
      );

      expect(readTodoStorageFile(getTodoStorageFilePath(tmp))).toHaveLength(
        addedCount + removedCount
      );
      expect(
        readTodoData(
          tmp,
          buildReadOptions({
            filePath: 'app/controllers/settings.js',
          })
        ).size
      ).toEqual(2);
    });
  });

  describe('getTodoBatches', () => {
    it('generates no batches when lint results are empty', () => {
      const { add, remove, stable, expired } = getTodoBatches(new Set(), new Map(), {
        shouldRemove: () => true,
      });

      expect(stableTodoFragment(add)).toMatchInlineSnapshot(`[]`);
      expect(stableTodoFragment(remove)).toMatchInlineSnapshot(`[]`);
      expect(stableTodoFragment(stable)).toMatchInlineSnapshot(`[]`);
      expect(stableTodoFragment(expired)).toMatchInlineSnapshot(`[]`);
    });

    it('creates items to add', async () => {
      const { add } = getTodoBatches(buildMaybeTodosFromFixture(tmp, 'new-batches'), new Map(), {
        shouldRemove: () => true,
      });

      expect(stableTodoFragment(add)).toMatchInlineSnapshot(`
        [
          {
            "filePath": "app/controllers/settings.js",
            "range": {
              "end": {
                "column": 35,
                "line": 25,
              },
              "start": {
                "column": 21,
                "line": 25,
              },
            },
            "source": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
          },
          {
            "filePath": "app/controllers/settings.js",
            "range": {
              "end": {
                "column": 33,
                "line": 26,
              },
              "start": {
                "column": 19,
                "line": 26,
              },
            },
            "source": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
          },
          {
            "filePath": "app/controllers/settings.js",
            "range": {
              "end": {
                "column": 48,
                "line": 32,
              },
              "start": {
                "column": 34,
                "line": 32,
              },
            },
            "source": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
          },
          {
            "filePath": "app/initializers/tracer.js",
            "range": {
              "end": {
                "column": 17,
                "line": 1,
              },
              "start": {
                "column": 11,
                "line": 1,
              },
            },
            "source": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
          },
          {
            "filePath": "app/initializers/tracer.js",
            "range": {
              "end": {
                "column": 33,
                "line": 1,
              },
              "start": {
                "column": 19,
                "line": 1,
              },
            },
            "source": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
          },
          {
            "filePath": "app/initializers/tracer.js",
            "range": {
              "end": {
                "column": 133,
                "line": 1,
              },
              "start": {
                "column": 119,
                "line": 1,
              },
            },
            "source": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
          },
        ]
      `);
    });

    it('creates items to remove', async () => {
      const { remove } = getTodoBatches(
        new Set(),
        buildExistingTodos(tmp, getFixture('new-batches', tmp, false)),
        {
          shouldRemove: () => true,
        }
      );

      expect(stableTodoFragment(remove)).toMatchInlineSnapshot(`
        [
          {
            "filePath": "app/controllers/settings.js",
            "range": {
              "end": {
                "column": 35,
                "line": 25,
              },
              "start": {
                "column": 21,
                "line": 25,
              },
            },
            "source": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
          },
          {
            "filePath": "app/controllers/settings.js",
            "range": {
              "end": {
                "column": 33,
                "line": 26,
              },
              "start": {
                "column": 19,
                "line": 26,
              },
            },
            "source": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
          },
          {
            "filePath": "app/controllers/settings.js",
            "range": {
              "end": {
                "column": 48,
                "line": 32,
              },
              "start": {
                "column": 34,
                "line": 32,
              },
            },
            "source": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
          },
          {
            "filePath": "app/initializers/tracer.js",
            "range": {
              "end": {
                "column": 17,
                "line": 1,
              },
              "start": {
                "column": 11,
                "line": 1,
              },
            },
            "source": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
          },
          {
            "filePath": "app/initializers/tracer.js",
            "range": {
              "end": {
                "column": 33,
                "line": 1,
              },
              "start": {
                "column": 19,
                "line": 1,
              },
            },
            "source": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
          },
          {
            "filePath": "app/initializers/tracer.js",
            "range": {
              "end": {
                "column": 133,
                "line": 1,
              },
              "start": {
                "column": 119,
                "line": 1,
              },
            },
            "source": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
          },
        ]
      `);
    });

    it('creates items to expire', async () => {
      const expiredBatches: Map<FilePath, TodoMatcher> = buildExistingTodos(
        tmp,
        getFixture('new-batches', tmp, false)
      );

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const expiredTodo: TodoData = expiredBatches
        .get('app/controllers/settings.js')!
        .find((todoDatum) => todoDatum.filePath)!;

      expiredTodo.errorDate = subDays(getDatePart(), 1).getTime();

      // eslint-disable-next-line unicorn/no-unreadable-array-destructuring
      const { expired } = getTodoBatches(
        buildMaybeTodosFromFixture(tmp, 'new-batches'),
        expiredBatches,
        {
          shouldRemove: () => true,
        }
      );

      expect(stableTodoFragment(expired)).toMatchInlineSnapshot(`
        [
          {
            "filePath": "app/controllers/settings.js",
            "range": {
              "end": {
                "column": 35,
                "line": 25,
              },
              "start": {
                "column": 21,
                "line": 25,
              },
            },
            "source": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
          },
        ]
      `);
    });

    it('creates all batches', async () => {
      const existingBatches: Map<FilePath, TodoMatcher> = buildExistingTodosFromFixture(
        tmp,
        'existing-batches'
      );
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const expiredTodo: TodoData = existingBatches
        .get('app/initializers/tracer.js')!
        .find((todoDatum) => todoDatum.filePath)!;

      expiredTodo.errorDate = subDays(getDatePart(), 1).getTime();

      const { add, remove, stable, expired } = getTodoBatches(
        buildMaybeTodosFromFixture(tmp, 'new-batches'),
        existingBatches,
        { shouldRemove: () => true }
      );

      expect(stableTodoFragment(add)).toMatchInlineSnapshot(`
        [
          {
            "filePath": "app/controllers/settings.js",
            "range": {
              "end": {
                "column": 35,
                "line": 25,
              },
              "start": {
                "column": 21,
                "line": 25,
              },
            },
            "source": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
          },
          {
            "filePath": "app/controllers/settings.js",
            "range": {
              "end": {
                "column": 33,
                "line": 26,
              },
              "start": {
                "column": 19,
                "line": 26,
              },
            },
            "source": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
          },
          {
            "filePath": "app/controllers/settings.js",
            "range": {
              "end": {
                "column": 48,
                "line": 32,
              },
              "start": {
                "column": 34,
                "line": 32,
              },
            },
            "source": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
          },
        ]
      `);
      expect(stableTodoFragment(remove)).toMatchInlineSnapshot(`
        [
          {
            "filePath": "app/models/build.js",
            "range": {
              "end": {
                "column": 64,
                "line": 108,
              },
              "start": {
                "column": 50,
                "line": 108,
              },
            },
            "source": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
          },
          {
            "filePath": "app/models/build.js",
            "range": {
              "end": {
                "column": 39,
                "line": 120,
              },
              "start": {
                "column": 25,
                "line": 120,
              },
            },
            "source": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
          },
        ]
      `);
      expect(stableTodoFragment(stable)).toMatchInlineSnapshot(`
        [
          {
            "filePath": "app/initializers/tracer.js",
            "range": {
              "end": {
                "column": 33,
                "line": 1,
              },
              "start": {
                "column": 19,
                "line": 1,
              },
            },
            "source": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
          },
          {
            "filePath": "app/initializers/tracer.js",
            "range": {
              "end": {
                "column": 133,
                "line": 1,
              },
              "start": {
                "column": 119,
                "line": 1,
              },
            },
            "source": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
          },
        ]
      `);
      expect(stableTodoFragment(expired)).toMatchInlineSnapshot(`
        [
          {
            "filePath": "app/initializers/tracer.js",
            "range": {
              "end": {
                "column": 17,
                "line": 1,
              },
              "start": {
                "column": 11,
                "line": 1,
              },
            },
            "source": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
          },
        ]
      `);
    });

    it('creates stable batches for fuzzy matches', () => {
      process.env.TODO_CREATED_DATE = new Date(2015, 1, 23).toJSON();

      const lintResults = getFixture('eslint-exact-matches', tmp, false);
      let existingTodos: Map<FilePath, TodoMatcher> = buildExistingTodos(tmp, lintResults);

      let counts = getTodoBatches(buildMaybeTodos(tmp, lintResults), existingTodos, {
        shouldRemove: () => true,
      });

      expect(counts.add.size).toEqual(0);
      expect(counts.remove.size).toEqual(0);
      expect(counts.stable.size).toEqual(4);
      expect(counts.expired.size).toEqual(0);

      const lintResultsWithChangedLineCol = getFixture('eslint-fuzzy-matches', tmp, false);
      existingTodos = buildExistingTodos(tmp, lintResults);
      counts = getTodoBatches(buildMaybeTodos(tmp, lintResultsWithChangedLineCol), existingTodos, {
        shouldRemove: () => true,
      });

      expect(counts.add.size).toEqual(0);
      expect(counts.remove.size).toEqual(0);
      expect(counts.stable.size).toEqual(4);
      expect(counts.expired.size).toEqual(0);
    });

    it('creates add batch for matches when source changes', () => {
      process.env.TODO_CREATED_DATE = new Date(2015, 1, 23).toJSON();

      const lintResults = getFixture('eslint-no-fuzzy-source-prechange', tmp, false);
      let existingTodos: Map<FilePath, TodoMatcher> = buildExistingTodos(tmp, lintResults);

      let counts = getTodoBatches(buildMaybeTodos(tmp, lintResults), existingTodos, {
        shouldRemove: () => true,
      });

      expect(counts.add.size).toEqual(0);
      expect(counts.remove.size).toEqual(0);
      expect(counts.stable.size).toEqual(4);
      expect(counts.expired.size).toEqual(0);

      const lintResultsWithSourceChanged = getFixture('eslint-no-fuzzy-source-changed', tmp, false);
      existingTodos = buildExistingTodos(tmp, lintResults);
      counts = getTodoBatches(buildMaybeTodos(tmp, lintResultsWithSourceChanged), existingTodos, {
        shouldRemove: () => true,
      });

      expect(counts.add.size).toEqual(1);
      expect(counts.remove.size).toEqual(1);
      expect(counts.stable.size).toEqual(3);
      expect(counts.expired.size).toEqual(0);
    });

    it(`creates only stable and expired batches for exact match`, async () => {
      const { addedCount } = writeTodos(
        tmp,
        buildMaybeTodosFromFixture(tmp, 'eslint-with-errors-exact-match'),
        buildWriteOptions(tmp)
      );

      expect(addedCount).toEqual(5);

      const existing: Map<FilePath, TodoMatcher> = readTodos(tmp, buildReadOptions());
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const expiredTodo: TodoData = existing
        .get('app/components/foo.js')!
        .find((todoDatum) => todoDatum.filePath)!;

      expiredTodo.errorDate = subDays(getDatePart(), 1).getTime();

      const { add, remove, stable, expired } = getTodoBatches(
        buildMaybeTodosFromFixture(tmp, 'eslint-with-errors-exact-match'),
        existing,
        { shouldRemove: () => true }
      );

      expect(stableTodoFragment(add)).toMatchInlineSnapshot(`[]`);
      expect(stableTodoFragment(remove)).toMatchInlineSnapshot(`[]`);
      expect(stableTodoFragment(stable)).toMatchInlineSnapshot(`
        [
          {
            "filePath": "app/utils/util.js",
            "range": {
              "end": {
                "column": 16,
                "line": 1,
              },
              "start": {
                "column": 10,
                "line": 1,
              },
            },
            "source": "b618e5603b05243a5fe81039b3b18551e963f07f",
          },
          {
            "filePath": "app/utils/util.js",
            "range": {
              "end": {
                "column": 15,
                "line": 2,
              },
              "start": {
                "column": 7,
                "line": 2,
              },
            },
            "source": "b7c8adf0cc8799f2488de3116a72fc2bd326fc1f",
          },
          {
            "filePath": "json-formatter.js",
            "range": {
              "end": {
                "column": 7,
                "line": 18,
              },
              "start": {
                "column": 1,
                "line": 18,
              },
            },
            "source": "cfc137fb4c575a1564e767297c7f2b9dc4748a12",
          },
          {
            "filePath": "rule-config.js",
            "range": {
              "end": {
                "column": 7,
                "line": 1,
              },
              "start": {
                "column": 1,
                "line": 1,
              },
            },
            "source": "cfc137fb4c575a1564e767297c7f2b9dc4748a12",
          },
        ]
      `);
      expect(stableTodoFragment(expired)).toMatchInlineSnapshot(`
        [
          {
            "filePath": "app/components/foo.js",
            "range": {
              "end": {
                "column": 13,
                "line": 7,
              },
              "start": {
                "column": 9,
                "line": 7,
              },
            },
            "source": "5ae05cec9a70e6badfa35fee65306763961f070e",
          },
        ]
      `);
    });

    it(`creates only stable and expired batches for fuzzy match`, async () => {
      const { addedCount } = writeTodos(
        tmp,
        buildMaybeTodosFromFixture(tmp, 'eslint-with-errors-exact-match'),
        buildWriteOptions(tmp)
      );

      expect(addedCount).toEqual(5);

      const existing: Map<FilePath, TodoMatcher> = readTodos(tmp, buildReadOptions());
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const expiredTodo: TodoData = existing
        .get('app/components/foo.js')!
        .find((todoDatum) => todoDatum.filePath)!;

      expiredTodo.errorDate = subDays(getDatePart(), 1).getTime();

      const { add, remove, stable, expired } = getTodoBatches(
        buildMaybeTodosFromFixture(tmp, 'eslint-with-errors-fuzzy-match'),
        existing,
        { shouldRemove: () => true }
      );

      expect(stableTodoFragment(add)).toMatchInlineSnapshot(`[]`);
      expect(stableTodoFragment(remove)).toMatchInlineSnapshot(`[]`);
      expect(stableTodoFragment(stable)).toMatchInlineSnapshot(`
        [
          {
            "filePath": "app/utils/util.js",
            "range": {
              "end": {
                "column": 16,
                "line": 1,
              },
              "start": {
                "column": 10,
                "line": 1,
              },
            },
            "source": "b618e5603b05243a5fe81039b3b18551e963f07f",
          },
          {
            "filePath": "app/utils/util.js",
            "range": {
              "end": {
                "column": 15,
                "line": 2,
              },
              "start": {
                "column": 7,
                "line": 2,
              },
            },
            "source": "b7c8adf0cc8799f2488de3116a72fc2bd326fc1f",
          },
          {
            "filePath": "json-formatter.js",
            "range": {
              "end": {
                "column": 7,
                "line": 18,
              },
              "start": {
                "column": 1,
                "line": 18,
              },
            },
            "source": "cfc137fb4c575a1564e767297c7f2b9dc4748a12",
          },
          {
            "filePath": "rule-config.js",
            "range": {
              "end": {
                "column": 7,
                "line": 1,
              },
              "start": {
                "column": 1,
                "line": 1,
              },
            },
            "source": "cfc137fb4c575a1564e767297c7f2b9dc4748a12",
          },
        ]
      `);
      expect(stableTodoFragment(expired)).toMatchInlineSnapshot(`
        [
          {
            "filePath": "app/components/foo.js",
            "range": {
              "end": {
                "column": 13,
                "line": 7,
              },
              "start": {
                "column": 9,
                "line": 7,
              },
            },
            "source": "5ae05cec9a70e6badfa35fee65306763961f070e",
          },
        ]
      `);
    });
  });
});
