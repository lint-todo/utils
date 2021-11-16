import { todoFilePathFor, todoFileNameFor } from './io';
import { TodoFileFormat, TodoDataV2, TodoFilePathHash, Operation } from './types';

type TodoExactMatcher = {
  match: (first: TodoDataV2, second: TodoDataV2) => boolean;
};

const ExactMatchers = new Map<TodoFileFormat, TodoExactMatcher>([
  [
    TodoFileFormat.Version1,
    {
      match: (todoDataToFind: TodoDataV2, todoDatum: TodoDataV2) => {
        return (
          todoDataToFind.engine === todoDatum.engine &&
          todoDataToFind.ruleId === todoDatum.ruleId &&
          todoDataToFind.range.start.line === todoDatum.range.start.line &&
          todoDataToFind.range.start.column === todoDatum.range.start.column
        );
      },
    },
  ],
  [
    TodoFileFormat.Version2,
    {
      match: (todoDataToFind: TodoDataV2, todoDatum: TodoDataV2) => {
        return (
          todoDataToFind.engine === todoDatum.engine &&
          todoDataToFind.ruleId === todoDatum.ruleId &&
          todoDataToFind.range.start.line === todoDatum.range.start.line &&
          todoDataToFind.range.start.column === todoDatum.range.start.column &&
          todoDataToFind.range.end.line === todoDatum.range.end.line &&
          todoDataToFind.range.end.column === todoDatum.range.end.column &&
          todoDataToFind.source === todoDatum.source
        );
      },
    },
  ],
]);

export default class TodoMatcher {
  unprocessed: Set<TodoDataV2>;

  constructor() {
    this.unprocessed = new Set();
  }

  unmatched(
    predicate: (todoDatum: TodoDataV2) => boolean = () => false
  ): Map<TodoFilePathHash, TodoDataV2> {
    return new Map(
      [...this.unprocessed]
        .filter((todoDatum) => predicate(todoDatum))
        .map((todoDatum: TodoDataV2) => {
          return [todoFilePathFor(todoDatum), todoDatum];
        })
    );
  }

  add(todoDatum: TodoDataV2): void {
    this.unprocessed.add(todoDatum);
  }

  remove(todoDatum: TodoDataV2): void {
    this.unprocessed.delete(todoDatum);
  }

  addOrRemove(operation: Operation, todoDatum: TodoDataV2): void {
    if (operation === 'add' && !this.find2(todoDatum)) {
      this.add(todoDatum);
    }

    if (operation === 'remove') {
      const todoToRemove = this.find2(todoDatum);

      if (todoToRemove) {
        this.remove(todoToRemove);
      }
    }
  }

  find2(todoDatum: TodoDataV2): TodoDataV2 | undefined {
    return [...this.unprocessed].find((unprocessedTodo) =>
      ExactMatchers.get(2)?.match(unprocessedTodo, todoDatum)
    );
  }

  find(todoFilePathHash: TodoFilePathHash): TodoDataV2 | undefined {
    return [...this.unprocessed].find(
      (todoDatum) => todoFileNameFor(todoDatum) === todoFilePathHash
    );
  }

  exactMatch(todoDataToFind: TodoDataV2): TodoDataV2 | undefined {
    let found;

    for (const todoDatum of this.unprocessed) {
      if (ExactMatchers.get(todoDatum.fileFormat)?.match(todoDataToFind, todoDatum)) {
        found = todoDatum;
        this.unprocessed.delete(todoDatum);
        break;
      }
    }

    return found;
  }

  fuzzyMatch(todoDataToFind: TodoDataV2): TodoDataV2 | undefined {
    let found;

    for (const todoDatum of this.unprocessed) {
      const hasSource = todoDataToFind.source && todoDatum.source;
      const sourceMatches = todoDataToFind.source === todoDatum.source;

      if (
        todoDataToFind.engine === todoDatum.engine &&
        todoDataToFind.ruleId === todoDatum.ruleId &&
        hasSource &&
        sourceMatches
      ) {
        found = todoDatum;
        this.unprocessed.delete(todoDatum);
        break;
      }
    }

    return found;
  }
}
