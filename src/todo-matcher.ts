import { todoFilePathFor, todoFileNameFor } from './io';
import { TodoDataV1, TodoFilePathHash } from './types';

export default class TodoMatcher {
  private unprocessed: Set<TodoDataV1>;

  constructor() {
    this.unprocessed = new Set();
  }

  unmatched(predicate: (todoDatum: TodoDataV1) => boolean = () => false): string[] {
    return [...this.unprocessed]
      .filter((todoDatum) => predicate(todoDatum))
      .map((todoDatum: TodoDataV1) => {
        return todoFilePathFor(todoDatum);
      });
  }

  add(todoDatum: TodoDataV1): void {
    this.unprocessed.add(todoDatum);
  }

  find(todoFilePathHash: TodoFilePathHash): TodoDataV1 | undefined {
    return [...this.unprocessed].find(
      (todoDatum) => todoFileNameFor(todoDatum) === todoFilePathHash
    );
  }

  exactMatch(todoDataToFind: TodoDataV1): TodoDataV1 | undefined {
    let found;

    for (const todoDatum of this.unprocessed) {
      if (
        todoDataToFind.engine === todoDatum.engine &&
        todoDataToFind.ruleId === todoDatum.ruleId &&
        todoDataToFind.line === todoDatum.line &&
        todoDataToFind.column === todoDatum.column &&
        ((todoDataToFind.source !== undefined &&
          todoDatum.source !== undefined &&
          todoDataToFind.source === todoDatum.source) ||
          true)
      ) {
        found = todoDatum;
        this.unprocessed.delete(todoDatum);
        break;
      }
    }

    return found;
  }

  fuzzyMatch(todoDataToFind: TodoDataV1): TodoDataV1 | undefined {
    let found;

    for (const todoDatum of this.unprocessed) {
      if (
        todoDataToFind.engine === todoDatum.engine &&
        todoDataToFind.ruleId === todoDatum.ruleId &&
        todoDataToFind.source !== undefined &&
        todoDatum.source !== undefined &&
        todoDataToFind.source === todoDatum.source
      ) {
        found = todoDatum;
        this.unprocessed.delete(todoDatum);
        break;
      }
    }

    return found;
  }
}
