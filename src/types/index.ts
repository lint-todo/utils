import { ESLint, Linter } from 'eslint';
import { PackageJson } from 'type-fest';

export enum Severity {
  todo = -1,
  off = 0,
  warn = 1,
  error = 2,
}
export interface TemplateLintReport {
  results: TemplateLintResult[];
  errorCount: number;
}

export interface TemplateLintResult {
  filePath: string;
  messages: TemplateLintMessage[];
  errorCount: number;
  source: string;
}

export interface TemplateLintMessage {
  rule: string;
  severity: 0 | 1 | 2;
  moduleId: string;
  message: string;
  line: number;
  column: number;
  source: string;
}

export type LintResult = ESLint.LintResult | TemplateLintResult;
export type LintMessage = Linter.LintMessage | TemplateLintMessage;

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
  add: Map<TodoFileHash, TodoData>;
  expired: Map<TodoFileHash, TodoData>;
  stable: Map<TodoFileHash, TodoData>;
  remove: Set<TodoFileHash>;
};
export interface TodoData {
  engine: 'eslint' | 'ember-template-lint';
  filePath: string;
  ruleId: string;
  line: number;
  column: number;
  source?: string;
  createdDate: number;
  warnDate?: number;
  errorDate?: number;
}

export type LintTodoPackageJson = PackageJson & {
  lintTodo?: TodoConfig | TodoConfigByEngine;
};

export type TodoBatchCounts = [add: number, remove: number, stable: number, expired: number];

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
