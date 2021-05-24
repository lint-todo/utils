import { unlink } from 'fs-extra';
import { join } from 'path';
import { getTodoConfig } from '../src';
import { FakeProject } from './__utils__/fake-project';

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
    it('returns default object when no package.json found', async () => {
      await unlink(join(project.baseDir, 'package.json'));
      debugger;
      expect(getTodoConfig(project.baseDir).daysToDecay).toEqual({
        warn: 30,
        error: 60,
      });
    });

    it('returns default object when no lint todo config found', () => {
      const config = getTodoConfig(project.baseDir);
      debugger;
      expect(config.daysToDecay).toEqual({
        warn: 30,
        error: 60,
      });
    });

    it('can return empty lint todo config from package.json when empty config explicitly configured', () => {
      project.writePackageJsonTodoConfig({});

      const config = getTodoConfig(project.baseDir);

      expect(config.daysToDecay).toEqual({});
    });

    it('can return empty lint todo config from .lint-todorc.js when empty config explicitly configured', () => {
      project.writeLintTodorc({});

      const config = getTodoConfig(project.baseDir);

      expect(config.daysToDecay).toEqual({});
    });

    it('can get lint todo config from package.json', () => {
      project.writePackageJsonTodoConfig({
        warn: 5,
        error: 10,
      });

      const config = getTodoConfig(project.baseDir);

      expect(config.daysToDecay).toEqual({
        warn: 5,
        error: 10,
      });
    });

    it('can get lint todo config from .lint-todorc.js', () => {
      project.writeLintTodorc({ warn: 20, error: 40 });

      const config = getTodoConfig(project.baseDir);

      expect(config.daysToDecay).toEqual({ warn: 20, error: 40 });
    });

    it('errors if both package.json and .lint-todorc.js contain todo configurations', () => {
      project.writePackageJsonTodoConfig({
        warn: 5,
        error: 10,
      });
      project.writeLintTodorc({ warn: 20, error: 40 });

      expect(() => {
        getTodoConfig(project.baseDir);
      }).toThrow(
        'You cannot have todo configuratons in both package.json and .lint-todorc.js. Please move the configurations from the package.json to the .lint-todorc.js'
      );
    });

    it('can get lint todo config from env vars', () => {
      setupEnvVar('TODO_DAYS_TO_WARN', '5');
      setupEnvVar('TODO_DAYS_TO_ERROR', '10');

      const config = getTodoConfig(project.baseDir);

      expect(config.daysToDecay).toEqual({
        warn: 5,
        error: 10,
      });
    });

    it('can get lint todo config from options', () => {
      const config = getTodoConfig(project.baseDir, { warn: 3, error: 5 });

      expect(config.daysToDecay).toEqual({
        warn: 3,
        error: 5,
      });
    });

    it('can override lint todo config from package.json with env vars', () => {
      project.writePackageJsonTodoConfig({
        warn: 1,
        error: 2,
      });

      setupEnvVar('TODO_DAYS_TO_WARN', '5');
      setupEnvVar('TODO_DAYS_TO_ERROR', '10');

      const config = getTodoConfig(project.baseDir);

      expect(config.daysToDecay).toEqual({
        warn: 5,
        error: 10,
      });
    });

    it('can override lint todo config from package.json with options', () => {
      project.writePackageJsonTodoConfig({
        warn: 1,
        error: 2,
      });

      const config = getTodoConfig(project.baseDir, {
        warn: 5,
        error: 10,
      });

      expect(config.daysToDecay).toEqual({
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

      expect(config.daysToDecay).toEqual({
        warn: 5,
        error: 10,
      });
    });

    it('can override defaults with null values', () => {
      project.writePackageJsonTodoConfig({
        warn: 1,
        error: 2,
      });

      const config = getTodoConfig(project.baseDir, {
        warn: undefined,
        error: undefined,
      });

      expect(config.daysToDecay).toEqual({
        warn: undefined,
        error: undefined,
      });
    });

    it('can override defaults with single null value', () => {
      project.writePackageJsonTodoConfig({
        warn: 1,
        error: 2,
      });

      const config = getTodoConfig(project.baseDir, {
        error: undefined,
      });

      expect(config.daysToDecay).toEqual({
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
});

function setupEnvVar(name: string, value?: string): void {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}
