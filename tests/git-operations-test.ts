import { describe, beforeEach, it, expect } from 'vitest';
import execa from 'execa';
import tmp from 'tmp';
import { realpathSync } from 'fs';
import {
  applyTodoChanges,
  getTodoStorageFilePath,
  hasConflicts,
  Operation,
  readTodoData,
  TodoData,
} from '../src';
import { toTodoDatum } from '../src/builders';
import { readFileSync } from 'fs-extra';

function createTmpDir() {
  return realpathSync(tmp.dirSync({ unsafeCleanup: true }).name);
}

function buildTodosFromOperations(operations: Operation[]): Set<TodoData> {
  const todos = new Set<TodoData>();

  for (const operation of operations) {
    const [, todoDatum] = toTodoDatum(operation);

    todos.add(todoDatum);
  }

  return todos;
}

function readTodoStorageFileContents(todoStorageFilePath: string) {
  return readFileSync(todoStorageFilePath, { encoding: 'utf-8' });
}

describe('git operations', () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = createTmpDir();

    await git('init');
    await setGitUser();
  });

  it('can correctly merge from branch when no conflicts expected', async () => {
    const todoStorageFilePath = getTodoStorageFilePath(tmp);

    applyTodoChanges(
      tmp,
      buildTodosFromOperations([
        'add|eslint|no-prototype-builtins|25|21|25|35|da39a3ee5e6b4b0d3255bfef95601890afd80709|1637107200000|||app/controllers/settings.js',
        'add|eslint|no-prototype-builtins|26|19|26|33|da39a3ee5e6b4b0d3255bfef95601890afd80709|1637107200000|||app/controllers/settings.js',
      ]),
      new Set()
    );

    expect(readTodoStorageFileContents(todoStorageFilePath)).toMatchInlineSnapshot(`
      "add|eslint|no-prototype-builtins|25|21|25|35|da39a3ee5e6b4b0d3255bfef95601890afd80709|1637107200000|||app/controllers/settings.js
      add|eslint|no-prototype-builtins|26|19|26|33|da39a3ee5e6b4b0d3255bfef95601890afd80709|1637107200000|||app/controllers/settings.js
      "
      `);

    await git('add -A');
    await git(['commit', '-m', '"Initial storage file"']);
    await git('branch -m main');
    await git('checkout -b branch-1');

    applyTodoChanges(
      tmp,
      new Set(),
      buildTodosFromOperations([
        'remove|eslint|no-prototype-builtins|25|21|25|35|da39a3ee5e6b4b0d3255bfef95601890afd80709|1637107200000|||app/controllers/settings.js',
        'remove|eslint|no-prototype-builtins|26|19|26|33|da39a3ee5e6b4b0d3255bfef95601890afd80709|1637107200000|||app/controllers/settings.js',
      ])
    );

    expect(readTodoStorageFileContents(todoStorageFilePath)).toMatchInlineSnapshot(`
      "add|eslint|no-prototype-builtins|25|21|25|35|da39a3ee5e6b4b0d3255bfef95601890afd80709|1637107200000|||app/controllers/settings.js
      add|eslint|no-prototype-builtins|26|19|26|33|da39a3ee5e6b4b0d3255bfef95601890afd80709|1637107200000|||app/controllers/settings.js
      remove|eslint|no-prototype-builtins|25|21|25|35|da39a3ee5e6b4b0d3255bfef95601890afd80709|1637107200000|||app/controllers/settings.js
      remove|eslint|no-prototype-builtins|26|19|26|33|da39a3ee5e6b4b0d3255bfef95601890afd80709|1637107200000|||app/controllers/settings.js
      "
    `);

    await git('add -A');
    await git(['commit', '-m', '"Add removes"']);
    await git(`checkout main`);

    expect(readTodoStorageFileContents(todoStorageFilePath)).toMatchInlineSnapshot(`
      "add|eslint|no-prototype-builtins|25|21|25|35|da39a3ee5e6b4b0d3255bfef95601890afd80709|1637107200000|||app/controllers/settings.js
      add|eslint|no-prototype-builtins|26|19|26|33|da39a3ee5e6b4b0d3255bfef95601890afd80709|1637107200000|||app/controllers/settings.js
      "
    `);

    await git('merge branch-1');

    expect(readTodoStorageFileContents(todoStorageFilePath)).toMatchInlineSnapshot(`
      "add|eslint|no-prototype-builtins|25|21|25|35|da39a3ee5e6b4b0d3255bfef95601890afd80709|1637107200000|||app/controllers/settings.js
      add|eslint|no-prototype-builtins|26|19|26|33|da39a3ee5e6b4b0d3255bfef95601890afd80709|1637107200000|||app/controllers/settings.js
      remove|eslint|no-prototype-builtins|25|21|25|35|da39a3ee5e6b4b0d3255bfef95601890afd80709|1637107200000|||app/controllers/settings.js
      remove|eslint|no-prototype-builtins|26|19|26|33|da39a3ee5e6b4b0d3255bfef95601890afd80709|1637107200000|||app/controllers/settings.js
      "
    `);
  });

  it('can auto-resolve conflicts in git storage file via merge', async () => {
    const todoStorageFilePath = getTodoStorageFilePath(tmp);

    applyTodoChanges(
      tmp,
      buildTodosFromOperations([
        'add|eslint|no-prototype-builtins|25|21|25|35|da39a3ee5e6b4b0d3255bfef95601890afd80709|1637107200000|||app/controllers/settings.js',
        'add|eslint|no-prototype-builtins|26|19|26|33|da39a3ee5e6b4b0d3255bfef95601890afd80709|1637107200000|||app/controllers/settings.js',
      ]),
      new Set()
    );

    await git('add .lint-todo');
    await git(['commit', '-m', '"Initial storage file"']);
    await git('branch -m main');
    await git('checkout -b branch-1');

    applyTodoChanges(
      tmp,
      new Set(),
      buildTodosFromOperations([
        'remove|eslint|no-prototype-builtins|25|21|25|35|da39a3ee5e6b4b0d3255bfef95601890afd80709|1637107200000|||app/controllers/settings.js',
        'remove|eslint|no-prototype-builtins|26|19|26|33|da39a3ee5e6b4b0d3255bfef95601890afd80709|1637107200000|||app/controllers/settings.js',
      ])
    );

    await git('add -A');
    await git(['commit', '-m', '"Add removes from branch-1"']);
    await git(`checkout main`);
    await git('checkout -b branch-2');

    applyTodoChanges(
      tmp,
      buildTodosFromOperations([
        'add|eslint|no-prototype-builtins|25|21|25|35|da39a3ee5e6b4b0d3255bfef95601890afd80709|1777107200000|||app/controllers/settings.js',
        'add|eslint|no-prototype-builtins|26|19|26|33|da39a3ee5e6b4b0d3255bfef95601890afd80709|1777107200000|||app/controllers/settings.js',
      ]),
      new Set()
    );

    await git('add -A');
    await git(['commit', '-m', '"Add from branch-2"']);
    await git('merge branch-1', false);

    const storageFileContents = readTodoStorageFileContents(todoStorageFilePath);

    expect(hasConflicts(storageFileContents)).toEqual(true);

    readTodoData(tmp, { engine: 'eslint', filePath: '' });

    expect(hasConflicts(readTodoStorageFileContents(todoStorageFilePath))).toEqual(false);
    expect(readFileSync(todoStorageFilePath, { encoding: 'utf-8' })).toMatchInlineSnapshot(`
      "add|eslint|no-prototype-builtins|25|21|25|35|da39a3ee5e6b4b0d3255bfef95601890afd80709|1637107200000|||app/controllers/settings.js
      add|eslint|no-prototype-builtins|26|19|26|33|da39a3ee5e6b4b0d3255bfef95601890afd80709|1637107200000|||app/controllers/settings.js
      add|eslint|no-prototype-builtins|25|21|25|35|da39a3ee5e6b4b0d3255bfef95601890afd80709|1777107200000|||app/controllers/settings.js
      add|eslint|no-prototype-builtins|26|19|26|33|da39a3ee5e6b4b0d3255bfef95601890afd80709|1777107200000|||app/controllers/settings.js
      remove|eslint|no-prototype-builtins|25|21|25|35|da39a3ee5e6b4b0d3255bfef95601890afd80709|1637107200000|||app/controllers/settings.js
      remove|eslint|no-prototype-builtins|26|19|26|33|da39a3ee5e6b4b0d3255bfef95601890afd80709|1637107200000|||app/controllers/settings.js
      "
    `);
  });

  it('can auto-resolve conflicts in git storage file via rebase', async () => {
    const todoStorageFilePath = getTodoStorageFilePath(tmp);

    applyTodoChanges(
      tmp,
      buildTodosFromOperations([
        'add|eslint|no-prototype-builtins|25|21|25|35|da39a3ee5e6b4b0d3255bfef95601890afd80709|1637107200000|||app/controllers/settings.js',
        'add|eslint|no-prototype-builtins|26|19|26|33|da39a3ee5e6b4b0d3255bfef95601890afd80709|1637107200000|||app/controllers/settings.js',
      ]),
      new Set()
    );

    await git('add .lint-todo');
    await git(['commit', '-m', '"Initial storage file"']);
    await git('branch -m main');
    await git('checkout -b branch-1');

    applyTodoChanges(
      tmp,
      new Set(),
      buildTodosFromOperations([
        'remove|eslint|no-prototype-builtins|25|21|25|35|da39a3ee5e6b4b0d3255bfef95601890afd80709|1637107200000|||app/controllers/settings.js',
        'remove|eslint|no-prototype-builtins|26|19|26|33|da39a3ee5e6b4b0d3255bfef95601890afd80709|1637107200000|||app/controllers/settings.js',
      ])
    );

    await git('add -A');
    await git(['commit', '-m', '"Add removes from branch-1"']);
    await git(`checkout main`);
    await git('checkout -b branch-2');

    applyTodoChanges(
      tmp,
      buildTodosFromOperations([
        'add|eslint|no-prototype-builtins|25|21|25|35|da39a3ee5e6b4b0d3255bfef95601890afd80709|1777107200000|||app/controllers/settings.js',
        'add|eslint|no-prototype-builtins|26|19|26|33|da39a3ee5e6b4b0d3255bfef95601890afd80709|1777107200000|||app/controllers/settings.js',
      ]),
      new Set()
    );

    await git('add -A');
    await git(['commit', '-m', '"Add from branch-2"']);
    await git('rebase branch-1', false);

    const storageFileContents = readTodoStorageFileContents(todoStorageFilePath);

    expect(hasConflicts(storageFileContents)).toEqual(true);

    readTodoData(tmp, { engine: 'eslint', filePath: '' });

    expect(hasConflicts(readTodoStorageFileContents(todoStorageFilePath))).toEqual(false);
    expect(readFileSync(todoStorageFilePath, { encoding: 'utf-8' })).toMatchInlineSnapshot(`
      "add|eslint|no-prototype-builtins|25|21|25|35|da39a3ee5e6b4b0d3255bfef95601890afd80709|1637107200000|||app/controllers/settings.js
      add|eslint|no-prototype-builtins|26|19|26|33|da39a3ee5e6b4b0d3255bfef95601890afd80709|1637107200000|||app/controllers/settings.js
      remove|eslint|no-prototype-builtins|25|21|25|35|da39a3ee5e6b4b0d3255bfef95601890afd80709|1637107200000|||app/controllers/settings.js
      remove|eslint|no-prototype-builtins|26|19|26|33|da39a3ee5e6b4b0d3255bfef95601890afd80709|1637107200000|||app/controllers/settings.js
      add|eslint|no-prototype-builtins|25|21|25|35|da39a3ee5e6b4b0d3255bfef95601890afd80709|1777107200000|||app/controllers/settings.js
      add|eslint|no-prototype-builtins|26|19|26|33|da39a3ee5e6b4b0d3255bfef95601890afd80709|1777107200000|||app/controllers/settings.js
      "
    `);
  });

  async function setGitUser() {
    await git(['config', 'user.email', '"you@example.com"']);
    await git(['config', 'user.name', '"Your Name"']);
  }

  function git(args: string | string[] = [], reject = true) {
    const cmd = Array.isArray(args) ? args : args.split(' ');

    return execa('git', cmd, {
      reject,
      cwd: tmp,
    });
  }
});
