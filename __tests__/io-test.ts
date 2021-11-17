import { existsSync } from 'fs-extra';
import { subDays } from 'date-fns';
import {
  ensureTodoStorageDir,
  getDatePart,
  getTodoStorageFilePath,
  getTodoBatches,
  todoDirFor,
  todoFileNameFor,
  todoFilePathFor,
  todoStorageDirExists,
  todoStorageFileExists,
  readTodoData,
  readTodos,
  writeTodos,
} from '../src';
import { LintResult, TodoDataV2, TodoFilePathHash } from '../src/types';
import { createTmpDir } from './__utils__/tmp-dir';
import { getFixture } from './__utils__/get-fixture';
import TodoMatcher from '../src/todo-matcher';
import {
  buildMaybeTodos,
  buildExistingTodos,
  buildMaybeTodosFromFixture,
  buildExistingTodosFromFixture,
} from './__utils__/build-todo-data';
import { readTodoStorageFile } from '../src/io';

const TODO_DATA: TodoDataV2 = {
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
      column: 21,
    },
  },
  source: '',
  createdDate: getDatePart(new Date('12/11/2020')).getTime(),
  fileFormat: 2,
};

function chunk<T>(initial: Set<T>, firstChunk = 1): [Set<T>, Set<T>] {
  const fixtureArr = [...initial];
  const firstHalf = fixtureArr.slice(0, firstChunk);
  const secondHalf = fixtureArr.slice(firstChunk, fixtureArr.length);

  return [new Set(firstHalf), new Set(secondHalf)];
}

jest.setTimeout(100000);

