import { generateFileName } from './io';
import { LintMessage, LintResult, PendingLintMessage } from './types';

/**
 * Adapts a list of {ESLint.LintResult} or {TemplateLintResult} to a map of fileHash, pendingLintMessage.
 *
 * @param lintResults A list of {LintResult} objects to convert to {PendingLintMessage} objects.
 */
export function buildPendingLintMessages(
  lintResults: LintResult[]
): Map<string, PendingLintMessage> {
  const results = lintResults.filter((result) => result.messages.length > 0);

  const pendingLintMessages = results.reduce((converted, lintResult) => {
    lintResult.messages.forEach((message: LintMessage) => {
      if (message.severity === 2) {
        const pendingLintMessage = _buildPendingLintMessage(lintResult, message);

        converted.set(generateFileName(pendingLintMessage), pendingLintMessage);
      }
    });

    return converted;
  }, new Map<string, PendingLintMessage>());

  return pendingLintMessages;
}

/**
 * Adapts an {ESLint.LintResult} or {TemplateLintResult} to a {PendingLintMessage}
 *
 * @param lintResult The lint result object, either an {ESLint.LintResult} or a {TemplateLintResult}.
 * @param lintMessage A lint message object representing a specific violation for a file.
 */
export function _buildPendingLintMessage(
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
