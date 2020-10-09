import { existsSync, statSync } from 'fs-extra';
import { join, relative } from 'path';
import * as globby from 'globby';
import {
  buildTodoData,
  generateTodoFiles,
  getTodoBatches,
  todoDirFor,
  todoFileNameFor,
  todoFilePathFor,
} from '../src';
import { LintResult, TodoData } from '../src/types';
import { createTmpDir } from './__utils__/tmp-dir';
import fixtures from './__fixtures__/fixtures';

const TODO_DATA: TodoData = {
  engine: 'eslint',
  filePath: '/Users/fake/app/controllers/settings.js',
  ruleId: 'no-prototype-builtins',
  line: 25,
  column: 21,
  createdDate: 1601324202150,
};

async function readFiles(todoDir: string) {
  const files = await globby(todoDir);
  return files.map((path) => relative(todoDir, path));
}

describe('io', () => {
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

      expect(dir).toEqual('42b8532cff6da75c5e5895a6f33522bf37418d0c');
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

      expect(dir).toEqual('42b8532cff6da75c5e5895a6f33522bf37418d0c/6e3be839');
    });

    it('generates idempotent file paths', () => {
      const dir1 = todoFilePathFor(TODO_DATA);
      const dir2 = todoFilePathFor(TODO_DATA);

      expect(dir1).toEqual(dir2);
    });
  });

  describe('generateTodoFiles', () => {
    let tmp: string;

    beforeEach(() => {
      tmp = createTmpDir();
    });

    it("creates .lint-todo directory if one doesn't exist", async () => {
      const todoDir = await generateTodoFiles(tmp, []);

      expect(existsSync(todoDir)).toEqual(true);
    });

    it("doesn't write files when no todos provided", async () => {
      const todoDir = await generateTodoFiles(tmp, []);

      expect(await readFiles(todoDir)).toHaveLength(0);
    });

    it('generates todos when todos provided', async () => {
      const todoDir = await generateTodoFiles(tmp, fixtures.eslintWithErrors);

      expect(await readFiles(todoDir)).toHaveLength(18);
    });

    it("generates todos only if previous todo doesn't exist", async () => {
      const initialTodos: LintResult[] = [
        {
          filePath: '/Users/fake/app/controllers/settings.js',
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

      const todoDir = await generateTodoFiles(tmp, initialTodos);

      const initialFiles = await readFiles(todoDir);

      expect(initialFiles).toHaveLength(2);

      const initialFileStats = initialFiles.map((file) => {
        return {
          fileName: file,
          ctime: statSync(join(todoDir, file)).ctime,
        };
      });

      await generateTodoFiles(tmp, fixtures.eslintWithErrors);

      const subsequentFiles = await readFiles(todoDir);

      expect(subsequentFiles).toHaveLength(18);

      initialFileStats.forEach((initialFileStat) => {
        const subsequentFile = statSync(join(todoDir, initialFileStat.fileName));

        expect(subsequentFile.ctime).toEqual(initialFileStat.ctime);
      });
    });

    it('removes old todos if todos no longer contains violations', async () => {
      const todoDir = await generateTodoFiles(tmp, fixtures.eslintWithErrors);
      const initialFiles = await readFiles(todoDir);

      expect(initialFiles).toHaveLength(18);

      const firstHalf = fixtures.eslintWithErrors.slice(0, 3);
      const secondHalf = fixtures.eslintWithErrors.slice(3, fixtures.eslintWithErrors.length);

      await generateTodoFiles(tmp, firstHalf);

      const subsequentFiles = await readFiles(todoDir);

      expect(subsequentFiles).toHaveLength(7);

      buildTodoData(secondHalf).forEach((todoDatum) => {
        expect(!existsSync(join(todoDir, `${todoFilePathFor(todoDatum)}.json`))).toEqual(true);
      });
    });
  });

  describe('generateTodoFiles for single file', () => {
    let tmp: string;

    beforeEach(() => {
      tmp = createTmpDir();
    });

    it('generates todos for a specific filePath', async () => {
      const todoDir = await generateTodoFiles(
        tmp,
        fixtures.singleFileTodo,
        '/Users/fake/app/controllers/settings.js'
      );

      expect(await readFiles(todoDir)).toMatchInlineSnapshot(`
        Array [
          "42b8532cff6da75c5e5895a6f33522bf37418d0c/53e7a9a0.json",
          "42b8532cff6da75c5e5895a6f33522bf37418d0c/6e3be839.json",
          "42b8532cff6da75c5e5895a6f33522bf37418d0c/aad8bc25.json",
        ]
      `);
    });

    it('updates todos for a specific filePath', async () => {
      const todoDir = await generateTodoFiles(
        tmp,
        fixtures.singleFileTodo,
        '/Users/fake/app/controllers/settings.js'
      );

      expect(await readFiles(todoDir)).toMatchInlineSnapshot(`
        Array [
          "42b8532cff6da75c5e5895a6f33522bf37418d0c/53e7a9a0.json",
          "42b8532cff6da75c5e5895a6f33522bf37418d0c/6e3be839.json",
          "42b8532cff6da75c5e5895a6f33522bf37418d0c/aad8bc25.json",
        ]
      `);

      await generateTodoFiles(
        tmp,
        fixtures.singleFileTodoUpdated,
        '/Users/fake/app/controllers/settings.js'
      );

      expect(await readFiles(todoDir)).toMatchInlineSnapshot(`
        Array [
          "42b8532cff6da75c5e5895a6f33522bf37418d0c/6e3be839.json",
          "42b8532cff6da75c5e5895a6f33522bf37418d0c/aad8bc25.json",
          "42b8532cff6da75c5e5895a6f33522bf37418d0c/ee492fc4.json",
        ]
      `);
    });

    it('deletes todos for a specific filePath', async () => {
      const todoDir = await generateTodoFiles(
        tmp,
        fixtures.singleFileTodo,
        '/Users/fake/app/controllers/settings.js'
      );

      expect(await readFiles(todoDir)).toMatchInlineSnapshot(`
        Array [
          "42b8532cff6da75c5e5895a6f33522bf37418d0c/53e7a9a0.json",
          "42b8532cff6da75c5e5895a6f33522bf37418d0c/6e3be839.json",
          "42b8532cff6da75c5e5895a6f33522bf37418d0c/aad8bc25.json",
        ]
      `);

      await generateTodoFiles(
        tmp,
        fixtures.singleFileNoErrors,
        '/Users/fake/app/controllers/settings.js'
      );

      expect(await readFiles(todoDir)).toHaveLength(0);
    });
  });

  describe('getTodoBatches', () => {
    const fromLintResults: LintResult[] = [
      {
        filePath: '/Users/fake/app/controllers/settings.js',
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
          {
            ruleId: 'no-prototype-builtins',
            severity: 2,
            message: "Do not access Object.prototype method 'hasOwnProperty' from target object.",
            line: 32,
            column: 34,
            nodeType: 'CallExpression',
            messageId: 'prototypeBuildIn',
            endLine: 32,
            endColumn: 48,
          },
        ],
        errorCount: 3,
        warningCount: 0,
        fixableErrorCount: 0,
        fixableWarningCount: 0,
        source: '',
        usedDeprecatedRules: [],
      },
      {
        filePath: '/Users/fake/app/initializers/tracer.js',
        messages: [
          {
            ruleId: 'no-redeclare',
            severity: 2,
            message: "'window' is already defined as a built-in global variable.",
            line: 1,
            column: 11,
            nodeType: 'Block',
            messageId: 'redeclaredAsBuiltin',
            endLine: 1,
            endColumn: 17,
          },
          {
            ruleId: 'no-redeclare',
            severity: 2,
            message: "'XMLHttpRequest' is already defined as a built-in global variable.",
            line: 1,
            column: 19,
            nodeType: 'Block',
            messageId: 'redeclaredAsBuiltin',
            endLine: 1,
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

    const existing: LintResult[] = [
      {
        filePath: '/Users/fake/app/initializers/tracer.js',
        messages: [
          {
            ruleId: 'no-redeclare',
            severity: 2,
            message: "'window' is already defined as a built-in global variable.",
            line: 1,
            column: 11,
            nodeType: 'Block',
            messageId: 'redeclaredAsBuiltin',
            endLine: 1,
            endColumn: 17,
          },
          {
            ruleId: 'no-redeclare',
            severity: 2,
            message: "'XMLHttpRequest' is already defined as a built-in global variable.",
            line: 1,
            column: 19,
            nodeType: 'Block',
            messageId: 'redeclaredAsBuiltin',
            endLine: 1,
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
      {
        filePath: '/Users/fake/app/models/build.js',
        messages: [
          {
            ruleId: 'no-prototype-builtins',
            severity: 2,
            message: "Do not access Object.prototype method 'hasOwnProperty' from target object.",
            line: 108,
            column: 50,
            nodeType: 'CallExpression',
            messageId: 'prototypeBuildIn',
            endLine: 108,
            endColumn: 64,
          },
          {
            ruleId: 'no-prototype-builtins',
            severity: 2,
            message: "Do not access Object.prototype method 'hasOwnProperty' from target object.",
            line: 120,
            column: 25,
            nodeType: 'CallExpression',
            messageId: 'prototypeBuildIn',
            endLine: 120,
            endColumn: 39,
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

    it('creates items to add', async () => {
      const [add] = await getTodoBatches(buildTodoData(fromLintResults), new Map());

      expect([...add.keys()]).toMatchInlineSnapshot(`
        Array [
          "42b8532cff6da75c5e5895a6f33522bf37418d0c/6e3be839",
          "42b8532cff6da75c5e5895a6f33522bf37418d0c/aad8bc25",
          "42b8532cff6da75c5e5895a6f33522bf37418d0c/53e7a9a0",
          "1ca7789ad58b87fa44470777e587667b2d4c191c/b9046d34",
          "1ca7789ad58b87fa44470777e587667b2d4c191c/092271fa",
        ]
      `);
    });

    it('creates items to delete', async () => {
      const [, remove] = await getTodoBatches(new Map(), buildTodoData(fromLintResults));

      expect([...remove.keys()]).toMatchInlineSnapshot(`
        Array [
          "42b8532cff6da75c5e5895a6f33522bf37418d0c/6e3be839",
          "42b8532cff6da75c5e5895a6f33522bf37418d0c/aad8bc25",
          "42b8532cff6da75c5e5895a6f33522bf37418d0c/53e7a9a0",
          "1ca7789ad58b87fa44470777e587667b2d4c191c/b9046d34",
          "1ca7789ad58b87fa44470777e587667b2d4c191c/092271fa",
        ]
      `);
    });

    it('creates all batches', async () => {
      const [add, remove, stable] = await getTodoBatches(
        buildTodoData(fromLintResults),
        buildTodoData(existing)
      );

      expect([...add.keys()]).toMatchInlineSnapshot(`
        Array [
          "42b8532cff6da75c5e5895a6f33522bf37418d0c/6e3be839",
          "42b8532cff6da75c5e5895a6f33522bf37418d0c/aad8bc25",
          "42b8532cff6da75c5e5895a6f33522bf37418d0c/53e7a9a0",
        ]
      `);
      expect([...remove.keys()]).toMatchInlineSnapshot(`
        Array [
          "e0ab64604b96684307a69bb57e5f76ab613f868d/66256fb7",
          "e0ab64604b96684307a69bb57e5f76ab613f868d/8fd35486",
        ]
      `);
      expect([...stable.keys()]).toMatchInlineSnapshot(`
        Array [
          "1ca7789ad58b87fa44470777e587667b2d4c191c/b9046d34",
          "1ca7789ad58b87fa44470777e587667b2d4c191c/092271fa",
        ]
      `);
    });
  });
});
