import { PackageJson } from 'type-fest';

export type Location = {
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
};

export interface GenericLintData {
  engine: string;
  filePath: string;
  ruleId: string;
  range: Range;
  source: string;
  originalLintResult: any;
}

/**
 * Represents the path to the todo file.
 *
 * @example
 * app/settings/foo.js
 */
export type FilePath = string;

export type TodoBatches = {
  add: Set<TodoData>;
  expired: Set<TodoData>;
  stable: Set<TodoData>;
  remove: Set<TodoData>;
};

export type Engine = 'eslint' | 'ember-template-lint' | string;
export type OperationType = 'add' | 'remove';
export type Operation =
  `${OperationType}|${Engine}|${string}|${number}|${number}|${number}|${number}|${string}|${
    | number
    | ''}|${number | ''}|${string}`;
export type OperationOrConflictLine =
  | Operation
  | `<<<<<<< ${string}`
  | `>>>>>>> ${string}`
  | '=======';

export interface TodoData {
  engine: Engine;
  filePath: string;
  ruleId: string;
  range: Range;
  createdDate: number;
  source: string;
  warnDate?: number;
  errorDate?: number;
  originalLintResult?: any;
}

export type TodoDates = Pick<TodoData, 'createdDate' | 'errorDate' | 'warnDate'>;

export type Range = {
  start: {
    line: number;
    column: number;
  };

  end: {
    line: number;
    column: number;
  };
};

export type LintTodoPackageJson = PackageJson & {
  lintTodo?: TodoConfig | TodoConfigByEngine;
};

export type TodoBatchCounts = {
  addedCount: number;
  removedCount: number;
  stableCount: number;
  expiredCount: number;
};

export type DaysToDecay = {
  warn?: number;
  error?: number;
};

export type DaysToDecayByRule = {
  [ruleId: string]: DaysToDecay;
};

export interface TodoConfig {
  daysToDecay?: DaysToDecay;
  daysToDecayByRule?: DaysToDecayByRule;
}

export interface TodoConfigByEngine {
  [engine: string]: TodoConfig;
}

/**
 * A configuration object passed to write todos.
 *
 * @param engine - The engine that represents the lint too being used with todos.
 * @param filePath - The relative file path of the file to update violations for.
 * @param todoConfig - An object containing the warn or error days, in integers.
 * @param skipRemoval - Allows for skipping removal of todo files.
 */
export interface WriteTodoOptions {
  engine: Engine;
  filePath: string;
  todoConfig: TodoConfig;
  shouldRemove: (todoDatum: TodoData) => boolean;
}

/**
 * A configuration object passed to read todos.
 *
 * @param engine - The engine that represents the lint too being used with todos.
 * @param filePath - The relative file path of the file to update violations for.
 */
export interface ReadTodoOptions {
  engine: Engine;
  filePath: string;
}
