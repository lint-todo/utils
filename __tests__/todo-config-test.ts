import { unlink, readFileSync, writeFileSync } from 'fs-extra';
import { join } from 'path';
import { getTodoConfig, writeTodoConfig, ensureTodoStorageDirSync } from '../src';
import { FakeProject } from './__utils__/fake-project';
import { ensureTodoConfig } from '../src/todo-config';

describe('todo-config', () => {
  let project: FakeProject;

  beforeEach(() => {
    project = new FakeProject();
    project.writeSync();
  });

  afterEach(() => {
    project.dispose();
    delete process.env['TODO_DAYS_TO_WARN'];
    delete process.env['TODO_DAYS_TO_ERROR'];
  });

  describe('getTodoConfig', () => {
    it('returns empty object when no package.json found', async () => {
      await unlink(join(project.baseDir, 'package.json'));

      expect(getTodoConfig(project.baseDir)).toEqual({});
    });

    it('returns empty object when no lint todo config found', () => {
      const config = getTodoConfig(project.baseDir);

      expect(config).toEqual({});
    });

    it('can get lint todo config from package.json', () => {
      project.writeTodoConfig({
        warn: 5,
        error: 10,
      });

      const config = getTodoConfig(project.baseDir);

      expect(config).toEqual({
        warn: 5,
        error: 10,
      });
    });

    it('can get lint todo config from env vars', () => {
      setupEnvVar('TODO_DAYS_TO_WARN', '5');
      setupEnvVar('TODO_DAYS_TO_ERROR', '10');

      const config = getTodoConfig(project.baseDir);

      expect(config).toEqual({
        warn: 5,
        error: 10,
      });
    });

    it('can get lint todo config from options', () => {
      const config = getTodoConfig(project.baseDir, { warn: 3, error: 5 });

      expect(config).toEqual({
        warn: 3,
        error: 5,
      });
    });

    it('can override lint todo config from package.json with env vars', () => {
      project.writeTodoConfig({
        warn: 1,
        error: 2,
      });

      setupEnvVar('TODO_DAYS_TO_WARN', '5');
      setupEnvVar('TODO_DAYS_TO_ERROR', '10');

      const config = getTodoConfig(project.baseDir);

      expect(config).toEqual({
        warn: 5,
        error: 10,
      });
    });

    it('can override lint todo config from package.json with options', () => {
      project.writeTodoConfig({
        warn: 1,
        error: 2,
      });

      const config = getTodoConfig(project.baseDir, {
        warn: 5,
        error: 10,
      });

      expect(config).toEqual({
        warn: 5,
        error: 10,
      });
    });

    it('can override lint todo config from env vars with options', () => {
      setupEnvVar('TODO_DAYS_TO_WARN', '1');
      setupEnvVar('TODO_DAYS_TO_ERROR', '2');

      const config = getTodoConfig(project.baseDir, {
        warn: 5,
        error: 10,
      });

      expect(config).toEqual({
        warn: 5,
        error: 10,
      });
    });

    it('can override defaults with null values', () => {
      project.writeTodoConfig({
        warn: 1,
        error: 2,
      });

      const config = getTodoConfig(project.baseDir, {
        warn: undefined,
        error: undefined,
      });

      expect(config).toEqual({
        warn: undefined,
        error: undefined,
      });
    });

    it('can override defaults with single null value', () => {
      project.writeTodoConfig({
        warn: 1,
        error: 2,
      });

      const config = getTodoConfig(project.baseDir, {
        error: undefined,
      });

      expect(config).toEqual({
        warn: 1,
        error: undefined,
      });
    });

    it('throws if warn is equal to error', () => {
      expect(() => getTodoConfig(project.baseDir, { warn: 5, error: 5 })).toThrow(
        'The provided todo configuration contains invalid values. The `warn` value (5) must be less than the `error` value (5).'
      );
    });

    it('throws if warn is greater than to error', () => {
      expect(() => getTodoConfig(project.baseDir, { warn: 10, error: 5 })).toThrow(
        'The provided todo configuration contains invalid values. The `warn` value (10) must be less than the `error` value (5).'
      );
    });
  });

  describe('ensureTodoConfig', () => {
    it('does not change package.json if lintTodo directory present', () => {
      ensureTodoStorageDirSync(project.baseDir);

      const originalPkg = readFileSync(join(project.baseDir, 'package.json'), { encoding: 'utf8' });

      ensureTodoConfig(project.baseDir);

      const pkg = readFileSync(join(project.baseDir, 'package.json'), { encoding: 'utf8' });

      expect(pkg).toEqual(originalPkg);
    });

    it('does not change package.json if todo config already present', () => {
      ensureTodoStorageDirSync(project.baseDir);

      writeTodoConfig(project.baseDir, {
        warn: 10,
        error: 20,
      });

      const originalPkg = readFileSync(join(project.baseDir, 'package.json'), { encoding: 'utf8' });

      ensureTodoConfig(project.baseDir);

      const pkg = readFileSync(join(project.baseDir, 'package.json'), { encoding: 'utf8' });

      expect(pkg).toEqual(originalPkg);
    });

    it('does not change package.json if todo config is empty object', () => {
      ensureTodoStorageDirSync(project.baseDir);

      writeTodoConfig(project.baseDir, {});

      const originalPkg = readFileSync(join(project.baseDir, 'package.json'), { encoding: 'utf8' });

      ensureTodoConfig(project.baseDir);

      const pkg = readFileSync(join(project.baseDir, 'package.json'), { encoding: 'utf8' });

      expect(pkg).toEqual(originalPkg);
    });

    it('does changes package.json if lintTodo directory not present', () => {
      ensureTodoConfig(project.baseDir);

      const pkg = readFileSync(join(project.baseDir, 'package.json'), { encoding: 'utf8' });

      expect(pkg).toMatchInlineSnapshot(`
        "{
          \\"name\\": \\"fake-project\\",
          \\"version\\": \\"0.0.0\\",
          \\"keywords\\": [],
          \\"license\\": \\"MIT\\",
          \\"description\\": \\"Fake project\\",
          \\"repository\\": \\"http://fakerepo.com\\",
          \\"dependencies\\": {},
          \\"devDependencies\\": {},
          \\"lintTodo\\": {
            \\"decayDays\\": {
              \\"warn\\": 30,
              \\"error\\": 60
            }
          }
        }"
      `);
    });
  });

  describe('writeTodoConfig', () => {
    it('does not change package.json if lintTodo config present', () => {
      project.writeTodoConfig({
        warn: 1,
        error: 2,
      });

      const originalPkg = readFileSync(join(project.baseDir, 'package.json'), { encoding: 'utf8' });

      writeTodoConfig(project.baseDir, { warn: 10, error: 20 });

      const pkg = readFileSync(join(project.baseDir, 'package.json'), { encoding: 'utf8' });

      expect(pkg).toEqual(originalPkg);
    });

    it('adds the todo config when one does not exist', () => {
      writeTodoConfig(project.baseDir, { warn: 1, error: 2 });

      const pkg = readFileSync(join(project.baseDir, 'package.json'), { encoding: 'utf8' });

      expect(pkg).toMatchInlineSnapshot(`
        "{
          \\"name\\": \\"fake-project\\",
          \\"version\\": \\"0.0.0\\",
          \\"keywords\\": [],
          \\"license\\": \\"MIT\\",
          \\"description\\": \\"Fake project\\",
          \\"repository\\": \\"http://fakerepo.com\\",
          \\"dependencies\\": {},
          \\"devDependencies\\": {},
          \\"lintTodo\\": {
            \\"decayDays\\": {
              \\"warn\\": 1,
              \\"error\\": 2
            }
          }
        }"
      `);
    });

    it('adds the todo config when one does not exist respecting trailing whitespace', () => {
      const packageJsonPath = join(project.baseDir, 'package.json');
      let originalPkg = readFileSync(packageJsonPath, { encoding: 'utf8' });
      originalPkg = originalPkg += '\n';

      writeFileSync(packageJsonPath, originalPkg, { encoding: 'utf8' });

      writeTodoConfig(project.baseDir, { warn: 1, error: 2 });

      const pkg = readFileSync(packageJsonPath, { encoding: 'utf8' });

      expect(pkg).toMatchInlineSnapshot(`
        "{
          \\"name\\": \\"fake-project\\",
          \\"version\\": \\"0.0.0\\",
          \\"keywords\\": [],
          \\"license\\": \\"MIT\\",
          \\"description\\": \\"Fake project\\",
          \\"repository\\": \\"http://fakerepo.com\\",
          \\"dependencies\\": {},
          \\"devDependencies\\": {},
          \\"lintTodo\\": {
            \\"decayDays\\": {
              \\"warn\\": 1,
              \\"error\\": 2
            }
          }
        }
        "
      `);
    });
  });
});

function setupEnvVar(name: string, value?: string): void {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}
