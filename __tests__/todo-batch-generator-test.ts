import { subDays } from 'date-fns';
import { getDatePart } from '../src/date-utils';
import TodoBatchGenerator from '../src/todo-batch-generator';
import TodoMatcher from '../src/todo-matcher';
import { TodoDataV1, TodoFilePathHash } from '../src/types';
import { buildTodoDataForTesting } from './__utils__/build-todo-data';
import { getFixture } from './__utils__/get-fixture';
import { createTmpDir } from './__utils__/tmp-dir';

describe('todo-batch-generator', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = createTmpDir();
  });

  it('generates no batches when lint results are empty', () => {
    const todoBatchGenerator = new TodoBatchGenerator(tmp);

    expect(todoBatchGenerator.generate([], new Map())).toMatchInlineSnapshot(`
      Object {
        "add": Map {},
        "expired": Map {},
        "remove": Set {},
        "stable": Map {},
      }
    `);
  });

  it('creates items to add', async () => {
    const todoBatchGenerator = new TodoBatchGenerator(tmp, { shouldRemove: () => true });
    const { add } = todoBatchGenerator.generate(getFixture('new-batches', tmp), new Map());

    expect([...add.keys()]).toMatchInlineSnapshot(`
      Array [
        "0a1e71cf4d0931e81f494d5a73a550016814e15a/6e3be839",
        "0a1e71cf4d0931e81f494d5a73a550016814e15a/aad8bc25",
        "0a1e71cf4d0931e81f494d5a73a550016814e15a/53e7a9a0",
        "60a67ad5c653f5b1a6537d9a6aee56c0662c0e35/b9046d34",
        "60a67ad5c653f5b1a6537d9a6aee56c0662c0e35/092271fa",
        "60a67ad5c653f5b1a6537d9a6aee56c0662c0e35/cc71e5f9",
      ]
    `);
  });

  it('creates items to remove', async () => {
    const todoBatchGenerator = new TodoBatchGenerator(tmp, { shouldRemove: () => true });
    const { remove } = todoBatchGenerator.generate(
      [],
      buildTodoDataForTesting(tmp, getFixture('new-batches', tmp))
    );

    expect([...remove]).toMatchInlineSnapshot(`
        Array [
          "0a1e71cf4d0931e81f494d5a73a550016814e15a/6e3be839",
          "0a1e71cf4d0931e81f494d5a73a550016814e15a/aad8bc25",
          "0a1e71cf4d0931e81f494d5a73a550016814e15a/53e7a9a0",
          "60a67ad5c653f5b1a6537d9a6aee56c0662c0e35/b9046d34",
          "60a67ad5c653f5b1a6537d9a6aee56c0662c0e35/092271fa",
          "60a67ad5c653f5b1a6537d9a6aee56c0662c0e35/cc71e5f9",
        ]
      `);
  });

  it('creates items to expire', async () => {
    const expiredBatches: Map<TodoFilePathHash, TodoMatcher> = buildTodoDataForTesting(
      tmp,
      getFixture('new-batches', tmp)
    );
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const expiredTodo: TodoDataV1 = expiredBatches
      .get('60a67ad5c653f5b1a6537d9a6aee56c0662c0e35')!
      .find('cc71e5f9')!;

    expiredTodo.errorDate = subDays(getDatePart(), 1).getTime();

    const todoBatchGenerator = new TodoBatchGenerator(tmp, { shouldRemove: () => true });
    const { expired } = todoBatchGenerator.generate(getFixture('new-batches', tmp), expiredBatches);

    expect([...expired.keys()]).toMatchInlineSnapshot(`
      Array [
        "60a67ad5c653f5b1a6537d9a6aee56c0662c0e35/cc71e5f9",
      ]
    `);
  });

  it('creates all batches', async () => {
    const existingBatches: Map<TodoFilePathHash, TodoMatcher> = buildTodoDataForTesting(
      tmp,
      getFixture('existing-batches', tmp)
    );
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const expiredTodo: TodoDataV1 = existingBatches
      .get('60a67ad5c653f5b1a6537d9a6aee56c0662c0e35')!
      .find('cc71e5f9')!;

    expiredTodo.errorDate = subDays(getDatePart(), 1).getTime();

    const todoBatchGenerator = new TodoBatchGenerator(tmp, { shouldRemove: () => true });
    const { add, remove, stable, expired } = todoBatchGenerator.generate(
      getFixture('new-batches', tmp),
      existingBatches
    );

    expect([...add.keys()]).toMatchInlineSnapshot(`
        Array [
          "0a1e71cf4d0931e81f494d5a73a550016814e15a/6e3be839",
          "0a1e71cf4d0931e81f494d5a73a550016814e15a/aad8bc25",
          "0a1e71cf4d0931e81f494d5a73a550016814e15a/53e7a9a0",
        ]
      `);
    expect([...remove.keys()]).toMatchInlineSnapshot(`
        Array [
          "07d3818b8afefcdd7db6d52743309fdbb85313f0/66256fb7",
          "07d3818b8afefcdd7db6d52743309fdbb85313f0/8fd35486",
        ]
      `);
    expect([...stable.keys()]).toMatchInlineSnapshot(`
        Array [
          "60a67ad5c653f5b1a6537d9a6aee56c0662c0e35/b9046d34",
          "60a67ad5c653f5b1a6537d9a6aee56c0662c0e35/092271fa",
        ]
      `);
    expect([...expired.keys()]).toMatchInlineSnapshot(`
        Array [
          "60a67ad5c653f5b1a6537d9a6aee56c0662c0e35/cc71e5f9",
        ]
      `);
  });
});
