import { todoFilePathFor, todoFileNameFor } from './io';
import { TodoDataV2, TodoFilePathHash } from './types';

export default class TodoMatcher {
  private unprocessed: Set<TodoDataV2>;

  constructor() {
    this.unprocessed = new Set();
  }

  unmatched(predicate: (todoDatum: TodoDataV2) => boolean = () => false): string[] {
    return [...this.unprocessed]
      .filter((todoDatum) => predicate(todoDatum))
      .map((todoDatum: TodoDataV2) => {
        return todoFilePathFor(todoDatum);
      });
  }

  add(todoDatum: TodoDataV2): void {
    this.unprocessed.add(todoDatum);
  }

  find(todoFilePathHash: TodoFilePathHash): TodoDataV2 | undefined {
    return [...this.unprocessed].find(
      (todoDatum) => todoFileNameFor(todoDatum) === todoFilePathHash
    );
  }

  exactMatch(todoDataToFind: TodoDataV2): TodoDataV2 | undefined {
    let found;

    for (const todoDatum of this.unprocessed) {
      const hasSource = todoDataToFind.source && todoDatum.source;
      const matchesSource = hasSource && todoDataToFind.source === todoDatum.source;
      const preserveV1Matching = true;

      if (
        todoDataToFind.engine === todoDatum.engine &&
        todoDataToFind.ruleId === todoDatum.ruleId &&
        todoDataToFind.range.start.line === todoDatum.range.start.line &&
        todoDataToFind.range.start.column === todoDatum.range.start.column &&
        (matchesSource || preserveV1Matching)
      ) {
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
