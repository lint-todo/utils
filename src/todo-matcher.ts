import { todoFilePathFor, todoFileNameFor } from './io';
import { TodoData, TodoFilePathHash } from './types';

export default class TodoMatcher {
  private unprocessed: Set<TodoData>;

  constructor() {
    this.unprocessed = new Set();
  }

  unmatched(predicate: (todoDatum: TodoData) => boolean = () => false): string[] {
    return [...this.unprocessed]
      .filter((todoDatum) => predicate(todoDatum))
      .map((todoDatum: TodoData) => {
        return todoFilePathFor(todoDatum);
      });
  }

  add(todoDatum: TodoData): void {
    this.unprocessed.add(todoDatum);
  }

  find(todoFilePathHash: TodoFilePathHash): TodoData | undefined {
    return [...this.unprocessed].find(
      (todoDatum) => todoFileNameFor(todoDatum) === todoFilePathHash
    );
  }

  exactMatch(todoDataToFind: TodoData): TodoData | undefined {
    let found;

    for (const todoDatum of this.unprocessed) {
      if (
        todoDataToFind.engine === todoDatum.engine &&
        todoDataToFind.ruleId === todoDatum.ruleId &&
        todoDataToFind.line === todoDatum.line &&
        todoDataToFind.column === todoDatum.column
      ) {
        found = todoDatum;
        this.unprocessed.delete(todoDatum);
        break;
      }
    }

    return found;
  }

  fuzzyMatch(todoDataToFind: TodoData): TodoData | undefined {
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
