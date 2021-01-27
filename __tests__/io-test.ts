import { existsSync, readdir, statSync } from 'fs-extra';
import { posix } from 'path';
import {
  buildTodoData,
  ensureTodoStorageDir,
  ensureTodoStorageDirSync,
  getTodoBatches,
  getTodoBatchesSync,
  todoDirFor,
  todoFileNameFor,
  todoFilePathFor,
  todoStorageDirExists,
  writeTodos,
  writeTodosSync,
  readTodosSync,
  readTodos,
  getDatePart,
  getTodoStorageDirPath,
} from '../src';
import { LintResult, TodoData } from '../src/types';
import { createTmpDir } from './__utils__/tmp-dir';
import { updatePaths } from './__utils__';
import { getFixture } from './__utils__/get-fixture';

const TODO_DATA: TodoData = {
  engine: 'eslint',
  filePath: 'app/controllers/settings.js',
  ruleId: 'no-prototype-builtins',
  line: 25,
  column: 21,
  createdDate: getDatePart(new Date('12/11/2020')).getTime(),
};

async function readFiles(todoStorageDir: string) {
  const fileNames: string[] = [];
  const todoFileDirs = await readdir(todoStorageDir);

  for (const todoFileDir of todoFileDirs) {
    const files = (await readdir(posix.join(todoStorageDir, todoFileDir))).map((file) =>
      posix.join(todoFileDir, file)
    );

    fileNames.push(...files);
  }

  return fileNames;
}

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
      ensureTodoStorageDirSync(tmp);

      expect(todoStorageDirExists(tmp)).toEqual(true);
    });

    it('returns true when directory exists', async () => {
      await ensureTodoStorageDir(tmp);

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

  describe('writeTodosSync', () => {
    it("creates .lint-todo directory if one doesn't exist", async () => {
      const todoDir = getTodoStorageDirPath(tmp);

      writeTodosSync(tmp, []);

      expect(existsSync(todoDir)).toEqual(true);
    });

    it("doesn't write files when no todos provided", async () => {
      writeTodosSync(tmp, []);

      expect(readTodosSync(tmp).size).toEqual(0);
    });

    it('generates todos when todos provided', async () => {
      const [added] = writeTodosSync(tmp, getFixture('eslint-with-errors', tmp));

      expect(added).toEqual(18);
      expect(readTodosSync(tmp).size).toEqual(18);
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

      const todoDir = getTodoStorageDirPath(tmp);
      const [added] = writeTodosSync(tmp, updatePaths<LintResult>(tmp, initialTodos));
      const initialFiles = await readFiles(todoDir);

      expect(added).toEqual(2);
      expect(initialFiles).toHaveLength(2);

      const initialFileStats = initialFiles.map((file) => {
        return {
          fileName: file,
          ctime: statSync(posix.join(todoDir, file)).ctime,
        };
      });

      writeTodosSync(tmp, getFixture('eslint-with-errors', tmp));

      const subsequentFiles = await readFiles(todoDir);

      expect(subsequentFiles).toHaveLength(18);

      initialFileStats.forEach((initialFileStat) => {
        const subsequentFile = statSync(posix.join(todoDir, initialFileStat.fileName));

        expect(subsequentFile.ctime).toEqual(initialFileStat.ctime);
      });
    });

    it('removes old todos if todos no longer contains violations', async () => {
      const fixture = getFixture('eslint-with-errors', tmp);
      const todoDir = getTodoStorageDirPath(tmp);

      const [added] = writeTodosSync(tmp, fixture);

      const initialFiles = await readFiles(todoDir);

      expect(added).toEqual(18);
      expect(initialFiles).toHaveLength(18);

      const firstHalf = fixture.slice(0, 3);
      const secondHalf = fixture.slice(3, fixture.length);

      const [, removed] = writeTodosSync(tmp, firstHalf);

      const subsequentFiles = await readFiles(todoDir);

      expect(removed).toEqual(11);
      expect(subsequentFiles).toHaveLength(7);

      buildTodoData(tmp, secondHalf).forEach((todoDatum) => {
        expect(!existsSync(posix.join(todoDir, `${todoFilePathFor(todoDatum)}.json`))).toEqual(
          true
        );
      });
    });

    it('does not remove old todos if todos no longer contains violations if skipRemoval is true', async () => {
      const fixture = getFixture('eslint-with-errors', tmp);
      const todoDir = getTodoStorageDirPath(tmp);

      const [added] = writeTodosSync(tmp, fixture);

      const initialFiles = await readFiles(todoDir);

      expect(added).toEqual(18);
      expect(initialFiles).toHaveLength(18);

      const firstHalf = fixture.slice(0, 3);

      const [, removed] = writeTodosSync(tmp, firstHalf, { skipRemoval: true });

      const subsequentFiles = await readFiles(todoDir);

      expect(removed).toEqual(0);
      expect(subsequentFiles).toHaveLength(18);
    });
  });

  describe('writeTodosSync for single file', () => {
    it('generates todos for a specific filePath', async () => {
      const todoDir = getTodoStorageDirPath(tmp);
      const [added] = writeTodosSync(tmp, getFixture('single-file-todo', tmp), {
        filePath: 'app/controllers/settings.js',
      });

      expect(added).toEqual(3);
      expect(await readFiles(todoDir)).toMatchInlineSnapshot(`
        Array [
          "0a1e71cf4d0931e81f494d5a73a550016814e15a/53e7a9a0.json",
          "0a1e71cf4d0931e81f494d5a73a550016814e15a/6e3be839.json",
          "0a1e71cf4d0931e81f494d5a73a550016814e15a/aad8bc25.json",
        ]
      `);
    });

    it('updates todos for a specific filePath', async () => {
      const todoDir = getTodoStorageDirPath(tmp);
      const [added] = writeTodosSync(tmp, getFixture('single-file-todo', tmp), {
        filePath: 'app/controllers/settings.js',
      });

      expect(added).toEqual(3);
      expect(await readFiles(todoDir)).toMatchInlineSnapshot(`
        Array [
          "0a1e71cf4d0931e81f494d5a73a550016814e15a/53e7a9a0.json",
          "0a1e71cf4d0931e81f494d5a73a550016814e15a/6e3be839.json",
          "0a1e71cf4d0931e81f494d5a73a550016814e15a/aad8bc25.json",
        ]
      `);

      const [added2, removed2] = writeTodosSync(tmp, getFixture('single-file-todo-updated', tmp), {
        filePath: 'app/controllers/settings.js',
      });

      expect(added2).toEqual(1);
      expect(removed2).toEqual(1);
      expect(await readFiles(todoDir)).toMatchInlineSnapshot(`
        Array [
          "0a1e71cf4d0931e81f494d5a73a550016814e15a/6e3be839.json",
          "0a1e71cf4d0931e81f494d5a73a550016814e15a/aad8bc25.json",
          "0a1e71cf4d0931e81f494d5a73a550016814e15a/ee492fc4.json",
        ]
      `);
    });

    it('deletes todos for a specific filePath', async () => {
      const todoDir = getTodoStorageDirPath(tmp);
      const [added] = writeTodosSync(tmp, getFixture('single-file-todo', tmp), {
        filePath: 'app/controllers/settings.js',
      });

      expect(added).toEqual(3);
      expect(await readFiles(todoDir)).toMatchInlineSnapshot(`
        Array [
          "0a1e71cf4d0931e81f494d5a73a550016814e15a/53e7a9a0.json",
          "0a1e71cf4d0931e81f494d5a73a550016814e15a/6e3be839.json",
          "0a1e71cf4d0931e81f494d5a73a550016814e15a/aad8bc25.json",
        ]
      `);

      const [added2, removed2] = writeTodosSync(tmp, getFixture('single-file-no-errors', tmp), {
        filePath: 'app/controllers/settings.js',
      });

      expect(added2).toEqual(0);
      expect(removed2).toEqual(3);
      expect(await readFiles(todoDir)).toHaveLength(0);
      expect(await readdir(todoDir)).toHaveLength(0);
    });
  });

  describe('writeTodos', () => {
    it("creates .lint-todo directory if one doesn't exist", async () => {
      const todoDir = getTodoStorageDirPath(tmp);

      await writeTodos(tmp, []);

      expect(existsSync(todoDir)).toEqual(true);
    });

    it("doesn't write files when no todos provided", async () => {
      await writeTodos(tmp, []);

      expect((await readTodos(tmp)).size).toEqual(0);
    });

    it('generates todos when todos provided', async () => {
      const [added] = await writeTodos(tmp, getFixture('eslint-with-errors', tmp));

      expect(added).toEqual(18);
      expect((await readTodos(tmp)).size).toEqual(18);
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

      const todoDir = getTodoStorageDirPath(tmp);
      const [added] = await writeTodos(tmp, updatePaths<LintResult>(tmp, initialTodos));
      const initialFiles = await readFiles(todoDir);

      expect(added).toEqual(2);
      expect(initialFiles).toHaveLength(2);

      const initialFileStats = initialFiles.map((file) => {
        return {
          fileName: file,
          ctime: statSync(posix.join(todoDir, file)).ctime,
        };
      });

      await writeTodos(tmp, getFixture('eslint-with-errors', tmp));

      const subsequentFiles = await readFiles(todoDir);

      expect(subsequentFiles).toHaveLength(18);

      initialFileStats.forEach((initialFileStat) => {
        const subsequentFile = statSync(posix.join(todoDir, initialFileStat.fileName));

        expect(subsequentFile.ctime).toEqual(initialFileStat.ctime);
      });
    });

    it('removes old todos if todos no longer contains violations', async () => {
      const fixture = getFixture('eslint-with-errors', tmp);
      const todoDir = getTodoStorageDirPath(tmp);

      const [added] = await writeTodos(tmp, fixture);

      const initialFiles = await readFiles(todoDir);

      expect(added).toEqual(18);
      expect(initialFiles).toHaveLength(18);

      const firstHalf = fixture.slice(0, 3);
      const secondHalf = fixture.slice(3, fixture.length);

      const [, removed] = await writeTodos(tmp, firstHalf);

      const subsequentFiles = await readFiles(todoDir);

      expect(removed).toEqual(11);
      expect(subsequentFiles).toHaveLength(7);

      buildTodoData(tmp, secondHalf).forEach((todoDatum) => {
        expect(!existsSync(posix.join(todoDir, `${todoFilePathFor(todoDatum)}.json`))).toEqual(
          true
        );
      });
    });

    it('does not remove old todos if todos no longer contains violations if skipRemoval is true', async () => {
      const fixture = getFixture('eslint-with-errors', tmp);
      const todoDir = getTodoStorageDirPath(tmp);

      const [added] = await writeTodos(tmp, fixture);

      const initialFiles = await readFiles(todoDir);

      expect(added).toEqual(18);
      expect(initialFiles).toHaveLength(18);

      const firstHalf = fixture.slice(0, 3);

      const [, removed] = await writeTodos(tmp, firstHalf, { skipRemoval: true });

      const subsequentFiles = await readFiles(todoDir);

      expect(removed).toEqual(0);
      expect(subsequentFiles).toHaveLength(18);
    });
  });

  describe('writeTodos for single file', () => {
    it('generates todos for a specific filePath', async () => {
      const todoDir = getTodoStorageDirPath(tmp);
      const [added] = await writeTodos(tmp, getFixture('single-file-todo', tmp), {
        filePath: 'app/controllers/settings.js',
      });

      expect(added).toEqual(3);
      expect(await readFiles(todoDir)).toMatchInlineSnapshot(`
        Array [
          "0a1e71cf4d0931e81f494d5a73a550016814e15a/53e7a9a0.json",
          "0a1e71cf4d0931e81f494d5a73a550016814e15a/6e3be839.json",
          "0a1e71cf4d0931e81f494d5a73a550016814e15a/aad8bc25.json",
        ]
      `);
    });

    it('updates todos for a specific filePath', async () => {
      const todoDir = getTodoStorageDirPath(tmp);
      const [added] = await writeTodos(tmp, getFixture('single-file-todo', tmp), {
        filePath: 'app/controllers/settings.js',
      });

      expect(added).toEqual(3);
      expect(await readFiles(todoDir)).toMatchInlineSnapshot(`
        Array [
          "0a1e71cf4d0931e81f494d5a73a550016814e15a/53e7a9a0.json",
          "0a1e71cf4d0931e81f494d5a73a550016814e15a/6e3be839.json",
          "0a1e71cf4d0931e81f494d5a73a550016814e15a/aad8bc25.json",
        ]
      `);

      const [added2, removed2] = await writeTodos(
        tmp,
        getFixture('single-file-todo-updated', tmp),
        {
          filePath: 'app/controllers/settings.js',
        }
      );

      expect(added2).toEqual(1);
      expect(removed2).toEqual(1);
      expect(await readFiles(todoDir)).toMatchInlineSnapshot(`
        Array [
          "0a1e71cf4d0931e81f494d5a73a550016814e15a/6e3be839.json",
          "0a1e71cf4d0931e81f494d5a73a550016814e15a/aad8bc25.json",
          "0a1e71cf4d0931e81f494d5a73a550016814e15a/ee492fc4.json",
        ]
      `);
    });

    it('deletes todos for a specific filePath', async () => {
      const todoDir = getTodoStorageDirPath(tmp);
      const [added] = await writeTodos(tmp, getFixture('single-file-todo', tmp), {
        filePath: 'app/controllers/settings.js',
      });

      expect(added).toEqual(3);
      expect(await readFiles(todoDir)).toMatchInlineSnapshot(`
        Array [
          "0a1e71cf4d0931e81f494d5a73a550016814e15a/53e7a9a0.json",
          "0a1e71cf4d0931e81f494d5a73a550016814e15a/6e3be839.json",
          "0a1e71cf4d0931e81f494d5a73a550016814e15a/aad8bc25.json",
        ]
      `);

      const [added2, removed2] = await writeTodos(tmp, getFixture('single-file-no-errors', tmp), {
        filePath: 'app/controllers/settings.js',
      });

      expect(added2).toEqual(0);
      expect(removed2).toEqual(3);
      expect(await readFiles(todoDir)).toHaveLength(0);
      expect(await readdir(todoDir)).toHaveLength(0);
    });
  });

  describe('getTodoBatchesSync', () => {
    it('creates items to add', async () => {
      const [add] = getTodoBatchesSync(
        buildTodoData(tmp, getFixture('new-batches', tmp)),
        new Map()
      );

      expect([...add.keys()]).toMatchInlineSnapshot(`
        Array [
          "0a1e71cf4d0931e81f494d5a73a550016814e15a/6e3be839",
          "0a1e71cf4d0931e81f494d5a73a550016814e15a/aad8bc25",
          "0a1e71cf4d0931e81f494d5a73a550016814e15a/53e7a9a0",
          "60a67ad5c653f5b1a6537d9a6aee56c0662c0e35/b9046d34",
          "60a67ad5c653f5b1a6537d9a6aee56c0662c0e35/092271fa",
        ]
      `);
    });

    it('creates items to delete', async () => {
      const [, remove] = getTodoBatchesSync(
        new Map(),
        buildTodoData(tmp, getFixture('new-batches', tmp))
      );

      expect([...remove.keys()]).toMatchInlineSnapshot(`
        Array [
          "0a1e71cf4d0931e81f494d5a73a550016814e15a/6e3be839",
          "0a1e71cf4d0931e81f494d5a73a550016814e15a/aad8bc25",
          "0a1e71cf4d0931e81f494d5a73a550016814e15a/53e7a9a0",
          "60a67ad5c653f5b1a6537d9a6aee56c0662c0e35/b9046d34",
          "60a67ad5c653f5b1a6537d9a6aee56c0662c0e35/092271fa",
        ]
      `);
    });

    it('creates all batches', async () => {
      const [add, remove, stable] = getTodoBatchesSync(
        buildTodoData(tmp, getFixture('new-batches', tmp)),
        buildTodoData(tmp, getFixture('existing-batches', tmp))
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
    });
  });

  describe('getTodoBatches', () => {
    it('creates items to add', async () => {
      const [add] = await getTodoBatches(
        buildTodoData(tmp, getFixture('new-batches', tmp)),
        new Map()
      );

      expect([...add.keys()]).toMatchInlineSnapshot(`
        Array [
          "0a1e71cf4d0931e81f494d5a73a550016814e15a/6e3be839",
          "0a1e71cf4d0931e81f494d5a73a550016814e15a/aad8bc25",
          "0a1e71cf4d0931e81f494d5a73a550016814e15a/53e7a9a0",
          "60a67ad5c653f5b1a6537d9a6aee56c0662c0e35/b9046d34",
          "60a67ad5c653f5b1a6537d9a6aee56c0662c0e35/092271fa",
        ]
      `);
    });

    it('creates items to delete', async () => {
      const [, remove] = await getTodoBatches(
        new Map(),
        buildTodoData(tmp, getFixture('new-batches', tmp))
      );

      expect([...remove.keys()]).toMatchInlineSnapshot(`
        Array [
          "0a1e71cf4d0931e81f494d5a73a550016814e15a/6e3be839",
          "0a1e71cf4d0931e81f494d5a73a550016814e15a/aad8bc25",
          "0a1e71cf4d0931e81f494d5a73a550016814e15a/53e7a9a0",
          "60a67ad5c653f5b1a6537d9a6aee56c0662c0e35/b9046d34",
          "60a67ad5c653f5b1a6537d9a6aee56c0662c0e35/092271fa",
        ]
      `);
    });

    it('creates all batches', async () => {
      const [add, remove, stable] = await getTodoBatches(
        buildTodoData(tmp, getFixture('new-batches', tmp)),
        buildTodoData(tmp, getFixture('existing-batches', tmp))
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
    });
  });
});
