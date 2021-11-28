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

export enum TodoFileFormat {
  Version1 = 1,
  Version2 = 2,
}

export type Operation = 'add' | 'remove';

export interface TodoData {
  engine: 'eslint' | 'ember-template-lint' | string;
  filePath: string;
  ruleId: string;
  range: Range;
  createdDate: number;
  fileFormat: TodoFileFormat;
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
 * An optional configuration object passed to writeTodos.
 *
 * @param filePath - The relative file path of the file to update violations for.
 * @param todoConfig - An object containing the warn or error days, in integers.
 * @param skipRemoval - Allows for skipping removal of todo files.
 */
export interface WriteTodoOptions {
  filePath: string;
  todoConfig: TodoConfig;
  shouldRemove: (todoDatum: TodoData) => boolean;
}
