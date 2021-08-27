import { spawnSync } from 'child_process';
import { TodoDataV2 } from './types';

export function showNotes({ cwd = '.' }: { cwd: string }): Set<TodoDataV2> {
  const { stdout, stderr, error } = spawnSync('git notes', ['show'], { shell: true, encoding: 'utf-8', cwd });

  if (stderr || error) {
    console.warn(stderr || error);
    return new Set();
  }

  return new Set(JSON.parse(stdout));
}

export function addNotes(todos: Set<TodoDataV2>, { cwd }: { cwd: string }): void {
  const message = [...todos].map((todo) => JSON.stringify(todo));

  const { stderr, error } = spawnSync('git notes', ['add', '-f', '-m', JSON.stringify(message)], {
    shell: true,
    cwd,
    encoding: 'utf-8',
  });

  if (stderr || error) {
    console.warn(stderr || error);
  }
}
