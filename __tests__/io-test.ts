import { existsSync, statSync, readdirSync, readdir } from 'fs-extra';
import { join } from 'path';
import {
  generateFileName,
  generatePendingFiles,
  getPendingBatches,
  buildPendingLintMessagesMap,
} from '../src';
import { PendingLintMessage } from '../src/types';
import { createTmpDir } from './__utils__/tmp-dir';
import fixtures from './__fixtures__/fixtures';

const PENDING_LINT_MESSAGE: PendingLintMessage = {
  engine: 'eslint',
  filePath: '/Users/fake/app/controllers/settings.js',
  ruleId: 'no-prototype-builtins',
  line: 25,
  column: 21,
  createdDate: 1601324202150,
};

describe('io', () => {
  describe('generateFileName', () => {
    it('can generate a unique hash for pending lint message', () => {
      const fileName = generateFileName(PENDING_LINT_MESSAGE);

      expect(fileName).toEqual('e382776914ba08603a3f1006431cf7c893962e65');
    });

    it('generates idempotent file names', () => {
      const fileName = generateFileName(PENDING_LINT_MESSAGE);
      const secondFileName = generateFileName(PENDING_LINT_MESSAGE);

      expect(fileName).toEqual('e382776914ba08603a3f1006431cf7c893962e65');
      expect(secondFileName).toEqual('e382776914ba08603a3f1006431cf7c893962e65');
    });
  });

  describe('generatePendingFiles', () => {
    let tmp: string;

    beforeEach(() => {
      tmp = createTmpDir();
    });

    it("creates .lint-pending directory if one doesn't exist", async () => {
      const lintPendingDir = await generatePendingFiles(tmp, []);

      expect(existsSync(lintPendingDir)).toEqual(true);
    });

    it("doesn't write files when no pending items provided", async () => {
      const lintPendingDir = await generatePendingFiles(tmp, []);

      expect(readdirSync(lintPendingDir)).toHaveLength(0);
    });

    it('generates pending files when pending items provided', async () => {
      const lintPendingDir = await generatePendingFiles(tmp, fixtures.pending);

      expect(readdirSync(lintPendingDir)).toHaveLength(18);
    });

    it("generates pending files only if previous pending file doesn't exist", async () => {
      const initialPendingItems: PendingLintMessage[] = [
        {
          engine: 'eslint',
          filePath: '/Users/fake/app/controllers/settings.js',
          ruleId: 'no-prototype-builtins',
          line: 25,
          column: 21,
          createdDate: 1601332963373,
        },
        {
          engine: 'eslint',
          filePath: '/Users/fake/app/controllers/settings.js',
          ruleId: 'no-prototype-builtins',
          line: 26,
          column: 19,
          createdDate: 1601332963373,
        },
      ];

      const lintPendingDir = await generatePendingFiles(tmp, initialPendingItems);

      const initialFiles = readdirSync(lintPendingDir);

      expect(initialFiles).toHaveLength(2);

      const initialFileStats = initialFiles.map((file) => {
        return {
          fileName: file,
          ctime: statSync(join(lintPendingDir, file)).ctime,
        };
      });

      await generatePendingFiles(tmp, fixtures.pending);

      const subsequentFiles = readdirSync(lintPendingDir);

      expect(subsequentFiles).toHaveLength(18);

      initialFileStats.forEach((initialFileStat) => {
        const subsequentFile = statSync(join(lintPendingDir, initialFileStat.fileName));

        expect(subsequentFile.ctime).toEqual(initialFileStat.ctime);
      });
    });

    it('removes old pending files if pending items no longer contains violations', async () => {
      const lintPendingDir = await generatePendingFiles(tmp, fixtures.pending);

      const initialFiles = readdirSync(lintPendingDir);

      expect(initialFiles).toHaveLength(18);

      const half = Math.ceil(fixtures.pending.length / 2);
      const firstHalf = fixtures.pending.slice(0, half);
      const secondHalf = fixtures.pending.slice(half, fixtures.pending.length);

      await generatePendingFiles(tmp, firstHalf);

      const subsequentFiles = readdirSync(lintPendingDir);

      expect(subsequentFiles).toHaveLength(9);

      secondHalf.forEach((pendingLintMessage) => {
        expect(
          !existsSync(join(lintPendingDir, `${generateFileName(pendingLintMessage)}.json`))
        ).toEqual(true);
      });
    });
  });

  describe('generatePendingFiles for single file', () => {
    let tmp: string;

    beforeEach(() => {
      tmp = createTmpDir();
    });

    it("creates .lint-pending directory if one doesn't exist", async () => {
      const lintPendingDir = await generatePendingFiles(tmp, []);

      expect(existsSync(lintPendingDir)).toEqual(true);
    });

    it("doesn't write files when no pending items provided", async () => {
      const lintPendingDir = await generatePendingFiles(tmp, []);

      expect(readdirSync(lintPendingDir)).toHaveLength(0);
    });

    it('generates pending files for a specific filePath', async () => {
      const lintPendingDir = await generatePendingFiles(
        tmp,
        fixtures.singleFilePending,
        '/Users/fake/app/controllers/settings.js'
      );

      expect(await readdir(lintPendingDir)).toMatchInlineSnapshot(`
        Array [
          "3c19eab21259dcb5eee1035f69528e4a060e700d.json",
          "e382776914ba08603a3f1006431cf7c893962e65.json",
          "f65bb1f69ecaab090153bcbf6413cfda826133ba.json",
        ]
      `);
    });

    it('updates pending files for a specific filePath', async () => {
      const lintPendingDir = await generatePendingFiles(tmp, fixtures.singleFilePending);

      expect(await readdir(lintPendingDir)).toMatchInlineSnapshot(`
        Array [
          "3c19eab21259dcb5eee1035f69528e4a060e700d.json",
          "e382776914ba08603a3f1006431cf7c893962e65.json",
          "f65bb1f69ecaab090153bcbf6413cfda826133ba.json",
        ]
      `);

      await generatePendingFiles(
        tmp,
        fixtures.singleFilePendingUpdated,
        '/Users/fake/app/controllers/settings.js'
      );

      expect(await readdir(lintPendingDir)).toMatchInlineSnapshot(`
        Array [
          "082d442a601be9bbb41c75ed3a0c685473a2c9db.json",
          "3c19eab21259dcb5eee1035f69528e4a060e700d.json",
          "e382776914ba08603a3f1006431cf7c893962e65.json",
        ]
      `);
    });

    it('deletes pending files for a specific filePath', async () => {
      const lintPendingDir = await generatePendingFiles(tmp, fixtures.singleFilePending);

      expect(await readdir(lintPendingDir)).toMatchInlineSnapshot(`
        Array [
          "3c19eab21259dcb5eee1035f69528e4a060e700d.json",
          "e382776914ba08603a3f1006431cf7c893962e65.json",
          "f65bb1f69ecaab090153bcbf6413cfda826133ba.json",
        ]
      `);

      await generatePendingFiles(tmp, [], '/Users/fake/app/controllers/settings.js');

      expect(await readdir(lintPendingDir)).toMatchInlineSnapshot(`Array []`);
    });
  });

  describe('getPendingBatches', () => {
    const fromLintResults: PendingLintMessage[] = [
      {
        engine: 'eslint',
        filePath: '/Users/fake/app/controllers/settings.js',
        ruleId: 'no-prototype-builtins',
        line: 26,
        column: 19,
        createdDate: 1601332963373,
      },
      {
        engine: 'eslint',
        filePath: '/Users/fake/app/controllers/settings.js',
        ruleId: 'no-prototype-builtins',
        line: 32,
        column: 34,
        createdDate: 1601332963373,
      },
      {
        engine: 'eslint',
        filePath: '/Users/fake/app/initializers/tracer.js',
        ruleId: 'no-redeclare',
        line: 1,
        column: 11,
        createdDate: 1601332963373,
      },
      {
        engine: 'eslint',
        filePath: '/Users/fake/app/initializers/tracer.js',
        ruleId: 'no-redeclare',
        line: 1,
        column: 19,
        createdDate: 1601332963373,
      },
    ];

    const existing: PendingLintMessage[] = [
      {
        engine: 'eslint',
        filePath: '/Users/fake/app/initializers/tracer.js',
        ruleId: 'no-redeclare',
        line: 1,
        column: 11,
        createdDate: 1601332963373,
      },
      {
        engine: 'eslint',
        filePath: '/Users/fake/app/initializers/tracer.js',
        ruleId: 'no-redeclare',
        line: 1,
        column: 19,
        createdDate: 1601332963373,
      },
      {
        engine: 'eslint',
        filePath: '/Users/fake/app/models/build.js',
        ruleId: 'no-prototype-builtins',
        line: 108,
        column: 50,
        createdDate: 1601332963373,
      },
      {
        engine: 'eslint',
        filePath: '/Users/fake/app/models/build.js',
        ruleId: 'no-prototype-builtins',
        line: 120,
        column: 25,
        createdDate: 1601332963373,
      },
    ];

    it('creates items to add', async () => {
      const [add] = await getPendingBatches(
        buildPendingLintMessagesMap(fromLintResults),
        new Map()
      );

      expect([...add.keys()]).toMatchInlineSnapshot(`
        Array [
          "3c19eab21259dcb5eee1035f69528e4a060e700d",
          "f65bb1f69ecaab090153bcbf6413cfda826133ba",
          "24e99f01beff611d12524745b4125d5effc76b4b",
          "d15fa0773bc05998d7ae34d1ad3d401cfa73604a",
        ]
      `);
    });

    it('creates items to delete', async () => {
      const [, remove] = await getPendingBatches(
        new Map(),
        buildPendingLintMessagesMap(fromLintResults)
      );

      expect([...remove.keys()]).toMatchInlineSnapshot(`
        Array [
          "3c19eab21259dcb5eee1035f69528e4a060e700d",
          "f65bb1f69ecaab090153bcbf6413cfda826133ba",
          "24e99f01beff611d12524745b4125d5effc76b4b",
          "d15fa0773bc05998d7ae34d1ad3d401cfa73604a",
        ]
      `);
    });

    it('creates all batches', async () => {
      const [add, remove, stable] = await getPendingBatches(
        buildPendingLintMessagesMap(fromLintResults),
        buildPendingLintMessagesMap(existing)
      );

      expect([...add.keys()]).toMatchInlineSnapshot(`
        Array [
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
