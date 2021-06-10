import { unlink } from 'fs-extra';
import { join } from 'path';
import { getTodoConfig } from '../src';
import { validateConfig } from '../src/todo-config';
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

  it('returns default object when no package.json found', async () => {
    await unlink(join(project.baseDir, 'package.json'));

    expect(getTodoConfig(project.baseDir, 'foo').daysToDecay).toEqual({
      warn: 30,
      error: 60,
    });
  });

  it('returns default object when no lint todo config found', () => {
    const config = getTodoConfig(project.baseDir, 'foo');

    expect(config.daysToDecay).toEqual({
      warn: 30,
      error: 60,
    });
  });

  it('can return empty lint todo config from package.json when empty config explicitly configured', () => {
    project.writePackageJsonTodoConfig('foo', {});

    const config = getTodoConfig(project.baseDir, 'foo');

    expect(config.daysToDecay).toEqual({});
  });

  it('can return empty lint todo config from .lint-todorc.js when empty config explicitly configured', () => {
    project.writeLintTodorc('foo', {});

    const config = getTodoConfig(project.baseDir, 'foo');

    expect(config.daysToDecay).toEqual({});
  });

  it('can get lint todo config from package.json', () => {
    project.writeLegacyPackageJsonTodoConfig({
      warn: 5,
      error: 10,
    });

    const config = getTodoConfig(project.baseDir, 'foo');

    expect(config.daysToDecay).toEqual({
      warn: 5,
      error: 10,
    });
  });

  it('can get lint todo config from package.json with decay days by rule', () => {
    project.writeLegacyPackageJsonTodoConfig(
      {
        warn: 5,
        error: 10,
      },
      {
        'no-bare-strings': {
          warn: 10,
          error: 20,
        },
      }
    );

    const config = getTodoConfig(project.baseDir, 'foo');

    expect(config).toMatchInlineSnapshot(`
        Object {
          "daysToDecay": Object {
            "error": 10,
            "warn": 5,
          },
          "daysToDecayByRule": Object {
            "no-bare-strings": Object {
              "error": 20,
              "warn": 10,
            },
          },
        }
      `);
  });

  it('can get lint todo config from .lint-todorc.js', () => {
    project.writeLintTodorc('foo', { warn: 20, error: 40 });

    const config = getTodoConfig(project.baseDir, 'foo');

    expect(config.daysToDecay).toEqual({ warn: 20, error: 40 });
  });

  it('can get lint todo config from .lint-todorc.js with decay days by rule', () => {
    project.writeLintTodorc(
      'foo',
      {
        warn: 5,
        error: 10,
      },
      {
        'no-bare-strings': {
          warn: 10,
          error: 20,
        },
      }
    );

    const config = getTodoConfig(project.baseDir, 'foo');

    expect(config).toMatchInlineSnapshot(`
        Object {
          "daysToDecay": Object {
            "error": 10,
            "warn": 5,
          },
          "daysToDecayByRule": Object {
            "no-bare-strings": Object {
              "error": 20,
              "warn": 10,
            },
          },
        }
      `);
  });

  it('errors if both package.json and .lint-todorc.js contain todo configurations', () => {
    project.writeLegacyPackageJsonTodoConfig({
      warn: 5,
      error: 10,
    });
    project.writeLintTodorc('foo', { warn: 20, error: 40 });

    expect(() => {
      getTodoConfig(project.baseDir, 'foo');
    }).toThrow(
      'You cannot have todo configurations in both package.json and .lint-todorc.js. Please move the configuration from the package.json to the .lint-todorc.js'
    );
  });

  it('can get lint todo config from env vars', () => {
    setupEnvVar('TODO_DAYS_TO_WARN', '5');
    setupEnvVar('TODO_DAYS_TO_ERROR', '10');

    const config = getTodoConfig(project.baseDir, 'foo');

    expect(config.daysToDecay).toEqual({
      warn: 5,
      error: 10,
    });
  });

  it('can get lint todo config from options', () => {
    const config = getTodoConfig(project.baseDir, 'foo', { warn: 3, error: 5 });

    expect(config.daysToDecay).toEqual({
      warn: 3,
      error: 5,
    });
  });

  it('can override lint todo config from package.json with env vars', () => {
    project.writeLegacyPackageJsonTodoConfig({
      warn: 1,
      error: 2,
    });

    setupEnvVar('TODO_DAYS_TO_WARN', '5');
    setupEnvVar('TODO_DAYS_TO_ERROR', '10');

    const config = getTodoConfig(project.baseDir, 'foo');

    expect(config.daysToDecay).toEqual({
      warn: 5,
      error: 10,
    });
  });

  it('can override lint todo config from package.json with options', () => {
    project.writeLegacyPackageJsonTodoConfig({
      warn: 1,
      error: 2,
    });

    const config = getTodoConfig(project.baseDir, 'foo', {
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

    const config = getTodoConfig(project.baseDir, 'foo', {
      warn: 5,
      error: 10,
    });

    expect(config.daysToDecay).toEqual({
      warn: 5,
      error: 10,
    });
  });

  it('can override defaults with null values', () => {
    project.writeLegacyPackageJsonTodoConfig({
      warn: 1,
      error: 2,
    });

    const config = getTodoConfig(project.baseDir, 'foo', {
      warn: undefined,
      error: undefined,
    });

    expect(config.daysToDecay).toEqual({
      warn: undefined,
      error: undefined,
    });
  });

  it('can override defaults with single null value', () => {
    project.writeLegacyPackageJsonTodoConfig({
      warn: 1,
      error: 2,
    });

    const config = getTodoConfig(project.baseDir, 'foo', {
      error: undefined,
    });

    expect(config.daysToDecay).toEqual({
      warn: 1,
      error: undefined,
    });
  });

  it('throws if warn is equal to error', () => {
    expect(() => getTodoConfig(project.baseDir, 'foo', { warn: 5, error: 5 })).toThrow(
      'The provided todo configuration contains invalid values. The `warn` value (5) must be less than the `error` value (5).'
    );
  });

  it('throws if warn is greater than to error', () => {
    expect(() => getTodoConfig(project.baseDir, 'foo', { warn: 10, error: 5 })).toThrow(
      'The provided todo configuration contains invalid values. The `warn` value (10) must be less than the `error` value (5).'
    );
  });

  describe('legacy configuration', () => {
    it('can return empty lint todo config from package.json when empty config explicitly configured', () => {
      project.writeLegacyPackageJsonTodoConfig({});

      const config = getTodoConfig(project.baseDir, 'foo');

      expect(config.daysToDecay).toEqual({});
    });

    it('can get lint todo config from package.json', () => {
      project.writeLegacyPackageJsonTodoConfig({
        warn: 5,
        error: 10,
      });

      const config = getTodoConfig(project.baseDir, 'foo');

      expect(config.daysToDecay).toEqual({
        warn: 5,
        error: 10,
      });
    });

    it('errors if both package.json and .lint-todorc.js contain todo configurations', () => {
      project.writeLegacyPackageJsonTodoConfig({
        warn: 5,
        error: 10,
      });
      project.writeLintTodorc('foo', { warn: 20, error: 40 });

      expect(() => {
        getTodoConfig(project.baseDir, 'foo');
      }).toThrow(
        'You cannot have todo configurations in both package.json and .lint-todorc.js. Please move the configuration from the package.json to the .lint-todorc.js'
      );
    });

    it('can override lint todo config from package.json with env vars', () => {
      project.writeLegacyPackageJsonTodoConfig({
        warn: 1,
        error: 2,
      });

      setupEnvVar('TODO_DAYS_TO_WARN', '5');
      setupEnvVar('TODO_DAYS_TO_ERROR', '10');

      const config = getTodoConfig(project.baseDir, 'foo');

      expect(config.daysToDecay).toEqual({
        warn: 5,
        error: 10,
      });
    });

    it('can override lint todo config from package.json with options', () => {
      project.writeLegacyPackageJsonTodoConfig({
        warn: 1,
        error: 2,
      });

      const config = getTodoConfig(project.baseDir, 'foo', {
        warn: 5,
        error: 10,
      });

      expect(config.daysToDecay).toEqual({
        warn: 5,
        error: 10,
      });
    });

    it('can override defaults with null values', () => {
      project.writeLegacyPackageJsonTodoConfig({
        warn: 1,
        error: 2,
      });

      const config = getTodoConfig(project.baseDir, 'foo', {
        warn: undefined,
        error: undefined,
      });

      expect(config.daysToDecay).toEqual({
        warn: undefined,
        error: undefined,
      });
    });

    it('can override defaults with single null value', () => {
      project.writeLegacyPackageJsonTodoConfig({
        warn: 1,
        error: 2,
      });

      const config = getTodoConfig(project.baseDir, 'foo', {
        error: undefined,
      });

      expect(config.daysToDecay).toEqual({
        warn: 1,
        error: undefined,
      });
    });

    it('can validate a config as valid with package.json', () => {
      project.writeLegacyPackageJsonTodoConfig({
        warn: 1,
        error: 2,
      });

      const result = validateConfig(project.baseDir);

      expect(result.isValid).toEqual(true);
    });

    it('can validate a config as valid with .lint-todorc.js', () => {
      project.writeLintTodorc('foo', {
        warn: 1,
        error: 2,
      });

      const result = validateConfig(project.baseDir);

      expect(result.isValid).toEqual(true);
    });

    it('can validate a config as invalid', () => {
      project.writeLegacyPackageJsonTodoConfig({
        warn: 1,
        error: 2,
      });

      project.writeLintTodorc('foo', {
        warn: 1,
        error: 2,
      });

      const result = validateConfig(project.baseDir);

      expect(result.isValid).toEqual(false);
      expect(result.message).toEqual(
        'You cannot have todo configurations in both package.json and .lint-todorc.js. Please move the configuration from the package.json to the .lint-todorc.js'
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
