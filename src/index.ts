import { LintMessage, LintResult, PendingLintMessage } from './types';

export function buildPendingLintMessage(
  lintResult: LintResult,
  lintMessage: LintMessage
): PendingLintMessage {
  return {
    engine: getEngine(lintResult),
    filePath: lintResult.filePath,
    ruleId: getRuleId(lintMessage),
    line: lintMessage.line,
    column: lintMessage.column,
    createdDate: Date.now(),
  };
}

export function buildPendingLintMessages(results: LintResult[]): PendingLintMessage[] {
  const lintResults = results.filter((result) => result.messages.length > 0);

  const pendingLintMessages = lintResults.reduce((converted, lintResult) => {
    lintResult.messages.forEach((message: LintMessage) => {
      if (message.severity === 2) {
        converted.push(buildPendingLintMessage(lintResult, message));
      }
    });

    return converted;
  }, [] as PendingLintMessage[]);

  return pendingLintMessages;
}

export function generateFilename(pendingLintMessage: PendingLintMessage) {
  return '';
}

function getEngine(result: LintResult) {
  return result.filePath.endsWith('.js') ? 'eslint' : 'ember-template-lint';
}

function getRuleId(message: any) {
  if (typeof message.ruleId !== 'undefined') {
    return message.ruleId;
  } else if (typeof message.rule !== 'undefined') {
    return message.rule;
  }
  return '';
}
