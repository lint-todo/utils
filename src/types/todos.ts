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

// This type is deprecated, but is still included here for backwards compatibility.
/**
 * Represents the path to the todo file.
 *
 * @deprecated This type is deprecated in favor of the more descriptive TodoFileHash.
 * @example
 * 42b8532cff6da75c5e5895a6f33522bf37418d0c/6e3be839
 */
export type FilePath = string;

/**
 * Represents the hashed filePath of the todos, which is a directory that contains todo files.
 *
 * @example
 * 42b8532cff6da75c5e5895a6f33522bf37418d0c
 */
export type TodoFilePathHash = string;

/**
 * Represents the path to the todo file.
 *
 * @example
 * 42b8532cff6da75c5e5895a6f33522bf37418d0c/6e3be839
 */
export type TodoFileHash = string;

export type TodoBatches = {
  add: Map<TodoFileHash, TodoDataV2>;
  expired: Map<TodoFileHash, TodoDataV2>;
  stable: Map<TodoFileHash, TodoDataV2>;
  remove: Map<TodoFileHash, TodoDataV2>;
};

export enum TodoFileFormat {
  Version1 = 1,
  Version2 = 2,
}

export type Operation = 'add' | 'remove';

export interface TodoDataV1 {
  engine: 'eslint' | 'ember-template-lint';
  filePath: string;
  ruleId: string;
  line: number;
  column: number;
  createdDate: number;
  fileFormat: TodoFileFormat;
  source?: string;
  warnDate?: number;
  errorDate?: number;
}

export interface TodoDataV2 {
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

export type TodoData = TodoDataV1 | TodoDataV2;

export type TodoDates = Pick<TodoDataV2, 'createdDate' | 'errorDate' | 'warnDate'>;

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
  shouldRemove: (todoDatum: TodoDataV2) => boolean;
}
