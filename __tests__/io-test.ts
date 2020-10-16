import { existsSync, readdir, statSync } from 'fs-extra';
import { join } from 'path';
import {
  buildTodoData,
  writeTodos,
  getTodoBatches,
  todoDirFor,
  todoFileNameFor,
  todoFilePathFor,
} from '../src';
import { LintResult, TodoData } from '../src/types';
import { createTmpDir } from './__utils__/tmp-dir';
import fixtures from './__fixtures__/fixtures';
import { updatePaths } from './__utils__';

const TODO_DATA: TodoData = {
  engine: 'eslint',
  filePath: 'app/controllers/settings.js',
  ruleId: 'no-prototype-builtins',
  line: 25,
  column: 21,
  createdDate: 1601324202150,
};

async function readFiles(todoStorageDir: string) {
  const fileNames: string[] = [];
  const todoFileDirs = await readdir(todoStorageDir);

  for (const todoFileDir of todoFileDirs) {
    const files = (await readdir(join(todoStorageDir, todoFileDir))).map((file) =>
      join(todoFileDir, file)
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
      const todoDir = await writeTodos(tmp, []);

      expect(existsSync(todoDir)).toEqual(true);
    });

    it("doesn't write files when no todos provided", async () => {
      const todoDir = await writeTodos(tmp, []);

      expect(await readFiles(todoDir)).toHaveLength(0);
    });

    it('generates todos when todos provided', async () => {
      const todoDir = await writeTodos(tmp, fixtures.eslintWithErrors(tmp));

      expect(await readFiles(todoDir)).toHaveLength(18);
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

      const todoDir = await writeTodos(tmp, updatePaths<LintResult>(tmp, initialTodos));

      const initialFiles = await readFiles(todoDir);

      expect(initialFiles).toHaveLength(2);

      const initialFileStats = initialFiles.map((file) => {
        return {
          fileName: file,
          ctime: statSync(join(todoDir, file)).ctime,
        };
      });

      await writeTodos(tmp, fixtures.eslintWithErrors(tmp));

      const subsequentFiles = await readFiles(todoDir);

      expect(subsequentFiles).toHaveLength(18);

      initialFileStats.forEach((initialFileStat) => {
        const subsequentFile = statSync(join(todoDir, initialFileStat.fileName));

        expect(subsequentFile.ctime).toEqual(initialFileStat.ctime);
      });
    });

    it('removes old todos if todos no longer contains violations', async () => {
      const fixture = fixtures.eslintWithErrors(tmp);
      const todoDir = await writeTodos(tmp, fixture);
      const initialFiles = await readFiles(todoDir);

      expect(initialFiles).toHaveLength(18);

      const firstHalf = fixture.slice(0, 3);
      const secondHalf = fixture.slice(3, fixture.length);

      await writeTodos(tmp, firstHalf);

      const subsequentFiles = await readFiles(todoDir);

      expect(subsequentFiles).toHaveLength(7);

      buildTodoData(tmp, secondHalf).forEach((todoDatum) => {
        expect(!existsSync(join(todoDir, `${todoFilePathFor(todoDatum)}.json`))).toEqual(true);
      });
    });
  });

  describe('writeTodos for single file', () => {
    it('generates todos for a specific filePath', async () => {
      const todoDir = await writeTodos(
        tmp,
        fixtures.singleFileTodo(tmp),
        'app/controllers/settings.js'
      );

      expect(await readFiles(todoDir)).toMatchInlineSnapshot(`
        Array [
          "0a1e71cf4d0931e81f494d5a73a550016814e15a/53e7a9a0.json",
          "0a1e71cf4d0931e81f494d5a73a550016814e15a/6e3be839.json",
          "0a1e71cf4d0931e81f494d5a73a550016814e15a/aad8bc25.json",
        ]
      `);
    });

    it('updates todos for a specific filePath', async () => {
      const todoDir = await writeTodos(
        tmp,
        fixtures.singleFileTodo(tmp),
        'app/controllers/settings.js'
      );

      expect(await readFiles(todoDir)).toMatchInlineSnapshot(`
        Array [
          "0a1e71cf4d0931e81f494d5a73a550016814e15a/53e7a9a0.json",
          "0a1e71cf4d0931e81f494d5a73a550016814e15a/6e3be839.json",
          "0a1e71cf4d0931e81f494d5a73a550016814e15a/aad8bc25.json",
        ]
      `);

      await writeTodos(tmp, fixtures.singleFileTodoUpdated(tmp), 'app/controllers/settings.js');

      expect(await readFiles(todoDir)).toMatchInlineSnapshot(`
        Array [
          "0a1e71cf4d0931e81f494d5a73a550016814e15a/6e3be839.json",
          "0a1e71cf4d0931e81f494d5a73a550016814e15a/aad8bc25.json",
          "0a1e71cf4d0931e81f494d5a73a550016814e15a/ee492fc4.json",
        ]
      `);
    });

    it('deletes todos for a specific filePath', async () => {
      const todoDir = await writeTodos(
        tmp,
        fixtures.singleFileTodo(tmp),
        'app/controllers/settings.js'
      );

      expect(await readFiles(todoDir)).toMatchInlineSnapshot(`
        Array [
          "0a1e71cf4d0931e81f494d5a73a550016814e15a/53e7a9a0.json",
          "0a1e71cf4d0931e81f494d5a73a550016814e15a/6e3be839.json",
          "0a1e71cf4d0931e81f494d5a73a550016814e15a/aad8bc25.json",
        ]
      `);

      await writeTodos(tmp, fixtures.singleFileNoErrors(tmp), 'app/controllers/settings.js');

      expect(await readFiles(todoDir)).toHaveLength(0);
    });
  });

  describe('getTodoBatches', () => {
    it('creates items to add', async () => {
      const [add] = await getTodoBatches(buildTodoData(tmp, fixtures.newBatches(tmp)), new Map());

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
        buildTodoData(tmp, fixtures.newBatches(tmp))
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
        buildTodoData(tmp, fixtures.newBatches(tmp)),
        buildTodoData(tmp, fixtures.existingBatches(tmp))
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
