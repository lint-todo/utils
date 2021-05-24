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

export type FilePath = string;
export interface TodoData {
  engine: 'eslint' | 'ember-template-lint';
  filePath: string;
  ruleId: string;
  line: number;
  column: number;
  createdDate: number;
  warnDate?: number;
  errorDate?: number;
}

export type LintTodoPackageJson = PackageJson & {
  lintTodo?: TodoConfig;
};

export type TodoBatchCounts = [number, number];

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
