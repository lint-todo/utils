import { TodoFileFormat, TodoData, Operation } from './types';

type TodoExactMatcher = {
  match: (first: TodoData, second: TodoData) => boolean;
};

const ExactMatchers = new Map<TodoFileFormat, TodoExactMatcher>([
  [
    TodoFileFormat.Version1,
    {
      match: (todoDataToFind: TodoData, todoDatum: TodoData) => {
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
      match: (todoDataToFind: TodoData, todoDatum: TodoData) => {
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
  unprocessed: Set<TodoData>;

  constructor() {
    this.unprocessed = new Set();
  }

  unmatched(predicate: (todoDatum: TodoData) => boolean = () => false): Set<TodoData> {
    return new Set([...this.unprocessed].filter((todoDatum) => predicate(todoDatum)));
  }

  add(todoDatum: TodoData): void {
    this.unprocessed.add(todoDatum);
  }

  remove(todoDatum: TodoData): void {
    this.unprocessed.delete(todoDatum);
  }

  addOrRemove(operation: Operation, todoDatum: TodoData): void {
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

  find2(todoDatum: TodoData): TodoData | undefined {
    return [...this.unprocessed].find((unprocessedTodo) =>
      ExactMatchers.get(2)?.match(unprocessedTodo, todoDatum)
    );
  }

  find(
    predicate: (value: TodoData, index?: number, obj?: TodoData[]) => unknown
  ): TodoData | undefined {
    return [...this.unprocessed].find((todoDatum) => predicate(todoDatum));
  }

  exactMatch(todoDataToFind: TodoData): TodoData | undefined {
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

  fuzzyMatch(todoDataToFind: TodoData): TodoData | undefined {
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
