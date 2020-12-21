import { ESLint, Linter } from 'eslint';

type Severity = 0 | 1 | 2;

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
  severity: Severity;
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
  createdDate: Date;
  warnDate?: Date;
  errorDate?: Date;
}

export interface DaysToDecay {
  warn?: number,
  error?: number,
}
