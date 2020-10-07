import { existsSync, statSync, readdirSync, readdir } from 'fs-extra';
import { join } from 'path';
import { buildTodoData, generateFileName, generateTodoFiles, getTodoBatches } from '../src';
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

describe('io', () => {
  describe('generateFileName', () => {
    it('can generate a unique hash for todo', () => {
      const fileName = generateFileName(TODO_DATA);

      expect(fileName).toEqual('e382776914ba08603a3f1006431cf7c893962e65');
    });

    it('generates idempotent file names', () => {
      const fileName = generateFileName(TODO_DATA);
      const secondFileName = generateFileName(TODO_DATA);

      expect(fileName).toEqual('e382776914ba08603a3f1006431cf7c893962e65');
      expect(secondFileName).toEqual('e382776914ba08603a3f1006431cf7c893962e65');
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

      expect(readdirSync(todoDir)).toHaveLength(0);
    });

    it('generates todos when todos provided', async () => {
      const todoDir = await generateTodoFiles(tmp, fixtures.eslintWithErrors);

      expect(readdirSync(todoDir)).toHaveLength(18);
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

      const initialFiles = readdirSync(todoDir);

      expect(initialFiles).toHaveLength(2);

      const initialFileStats = initialFiles.map((file) => {
        return {
          fileName: file,
          ctime: statSync(join(todoDir, file)).ctime,
        };
      });

      await generateTodoFiles(tmp, fixtures.eslintWithErrors);

      const subsequentFiles = readdirSync(todoDir);

      expect(subsequentFiles).toHaveLength(18);

      initialFileStats.forEach((initialFileStat) => {
        const subsequentFile = statSync(join(todoDir, initialFileStat.fileName));

        expect(subsequentFile.ctime).toEqual(initialFileStat.ctime);
      });
    });

    it('removes old todos if todos no longer contains violations', async () => {
      const todoDir = await generateTodoFiles(tmp, fixtures.eslintWithErrors);
      const initialFiles = readdirSync(todoDir);

      expect(initialFiles).toHaveLength(18);

      const firstHalf = fixtures.eslintWithErrors.slice(0, 3);
      const secondHalf = fixtures.eslintWithErrors.slice(3, fixtures.eslintWithErrors.length);

      await generateTodoFiles(tmp, firstHalf);

      const subsequentFiles = readdirSync(todoDir);

      expect(subsequentFiles).toHaveLength(7);

      buildTodoData(secondHalf).forEach((todoDatum) => {
        expect(!existsSync(join(todoDir, `${generateFileName(todoDatum)}.json`))).toEqual(true);
      });
    });
  });

  describe('generateTodoFiles for single file', () => {
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

      expect(readdirSync(todoDir)).toHaveLength(0);
    });

    it('generates todos for a specific filePath', async () => {
      const todoDir = await generateTodoFiles(
        tmp,
        fixtures.singleFileTodo,
        '/Users/fake/app/controllers/settings.js'
      );

      expect(await readdir(todoDir)).toMatchInlineSnapshot(`
        Array [
          "3c19eab21259dcb5eee1035f69528e4a060e700d.json",
          "e382776914ba08603a3f1006431cf7c893962e65.json",
          "f65bb1f69ecaab090153bcbf6413cfda826133ba.json",
        ]
      `);
    });

    it('updates todos for a specific filePath', async () => {
      const todoDir = await generateTodoFiles(tmp, fixtures.singleFileTodo);

      expect(await readdir(todoDir)).toMatchInlineSnapshot(`
        Array [
          "3c19eab21259dcb5eee1035f69528e4a060e700d.json",
          "e382776914ba08603a3f1006431cf7c893962e65.json",
          "f65bb1f69ecaab090153bcbf6413cfda826133ba.json",
        ]
      `);

      await generateTodoFiles(
        tmp,
        fixtures.singleFileTodoUpdated,
        '/Users/fake/app/controllers/settings.js'
      );

      expect(await readdir(todoDir)).toMatchInlineSnapshot(`
        Array [
          "082d442a601be9bbb41c75ed3a0c685473a2c9db.json",
          "3c19eab21259dcb5eee1035f69528e4a060e700d.json",
          "e382776914ba08603a3f1006431cf7c893962e65.json",
        ]
      `);
    });

    it('deletes todos for a specific filePath', async () => {
      const todoDir = await generateTodoFiles(tmp, fixtures.singleFileTodo);

      expect(await readdir(todoDir)).toMatchInlineSnapshot(`
        Array [
          "3c19eab21259dcb5eee1035f69528e4a060e700d.json",
          "e382776914ba08603a3f1006431cf7c893962e65.json",
          "f65bb1f69ecaab090153bcbf6413cfda826133ba.json",
        ]
      `);

      await generateTodoFiles(tmp, [], '/Users/fake/app/controllers/settings.js');

      expect(await readdir(todoDir)).toMatchInlineSnapshot(`Array []`);
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
      debugger;
      const [add] = await getTodoBatches(buildTodoData(fromLintResults), new Map());

      expect([...add.keys()]).toMatchInlineSnapshot(`
        Array [
          "e382776914ba08603a3f1006431cf7c893962e65",
          "3c19eab21259dcb5eee1035f69528e4a060e700d",
          "f65bb1f69ecaab090153bcbf6413cfda826133ba",
          "24e99f01beff611d12524745b4125d5effc76b4b",
          "d15fa0773bc05998d7ae34d1ad3d401cfa73604a",
        ]
      `);
    });

    it('creates items to delete', async () => {
      debugger;
      const [, remove] = await getTodoBatches(new Map(), buildTodoData(fromLintResults));

      expect([...remove.keys()]).toMatchInlineSnapshot(`
        Array [
          "e382776914ba08603a3f1006431cf7c893962e65",
          "3c19eab21259dcb5eee1035f69528e4a060e700d",
          "f65bb1f69ecaab090153bcbf6413cfda826133ba",
          "24e99f01beff611d12524745b4125d5effc76b4b",
          "d15fa0773bc05998d7ae34d1ad3d401cfa73604a",
        ]
      `);
    });

    it('creates all batches', async () => {
      debugger;
      const [add, remove, stable] = await getTodoBatches(
        buildTodoData(fromLintResults),
        buildTodoData(existing)
      );

      expect([...add.keys()]).toMatchInlineSnapshot(`
        Array [
          "e382776914ba08603a3f1006431cf7c893962e65",
          "3c19eab21259dcb5eee1035f69528e4a060e700d",
          "f65bb1f69ecaab090153bcbf6413cfda826133ba",
        ]
      `);
      expect([...remove.keys()]).toMatchInlineSnapshot(`
        Array [
          "e0b38cee71605a6150f7e179cbedb09e43290986",
          "c1c43ce5c33d99435e9d7241ef2c920112c3871c",
        ]
      `);
      expect([...stable.keys()]).toMatchInlineSnapshot(`
        Array [
          "24e99f01beff611d12524745b4125d5effc76b4b",
          "d15fa0773bc05998d7ae34d1ad3d401cfa73604a",
        ]
      `);
    });
  });
});
