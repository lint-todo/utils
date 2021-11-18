import { existsSync } from 'fs-extra';
import { subDays } from 'date-fns';
import {
  getDatePart,
  getTodoStorageFilePath,
  getTodoBatches,
  todoStorageFileExists,
  readTodoData,
  readTodos,
  writeTodos,
} from '../src';
import { FilePath, LintResult, TodoDataV2 } from '../src/types';
import { createTmpDir } from './__utils__/tmp-dir';
import { getFixture } from './__utils__/get-fixture';
import TodoMatcher from '../src/todo-matcher';
import {
  buildMaybeTodos,
  buildExistingTodos,
  buildMaybeTodosFromFixture,
  buildExistingTodosFromFixture,
} from './__utils__/build-todo-data';
import {
  ensureTodoStorageFile,
  hasConflicts,
  readTodoStorageFile,
  resolveConflicts,
} from '../src/io';

function chunk<T>(initial: Set<T>, firstChunk = 1): [Set<T>, Set<T>] {
  const fixtureArr = [...initial];
  const firstHalf = fixtureArr.slice(0, firstChunk);
  const secondHalf = fixtureArr.slice(firstChunk, fixtureArr.length);

  return [new Set(firstHalf), new Set(secondHalf)];
}

function stableTodoFragment(todoData: Set<TodoDataV2>) {
  return [...todoData].map((todoDatum) => {
    return {
      filePath: todoDatum.filePath,
      range: todoDatum.range,
      source: todoDatum.source,
    };
  });
}

