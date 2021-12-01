import { ESLint, Linter } from 'eslint';

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
  endLine?: number;
  endColumn?: number;
  source: string;
}

export type LintResult = ESLint.LintResult | TemplateLintResult;
export type LintMessage = Linter.LintMessage | TemplateLintMessage;
