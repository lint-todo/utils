import { showNotes, addNotes } from "../src";
import { buildMaybeTodosFromFixture } from "./__utils__/build-todo-data";
import { createTmpDir } from "./__utils__/tmp-dir";
import { spawnSync } from "child_process";

describe('git-utils', () => {
  it('creates new notes for HEAD', () => {
    const tmp = createTmpDir();
    const todos = buildMaybeTodosFromFixture(tmp, 'eslint-with-errors');
    spawnSync('git init && git commit --allow-empty -mExample', { shell: true, cwd: tmp });

    addNotes(todos, { cwd: tmp });

    const notes = showNotes({ cwd: tmp });

    expect(notes).toEqual(todos);
  });
});
