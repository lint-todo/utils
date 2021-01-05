import { unlink } from 'fs-extra';
import { join } from 'path';
import { getTodoConfig } from '../src';
import { FakeProject } from './__utils__/fake-project';

describe('get-todo-config', () => {
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
      'The `lintTodo` configuration in the package.json contains invalid values. The `warn` value must be less than the `error` value.'
    );
  });

  it('throws if warn is greater than to error', () => {
    expect(() => getTodoConfig(project.baseDir, { warn: 10, error: 5 })).toThrow(
      'The `lintTodo` configuration in the package.json contains invalid values. The `warn` value must be less than the `error` value.'
    );
  });
});

function setupEnvVar(name: string, value?: string): void {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}