jest.setTimeout(100000);

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

  describe('hasConflicts', () => {
    it('returns false if no conflicts are detected', () => {
      const noConflicts = `add|eslint|no-prototype-builtins|25|21|25|35|da39a3ee5e6b4b0d3255bfef95601890afd80709|2|1637107200000|||app/controllers/settings.js
add|eslint|no-prototype-builtins|26|19|26|33|da39a3ee5e6b4b0d3255bfef95601890afd80709|2|1637107200000|||app/controllers/settings.js
      `;

      expect(hasConflicts(noConflicts)).toEqual(false);
    });

    it('returns true if conflicts are detected', () => {
      const conflicts = `add|eslint|no-prototype-builtins|25|21|25|35|da39a3ee5e6b4b0d3255bfef95601890afd80709|2|1637107200000|||app/controllers/settings.js
add|eslint|no-prototype-builtins|26|19|26|33|da39a3ee5e6b4b0d3255bfef95601890afd80709|2|1637107200000|||app/controllers/settings.js
<<<<<<< .lint-todo
add|eslint|no-prototype-builtins|30|19|30|33|da39a3ee5e6b4b0d3255bfef95601890afd80709|2|1637107200000|||app/controllers/settings.js
=======
remove|eslint|no-unused-vars|30|19|30|33|da39a3ee5e6b4b0d3255bfef95601890afd80709|2|1637107200000|||app/controllers/settings.js
>>>>>>> .lint-todo
      `;

      expect(hasConflicts(conflicts)).toEqual(true);
    });
  });

  describe('resolveConflicts', () => {
    it('does not change operations when no conflicts are present', () => {
      const operations = [
        'add|eslint|no-prototype-builtins|25|21|25|35|da39a3ee5e6b4b0d3255bfef95601890afd80709|2|1637107200000|||app/controllers/settings.js',
        'add|eslint|no-prototype-builtins|26|19|26|33|da39a3ee5e6b4b0d3255bfef95601890afd80709|2|1637107200000|||app/controllers/settings.js',
      ];

      expect(resolveConflicts(operations)).toEqual(operations);
    });

    it('resolves conflicts when detected', () => {
      const operations = [
        'add|eslint|no-prototype-builtins|25|21|25|35|da39a3ee5e6b4b0d3255bfef95601890afd80709|2|1637107200000|||app/controllers/settings.js',
        'add|eslint|no-prototype-builtins|26|19|26|33|da39a3ee5e6b4b0d3255bfef95601890afd80709|2|1637107200000|||app/controllers/settings.js',
        '<<<<<<< .lint-todo',
        'add|eslint|no-prototype-builtins|30|19|30|33|da39a3ee5e6b4b0d3255bfef95601890afd80709|2|1637107200000|||app/controllers/settings.js',
        '=======',
        'remove|eslint|no-unused-vars|30|19|30|33|da39a3ee5e6b4b0d3255bfef95601890afd80709|2|1637107200000|||app/controllers/settings.js',
        '>>>>>>> .lint-todo',
      ];

      expect(resolveConflicts(operations)).toEqual([
        'add|eslint|no-prototype-builtins|25|21|25|35|da39a3ee5e6b4b0d3255bfef95601890afd80709|2|1637107200000|||app/controllers/settings.js',
        'add|eslint|no-prototype-builtins|26|19|26|33|da39a3ee5e6b4b0d3255bfef95601890afd80709|2|1637107200000|||app/controllers/settings.js',
        'add|eslint|no-prototype-builtins|30|19|30|33|da39a3ee5e6b4b0d3255bfef95601890afd80709|2|1637107200000|||app/controllers/settings.js',
        'remove|eslint|no-unused-vars|30|19|30|33|da39a3ee5e6b4b0d3255bfef95601890afd80709|2|1637107200000|||app/controllers/settings.js',
      ]);
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
      expect(readTodoData(tmp).size).toEqual(18);
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
      expect(readTodoData(tmp).size).toEqual(2);

      writeTodos(tmp, buildMaybeTodosFromFixture(tmp, 'eslint-with-errors'));

      const subsequentTodos = readTodoData(tmp);

      expect(subsequentTodos.size).toEqual(18);
    });

    it('removes old todos if todos no longer contains violations', async () => {
      const fixture = buildMaybeTodosFromFixture(tmp, 'eslint-with-errors');
      const { addedCount } = writeTodos(tmp, fixture);
      const initialTodos = readTodoData(tmp);

      expect(addedCount).toEqual(18);
      expect(initialTodos.size).toEqual(18);

      const [firstHalf] = chunk(fixture, 3);
      const { removedCount } = writeTodos(tmp, new Set(firstHalf));
      const subsequentTodos = readTodoData(tmp);

      expect(removedCount).toEqual(15);
      expect(subsequentTodos.size).toEqual(3);
    });

    it('does not remove old todos if todos no longer contains violations if shouldRemove returns false', async () => {
      const fixture = buildMaybeTodosFromFixture(tmp, 'eslint-with-errors');

      const { addedCount } = writeTodos(tmp, fixture);

      const initialFiles = readTodoData(tmp);

      expect(addedCount).toEqual(18);
      expect(initialFiles.size).toEqual(18);

      const [firstHalf] = chunk(fixture, 3);

      const { removedCount } = writeTodos(tmp, firstHalf, { shouldRemove: () => false });

      const subsequentFiles = readTodoData(tmp);

      expect(removedCount).toEqual(0);
      expect(subsequentFiles.size).toEqual(18);
    });
  });

  describe('writeTodos for single file', () => {
    it('generates todos for a specific filePath', async () => {
      const { addedCount } = writeTodos(tmp, buildMaybeTodosFromFixture(tmp, 'single-file-todo'), {
        filePath: 'app/controllers/settings.js',
      });

      expect(addedCount).toEqual(3);
      expect(stableTodoFragment(readTodoData(tmp))).toMatchInlineSnapshot(`
        Array [
          Object {
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
            "source": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
          },
          Object {
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
            "source": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
          },
          Object {
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
            "source": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
          },
        ]
      `);
    });

    it('updates todos for a specific filePath', async () => {
      const { addedCount } = writeTodos(tmp, buildMaybeTodosFromFixture(tmp, 'single-file-todo'), {
        filePath: 'app/controllers/settings.js',
      });

      expect(addedCount).toEqual(3);
      expect(stableTodoFragment(readTodoData(tmp))).toMatchInlineSnapshot(`
        Array [
          Object {
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
            "source": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
          },
          Object {
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
            "source": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
          },
          Object {
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
            "source": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
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
      expect(stableTodoFragment(readTodoData(tmp))).toMatchInlineSnapshot(`
        Array [
          Object {
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
            "source": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
          },
          Object {
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
            "source": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
          },
          Object {
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
            "source": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
          },
        ]
      `);
    });

    it('deletes todos for a specific filePath', async () => {
      const { addedCount } = writeTodos(tmp, buildMaybeTodosFromFixture(tmp, 'single-file-todo'), {
        filePath: 'app/controllers/settings.js',
      });

      expect(addedCount).toEqual(3);
      expect(stableTodoFragment(readTodoData(tmp))).toMatchInlineSnapshot(`
        Array [
          Object {
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
            "source": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
          },
          Object {
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
            "source": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
          },
          Object {
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
            "source": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
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
      expect(readTodoData(tmp).size).toEqual(0);
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

      expect(readTodoData(tmp).size).toEqual(addedCount);
    });

    it('can read storage file with adds and removes', () => {
      const initialTodos = buildMaybeTodosFromFixture(tmp, 'eslint-with-errors');
      const { addedCount } = writeTodos(tmp, initialTodos);

      expect(readTodoData(tmp).size).toEqual(addedCount);

      const [firstChunk] = chunk(initialTodos, 2);

      const { removedCount } = writeTodos(tmp, firstChunk);

      expect(readTodoStorageFile(getTodoStorageFilePath(tmp))).toHaveLength(
        addedCount + removedCount
      );
      expect(readTodoData(tmp).size).toEqual(2);
    });
  });

  describe('getTodoBatches', () => {
    it('generates no batches when lint results are empty', () => {
      const { add, remove, stable, expired } = getTodoBatches(new Set(), new Map(), {
        shouldRemove: () => true,
      });

      expect(stableTodoFragment(add)).toMatchInlineSnapshot(`Array []`);
      expect(stableTodoFragment(remove)).toMatchInlineSnapshot(`Array []`);
      expect(stableTodoFragment(stable)).toMatchInlineSnapshot(`Array []`);
      expect(stableTodoFragment(expired)).toMatchInlineSnapshot(`Array []`);
    });

    it('creates items to add', async () => {
      const { add } = getTodoBatches(buildMaybeTodosFromFixture(tmp, 'new-batches'), new Map(), {
        shouldRemove: () => true,
      });

      expect(stableTodoFragment(add)).toMatchInlineSnapshot(`
        Array [
          Object {
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
            "source": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
          },
          Object {
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
            "source": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
          },
          Object {
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
            "source": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
          },
          Object {
            "filePath": "app/initializers/tracer.js",
            "range": Object {
              "end": Object {
                "column": 17,
                "line": 1,
              },
              "start": Object {
                "column": 11,
                "line": 1,
              },
            },
            "source": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
          },
          Object {
            "filePath": "app/initializers/tracer.js",
            "range": Object {
              "end": Object {
                "column": 33,
                "line": 1,
              },
              "start": Object {
                "column": 19,
                "line": 1,
              },
            },
            "source": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
          },
          Object {
            "filePath": "app/initializers/tracer.js",
            "range": Object {
              "end": Object {
                "column": 133,
                "line": 1,
              },
              "start": Object {
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
        Array [
          Object {
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
            "source": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
          },
          Object {
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
            "source": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
          },
          Object {
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
            "source": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
          },
          Object {
            "filePath": "app/initializers/tracer.js",
            "range": Object {
              "end": Object {
                "column": 17,
                "line": 1,
              },
              "start": Object {
                "column": 11,
                "line": 1,
              },
            },
            "source": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
          },
          Object {
            "filePath": "app/initializers/tracer.js",
            "range": Object {
              "end": Object {
                "column": 33,
                "line": 1,
              },
              "start": Object {
                "column": 19,
                "line": 1,
              },
            },
            "source": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
          },
          Object {
            "filePath": "app/initializers/tracer.js",
            "range": Object {
              "end": Object {
                "column": 133,
                "line": 1,
              },
              "start": Object {
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
      const expiredTodo: TodoDataV2 = expiredBatches
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
        Array [
          Object {
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
      const expiredTodo: TodoDataV2 = existingBatches
        .get('app/initializers/tracer.js')!
        .find((todoDatum) => todoDatum.filePath)!;

      expiredTodo.errorDate = subDays(getDatePart(), 1).getTime();

      const { add, remove, stable, expired } = getTodoBatches(
        buildMaybeTodosFromFixture(tmp, 'new-batches'),
        existingBatches,
        { shouldRemove: () => true }
      );

      expect(stableTodoFragment(add)).toMatchInlineSnapshot(`
        Array [
          Object {
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
            "source": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
          },
          Object {
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
            "source": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
          },
          Object {
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
            "source": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
          },
        ]
      `);
      expect(stableTodoFragment(remove)).toMatchInlineSnapshot(`
        Array [
          Object {
            "filePath": "app/models/build.js",
            "range": Object {
              "end": Object {
                "column": 64,
                "line": 108,
              },
              "start": Object {
                "column": 50,
                "line": 108,
              },
            },
            "source": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
          },
          Object {
            "filePath": "app/models/build.js",
            "range": Object {
              "end": Object {
                "column": 39,
                "line": 120,
              },
              "start": Object {
                "column": 25,
                "line": 120,
              },
            },
            "source": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
          },
        ]
      `);
      expect(stableTodoFragment(stable)).toMatchInlineSnapshot(`
        Array [
          Object {
            "filePath": "app/initializers/tracer.js",
            "range": Object {
              "end": Object {
                "column": 33,
                "line": 1,
              },
              "start": Object {
                "column": 19,
                "line": 1,
              },
            },
            "source": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
          },
          Object {
            "filePath": "app/initializers/tracer.js",
            "range": Object {
              "end": Object {
                "column": 133,
                "line": 1,
              },
              "start": Object {
                "column": 119,
                "line": 1,
              },
            },
            "source": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
          },
        ]
      `);
      expect(stableTodoFragment(expired)).toMatchInlineSnapshot(`
        Array [
          Object {
            "filePath": "app/initializers/tracer.js",
            "range": Object {
              "end": Object {
                "column": 17,
                "line": 1,
              },
              "start": Object {
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
        buildMaybeTodosFromFixture(tmp, 'eslint-with-errors-exact-match')
      );

      expect(addedCount).toEqual(5);

      const existing: Map<FilePath, TodoMatcher> = readTodos(tmp);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const expiredTodo: TodoDataV2 = existing
        .get('app/components/foo.js')!
        .find((todoDatum) => todoDatum.filePath)!;

      expiredTodo.errorDate = subDays(getDatePart(), 1).getTime();

      const { add, remove, stable, expired } = getTodoBatches(
        buildMaybeTodosFromFixture(tmp, 'eslint-with-errors-exact-match'),
        existing,
        { shouldRemove: () => true }
      );

      expect(stableTodoFragment(add)).toMatchInlineSnapshot(`Array []`);
      expect(stableTodoFragment(remove)).toMatchInlineSnapshot(`Array []`);
      expect(stableTodoFragment(stable)).toMatchInlineSnapshot(`
        Array [
          Object {
            "filePath": "app/utils/util.js",
            "range": Object {
              "end": Object {
                "column": 16,
                "line": 1,
              },
              "start": Object {
                "column": 10,
                "line": 1,
              },
            },
            "source": "b618e5603b05243a5fe81039b3b18551e963f07f",
          },
          Object {
            "filePath": "app/utils/util.js",
            "range": Object {
              "end": Object {
                "column": 15,
                "line": 2,
              },
              "start": Object {
                "column": 7,
                "line": 2,
              },
            },
            "source": "b7c8adf0cc8799f2488de3116a72fc2bd326fc1f",
          },
          Object {
            "filePath": "json-formatter.js",
            "range": Object {
              "end": Object {
                "column": 7,
                "line": 18,
              },
              "start": Object {
                "column": 1,
                "line": 18,
              },
            },
            "source": "cfc137fb4c575a1564e767297c7f2b9dc4748a12",
          },
          Object {
            "filePath": "rule-config.js",
            "range": Object {
              "end": Object {
                "column": 7,
                "line": 1,
              },
              "start": Object {
                "column": 1,
                "line": 1,
              },
            },
            "source": "cfc137fb4c575a1564e767297c7f2b9dc4748a12",
          },
        ]
      `);
      expect(stableTodoFragment(expired)).toMatchInlineSnapshot(`
        Array [
          Object {
            "filePath": "app/components/foo.js",
            "range": Object {
              "end": Object {
                "column": 13,
                "line": 7,
              },
              "start": Object {
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
        buildMaybeTodosFromFixture(tmp, 'eslint-with-errors-exact-match')
      );

      expect(addedCount).toEqual(5);

      const existing: Map<FilePath, TodoMatcher> = readTodos(tmp);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const expiredTodo: TodoDataV2 = existing
        .get('app/components/foo.js')!
        .find((todoDatum) => todoDatum.filePath)!;

      expiredTodo.errorDate = subDays(getDatePart(), 1).getTime();

      const { add, remove, stable, expired } = getTodoBatches(
        buildMaybeTodosFromFixture(tmp, 'eslint-with-errors-fuzzy-match'),
        existing,
        { shouldRemove: () => true }
      );

      expect(stableTodoFragment(add)).toMatchInlineSnapshot(`Array []`);
      expect(stableTodoFragment(remove)).toMatchInlineSnapshot(`Array []`);
      expect(stableTodoFragment(stable)).toMatchInlineSnapshot(`
        Array [
          Object {
            "filePath": "app/utils/util.js",
            "range": Object {
              "end": Object {
                "column": 16,
                "line": 1,
              },
              "start": Object {
                "column": 10,
                "line": 1,
              },
            },
            "source": "b618e5603b05243a5fe81039b3b18551e963f07f",
          },
          Object {
            "filePath": "app/utils/util.js",
            "range": Object {
              "end": Object {
                "column": 15,
                "line": 2,
              },
              "start": Object {
                "column": 7,
                "line": 2,
              },
            },
            "source": "b7c8adf0cc8799f2488de3116a72fc2bd326fc1f",
          },
          Object {
            "filePath": "json-formatter.js",
            "range": Object {
              "end": Object {
                "column": 7,
                "line": 18,
              },
              "start": Object {
                "column": 1,
                "line": 18,
              },
            },
            "source": "cfc137fb4c575a1564e767297c7f2b9dc4748a12",
          },
          Object {
            "filePath": "rule-config.js",
            "range": Object {
              "end": Object {
                "column": 7,
                "line": 1,
              },
              "start": Object {
                "column": 1,
                "line": 1,
              },
            },
            "source": "cfc137fb4c575a1564e767297c7f2b9dc4748a12",
          },
        ]
      `);
      expect(stableTodoFragment(expired)).toMatchInlineSnapshot(`
        Array [
          Object {
            "filePath": "app/components/foo.js",
            "range": Object {
              "end": Object {
                "column": 13,
                "line": 7,
              },
              "start": Object {
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