describe('io', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = createTmpDir();
  });

  describe('todoStorageDirExists', () => {
    it('returns false when directory does not exist', async () => {
      expect(todoStorageDirExists(tmp)).toEqual(false);
    });

    it('returns true when directory exists sync', async () => {
      ensureTodoStorageDir(tmp);

      expect(todoStorageDirExists(tmp)).toEqual(true);
    });
  });

  describe('todoStorageFileExists', () => {
    it('returns false when file does not exist', async () => {
      expect(todoStorageFileExists(tmp)).toEqual(false);
    });

    it('returns true when directory exists sync', async () => {
      ensureTodoStorageDir(tmp);

      expect(todoStorageDirExists(tmp)).toEqual(true);
    });
  });

  describe('todoFileNameFor', () => {
    it('can generate a unique hash for todo', () => {
      const fileName = todoFileNameFor(TODO_DATA);

      expect(fileName).toEqual('6e3be839');
    });

    it('generates idempotent file names', () => {
      const fileName = todoFileNameFor(TODO_DATA);
      const secondFileName = todoFileNameFor(TODO_DATA);

      expect(fileName).toEqual('6e3be839');
      expect(secondFileName).toEqual('6e3be839');
    });
  });

  describe('todoDirFor', () => {
    it('can generate a unique dir hash for todo', () => {
      const dir = todoDirFor(TODO_DATA.filePath);

      expect(dir).toEqual('0a1e71cf4d0931e81f494d5a73a550016814e15a');
    });

    it('generates idempotent dir names', () => {
      const dir1 = todoDirFor(TODO_DATA.filePath);
      const dir2 = todoDirFor(TODO_DATA.filePath);

      expect(dir1).toEqual(dir2);
    });
  });

  describe('todoFilePathFor', () => {
    it('can generate a unique file path for todo', () => {
      const dir = todoFilePathFor(TODO_DATA);

      expect(dir).toEqual('0a1e71cf4d0931e81f494d5a73a550016814e15a/6e3be839');
    });

    it('generates idempotent file paths', () => {
      const dir1 = todoFilePathFor(TODO_DATA);
      const dir2 = todoFilePathFor(TODO_DATA);

      expect(dir1).toEqual(dir2);
    });
  });

  describe('writeTodos', () => {
    it("creates .lint-todo directory if one doesn't exist", async () => {
      const todoFile = getTodoStorageFilePath(tmp);

      writeTodos(tmp, new Set());

      expect(existsSync(todoFile)).toEqual(true);
    });

    it("doesn't write files when no todos provided", async () => {
      writeTodos(tmp, new Set());

      expect(readTodos(tmp).size).toEqual(0);
    });

    it('generates todos when todos provided', async () => {
      const { addedCount } = writeTodos(tmp, buildMaybeTodosFromFixture(tmp, 'eslint-with-errors'));

      expect(addedCount).toEqual(18);
      expect(readTodoData(tmp)).toHaveLength(18);
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

      const { addedCount } = writeTodos(tmp, buildMaybeTodos(tmp, initialTodos));

      expect(addedCount).toEqual(2);
      expect(readTodoData(tmp)).toHaveLength(2);

      writeTodos(tmp, buildMaybeTodosFromFixture(tmp, 'eslint-with-errors'));

      const subsequentTodos = readTodoData(tmp);

      expect(subsequentTodos).toHaveLength(18);
    });

    it('removes old todos if todos no longer contains violations', async () => {
      const fixture = buildMaybeTodosFromFixture(tmp, 'eslint-with-errors');
      const { addedCount } = writeTodos(tmp, fixture);
      const initialTodos = readTodoData(tmp);

      expect(addedCount).toEqual(18);
      expect(initialTodos).toHaveLength(18);

      const [firstHalf] = chunk(fixture, 3);
      const { removedCount } = writeTodos(tmp, new Set(firstHalf));
      const subsequentTodos = readTodoData(tmp);

      expect(removedCount).toEqual(15);
      expect(subsequentTodos).toHaveLength(3);
    });

    it('does not remove old todos if todos no longer contains violations if shouldRemove returns false', async () => {
      const fixture = buildMaybeTodosFromFixture(tmp, 'eslint-with-errors');

      const { addedCount } = writeTodos(tmp, fixture);

      const initialFiles = readTodoData(tmp);

      expect(addedCount).toEqual(18);
      expect(initialFiles).toHaveLength(18);

      const [firstHalf] = chunk(fixture, 3);

      const { removedCount } = writeTodos(tmp, firstHalf, { shouldRemove: () => false });

      const subsequentFiles = readTodoData(tmp);

      expect(removedCount).toEqual(0);
      expect(subsequentFiles).toHaveLength(18);
    });
  });

  describe('writeTodos for single file', () => {
    it('generates todos for a specific filePath', async () => {
      const { addedCount } = writeTodos(tmp, buildMaybeTodosFromFixture(tmp, 'single-file-todo'), {
        filePath: 'app/controllers/settings.js',
      });

      expect(addedCount).toEqual(3);
      expect(readTodoData(tmp)).toMatchInlineSnapshot(`
        Array [
          Object {
            "createdDate": 1637107200000,
            "engine": "eslint",
            "errorDate": NaN,
            "fileFormat": 2,
            "filePath": "app/controllers/settings.js",
            "range": Object {
              "end": Object {
                "column": 35,
                "line": 25,
              },
              "start": Object {
                "column": 21,
                "line": 25,
              },
            },
            "ruleId": "no-prototype-builtins",
            "source": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
            "warnDate": NaN,
          },
          Object {
            "createdDate": 1637107200000,
            "engine": "eslint",
            "errorDate": NaN,
            "fileFormat": 2,
            "filePath": "app/controllers/settings.js",
            "range": Object {
              "end": Object {
                "column": 33,
                "line": 26,
              },
              "start": Object {
                "column": 19,
                "line": 26,
              },
            },
            "ruleId": "no-prototype-builtins",
            "source": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
            "warnDate": NaN,
          },
          Object {
            "createdDate": 1637107200000,
            "engine": "eslint",
            "errorDate": NaN,
            "fileFormat": 2,
            "filePath": "app/controllers/settings.js",
            "range": Object {
              "end": Object {
                "column": 48,
                "line": 32,
              },
              "start": Object {
                "column": 34,
                "line": 32,
              },
            },
            "ruleId": "no-prototype-builtins",
            "source": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
            "warnDate": NaN,
          },
        ]
      `);
    });

    it('updates todos for a specific filePath', async () => {
      const { addedCount } = writeTodos(tmp, buildMaybeTodosFromFixture(tmp, 'single-file-todo'), {
        filePath: 'app/controllers/settings.js',
      });

      expect(addedCount).toEqual(3);
      expect(readTodoData(tmp)).toMatchInlineSnapshot(`
        Array [
          Object {
            "createdDate": 1637107200000,
            "engine": "eslint",
            "errorDate": NaN,
            "fileFormat": 2,
            "filePath": "app/controllers/settings.js",
            "range": Object {
              "end": Object {
                "column": 35,
                "line": 25,
              },
              "start": Object {
                "column": 21,
                "line": 25,
              },
            },
            "ruleId": "no-prototype-builtins",
            "source": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
            "warnDate": NaN,
          },
          Object {
            "createdDate": 1637107200000,
            "engine": "eslint",
            "errorDate": NaN,
            "fileFormat": 2,
            "filePath": "app/controllers/settings.js",
            "range": Object {
              "end": Object {
                "column": 33,
                "line": 26,
              },
              "start": Object {
                "column": 19,
                "line": 26,
              },
            },
            "ruleId": "no-prototype-builtins",
            "source": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
            "warnDate": NaN,
          },
          Object {
            "createdDate": 1637107200000,
            "engine": "eslint",
            "errorDate": NaN,
            "fileFormat": 2,
            "filePath": "app/controllers/settings.js",
            "range": Object {
              "end": Object {
                "column": 48,
                "line": 32,
              },
              "start": Object {
                "column": 34,
                "line": 32,
              },
            },
            "ruleId": "no-prototype-builtins",
            "source": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
            "warnDate": NaN,
          },
        ]
      `);

      const counts = writeTodos(tmp, buildMaybeTodosFromFixture(tmp, 'single-file-todo-updated'), {
        filePath: 'app/controllers/settings.js',
      });

      expect(counts).toStrictEqual({
        addedCount: 1,
        expiredCount: 0,
        removedCount: 1,
        stableCount: 2,
      });
      expect(readTodoData(tmp)).toMatchInlineSnapshot(`
        Array [
          Object {
            "createdDate": 1637107200000,
            "engine": "eslint",
            "errorDate": NaN,
            "fileFormat": 2,
            "filePath": "app/controllers/settings.js",
            "range": Object {
              "end": Object {
                "column": 35,
                "line": 25,
              },
              "start": Object {
                "column": 21,
                "line": 25,
              },
            },
            "ruleId": "no-prototype-builtins",
            "source": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
            "warnDate": NaN,
          },
          Object {
            "createdDate": 1637107200000,
            "engine": "eslint",
            "errorDate": NaN,
            "fileFormat": 2,
            "filePath": "app/controllers/settings.js",
            "range": Object {
              "end": Object {
                "column": 33,
                "line": 26,
              },
              "start": Object {
                "column": 19,
                "line": 26,
              },
            },
            "ruleId": "no-prototype-builtins",
            "source": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
            "warnDate": NaN,
          },
          Object {
            "createdDate": 1637107200000,
            "engine": "eslint",
            "errorDate": NaN,
            "fileFormat": 2,
            "filePath": "app/controllers/settings.js",
            "range": Object {
              "end": Object {
                "column": 110,
                "line": 50,
              },
              "start": Object {
                "column": 101,
                "line": 50,
              },
            },
            "ruleId": "no-unused-vars",
            "source": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
            "warnDate": NaN,
          },
        ]
      `);
    });

    it('deletes todos for a specific filePath', async () => {
      const { addedCount } = writeTodos(tmp, buildMaybeTodosFromFixture(tmp, 'single-file-todo'), {
        filePath: 'app/controllers/settings.js',
      });

      expect(addedCount).toEqual(3);
      expect(readTodoData(tmp)).toMatchInlineSnapshot(`
        Array [
          Object {
            "createdDate": 1637107200000,
            "engine": "eslint",
            "errorDate": NaN,
            "fileFormat": 2,
            "filePath": "app/controllers/settings.js",
            "range": Object {
              "end": Object {
                "column": 35,
                "line": 25,
              },
              "start": Object {
                "column": 21,
                "line": 25,
              },
            },
            "ruleId": "no-prototype-builtins",
            "source": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
            "warnDate": NaN,
          },
          Object {
            "createdDate": 1637107200000,
            "engine": "eslint",
            "errorDate": NaN,
            "fileFormat": 2,
            "filePath": "app/controllers/settings.js",
            "range": Object {
              "end": Object {
                "column": 33,
                "line": 26,
              },
              "start": Object {
                "column": 19,
                "line": 26,
              },
            },
            "ruleId": "no-prototype-builtins",
            "source": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
            "warnDate": NaN,
          },
          Object {
            "createdDate": 1637107200000,
            "engine": "eslint",
            "errorDate": NaN,
            "fileFormat": 2,
            "filePath": "app/controllers/settings.js",
            "range": Object {
              "end": Object {
                "column": 48,
                "line": 32,
              },
              "start": Object {
                "column": 34,
                "line": 32,
              },
            },
            "ruleId": "no-prototype-builtins",
            "source": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
            "warnDate": NaN,
          },
        ]
      `);

      const { addedCount: addedCount2, removedCount } = writeTodos(
        tmp,
        buildMaybeTodosFromFixture(tmp, 'single-file-no-errors'),
        {
          filePath: 'app/controllers/settings.js',
        }
      );

      expect(addedCount2).toEqual(0);
      expect(removedCount).toEqual(3);
      expect(readTodoData(tmp)).toHaveLength(0);
    });
  });

  describe('readTodos', () => {
    it('can read empty storage file', () => {
      writeTodos(tmp, new Set());

      expect(readTodos(tmp).size).toEqual(0);
    });

    it('can read storage file with adds only', () => {
      const initialTodos = buildMaybeTodosFromFixture(tmp, 'eslint-with-errors');
      const { addedCount } = writeTodos(tmp, initialTodos);

      expect(readTodoData(tmp)).toHaveLength(addedCount);
    });

    it('can read storage file with adds and removes', () => {
      const initialTodos = buildMaybeTodosFromFixture(tmp, 'eslint-with-errors');
      const { addedCount } = writeTodos(tmp, initialTodos);

      expect(readTodoData(tmp)).toHaveLength(addedCount);

      const [firstChunk] = chunk(initialTodos, 2);

      const { removedCount } = writeTodos(tmp, firstChunk);

      expect(readTodoStorageFile(getTodoStorageFilePath(tmp))).toHaveLength(
        addedCount + removedCount
      );
      expect(readTodoData(tmp)).toHaveLength(2);
    });
  });

  describe('getTodoBatches', () => {
    it('generates no batches when lint results are empty', () => {
      const counts = getTodoBatches(new Set(), new Map(), {
        shouldRemove: () => true,
      });

      expect(counts).toMatchInlineSnapshot(`
        Object {
          "add": Map {},
          "expired": Map {},
          "remove": Map {},
          "stable": Map {},
        }
      `);
    });

    it('creates items to add', async () => {
      const { add } = getTodoBatches(buildMaybeTodosFromFixture(tmp, 'new-batches'), new Map(), {
        shouldRemove: () => true,
      });

      expect([...add.keys()]).toMatchInlineSnapshot(`
        Array [
          "0a1e71cf4d0931e81f494d5a73a550016814e15a/6e3be839",
          "0a1e71cf4d0931e81f494d5a73a550016814e15a/aad8bc25",
          "0a1e71cf4d0931e81f494d5a73a550016814e15a/53e7a9a0",
          "60a67ad5c653f5b1a6537d9a6aee56c0662c0e35/b9046d34",
          "60a67ad5c653f5b1a6537d9a6aee56c0662c0e35/092271fa",
          "60a67ad5c653f5b1a6537d9a6aee56c0662c0e35/cc71e5f9",
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

      expect([...remove.keys()]).toMatchInlineSnapshot(`
        Array [
          "0a1e71cf4d0931e81f494d5a73a550016814e15a/6e3be839",
          "0a1e71cf4d0931e81f494d5a73a550016814e15a/aad8bc25",
          "0a1e71cf4d0931e81f494d5a73a550016814e15a/53e7a9a0",
          "60a67ad5c653f5b1a6537d9a6aee56c0662c0e35/b9046d34",
          "60a67ad5c653f5b1a6537d9a6aee56c0662c0e35/092271fa",
          "60a67ad5c653f5b1a6537d9a6aee56c0662c0e35/cc71e5f9",
        ]
      `);
    });

    it('creates items to expire', async () => {
      const expiredBatches: Map<TodoFilePathHash, TodoMatcher> = buildExistingTodos(
        tmp,
        getFixture('new-batches', tmp, false)
      );
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const expiredTodo: TodoDataV2 = expiredBatches
        .get('60a67ad5c653f5b1a6537d9a6aee56c0662c0e35')!
        .find('cc71e5f9')!;

      expiredTodo.errorDate = subDays(getDatePart(), 1).getTime();

      // eslint-disable-next-line unicorn/no-unreadable-array-destructuring
      const { expired } = getTodoBatches(
        buildMaybeTodosFromFixture(tmp, 'new-batches'),
        expiredBatches,
        {
          shouldRemove: () => true,
        }
      );

      expect([...expired.keys()]).toMatchInlineSnapshot(`
        Array [
          "60a67ad5c653f5b1a6537d9a6aee56c0662c0e35/cc71e5f9",
        ]
      `);
    });

    it('creates all batches', async () => {
      const existingBatches: Map<TodoFilePathHash, TodoMatcher> = buildExistingTodosFromFixture(
        tmp,
        'existing-batches'
      );
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const expiredTodo: TodoDataV2 = existingBatches
        .get('60a67ad5c653f5b1a6537d9a6aee56c0662c0e35')!
        .find('cc71e5f9')!;

      expiredTodo.errorDate = subDays(getDatePart(), 1).getTime();

      const { add, remove, stable, expired } = getTodoBatches(
        buildMaybeTodosFromFixture(tmp, 'new-batches'),
        existingBatches,
        { shouldRemove: () => true }
      );

      expect([...add.keys()]).toMatchInlineSnapshot(`
        Array [
          "0a1e71cf4d0931e81f494d5a73a550016814e15a/6e3be839",
          "0a1e71cf4d0931e81f494d5a73a550016814e15a/aad8bc25",
          "0a1e71cf4d0931e81f494d5a73a550016814e15a/53e7a9a0",
        ]
      `);
      expect([...remove.keys()]).toMatchInlineSnapshot(`
        Array [
          "07d3818b8afefcdd7db6d52743309fdbb85313f0/66256fb7",
          "07d3818b8afefcdd7db6d52743309fdbb85313f0/8fd35486",
        ]
      `);
      expect([...stable.keys()]).toMatchInlineSnapshot(`
        Array [
          "60a67ad5c653f5b1a6537d9a6aee56c0662c0e35/b9046d34",
          "60a67ad5c653f5b1a6537d9a6aee56c0662c0e35/092271fa",
        ]
      `);
      expect([...expired.keys()]).toMatchInlineSnapshot(`
        Array [
          "60a67ad5c653f5b1a6537d9a6aee56c0662c0e35/cc71e5f9",
        ]
      `);
    });

    it('creates stable batches for fuzzy matches', () => {
      process.env.TODO_CREATED_DATE = new Date(2015, 1, 23).toJSON();

      const lintResults = getFixture('eslint-exact-matches', tmp, false);
      let existingTodos: Map<TodoFilePathHash, TodoMatcher> = buildExistingTodos(tmp, lintResults);

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
      let existingTodos: Map<TodoFilePathHash, TodoMatcher> = buildExistingTodos(tmp, lintResults);

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
        buildMaybeTodosFromFixture(tmp, 'eslint-with-errors-exact-match')
      );

      expect(addedCount).toEqual(5);

      const existing: Map<TodoFilePathHash, TodoMatcher> = readTodos(tmp);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const expiredTodo: TodoDataV2 = existing
        .get('d47704143ff2aa8b05d66fc59e790e126b7b3603')!
        .find('0c1a00af')!;

      expiredTodo.errorDate = subDays(getDatePart(), 1).getTime();

      const { add, remove, stable, expired } = getTodoBatches(
        buildMaybeTodosFromFixture(tmp, 'eslint-with-errors-exact-match'),
        existing,
        { shouldRemove: () => true }
      );

      expect([...add.keys()]).toMatchInlineSnapshot(`Array []`);
      expect([...remove.keys()]).toMatchInlineSnapshot(`Array []`);
      expect([...stable.keys()]).toMatchInlineSnapshot(`
          Array [
            "68e22b32dc9da5964fc73d75680c1cfad9532912/da773fcf",
            "a0b23a0fa099c0ae674ec53a04fc6a6278526141/fb219dc1",
            "a0b23a0fa099c0ae674ec53a04fc6a6278526141/ce6ecd57",
            "b6f600233b5a01e7165bcaf27ea6730b6213f331/fb17ee16",
          ]
        `);
      expect([...expired.keys()]).toMatchInlineSnapshot(`
          Array [
            "d47704143ff2aa8b05d66fc59e790e126b7b3603/0c1a00af",
          ]
        `);
    });

    it(`creates only stable and expired batches for fuzzy match`, async () => {
      const { addedCount } = writeTodos(
        tmp,
        buildMaybeTodosFromFixture(tmp, 'eslint-with-errors-exact-match')
      );

      expect(addedCount).toEqual(5);

      const existing: Map<TodoFilePathHash, TodoMatcher> = readTodos(tmp);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const expiredTodo: TodoDataV2 = existing
        .get('d47704143ff2aa8b05d66fc59e790e126b7b3603')!
        .find('0c1a00af')!;

      expiredTodo.errorDate = subDays(getDatePart(), 1).getTime();

      const { add, remove, stable, expired } = getTodoBatches(
        buildMaybeTodosFromFixture(tmp, 'eslint-with-errors-fuzzy-match'),
        existing,
        { shouldRemove: () => true }
      );

      expect([...add.keys()]).toMatchInlineSnapshot(`Array []`);
      expect([...remove.keys()]).toMatchInlineSnapshot(`Array []`);
      expect([...stable.keys()]).toMatchInlineSnapshot(`
          Array [
            "a0b23a0fa099c0ae674ec53a04fc6a6278526141/fb219dc1",
            "a0b23a0fa099c0ae674ec53a04fc6a6278526141/ce6ecd57",
            "b6f600233b5a01e7165bcaf27ea6730b6213f331/fb17ee16",
            "68e22b32dc9da5964fc73d75680c1cfad9532912/da773fcf",
          ]
        `);
      expect([...expired.keys()]).toMatchInlineSnapshot(`
          Array [
            "d47704143ff2aa8b05d66fc59e790e126b7b3603/0c1a00af",
          ]
        `);
    });
  });
});
