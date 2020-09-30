import { LintMessage, LintResult, PendingLintMessage } from './types';

/**
 * Adapts an {ESLint.LintResult} or {TemplateLintResult} to a {PendingLintMessage}
 *
 * @param lintResult The lint result object, either an {ESLint.LintResult} or a {TemplateLintResult}.
 * @param lintMessage A lint message object representing a specific violation for a file.
 */
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

/**
 * * Adapts a list of {ESLint.LintResult} or {TemplateLintResult} to a list of {PendingLintMessage}.
 *
 * @param lintResults A list of {LintResult} objects to convert to {PendingLintMessage} objects.
 */
export function buildPendingLintMessages(lintResults: LintResult[]): PendingLintMessage[] {
  const results = lintResults.filter((result) => result.messages.length > 0);

  const pendingLintMessages = results.reduce((converted, lintResult) => {
    lintResult.messages.forEach((message: LintMessage) => {
      if (message.severity === 2) {
        converted.push(buildPendingLintMessage(lintResult, message));
      }
    });

    return converted;
  }, [] as PendingLintMessage[]);

  return pendingLintMessages;
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
