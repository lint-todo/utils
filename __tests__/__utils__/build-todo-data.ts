import { buildTodoDatum, generateHash } from '../../src/builders';
import TodoMatcher from '../../src/todo-matcher';
import {
  FilePath,
  LintMessage,
  LintResult,
  Location,
  Range,
  TodoConfig,
  TodoDataV2,
} from '../../src/types';
import { getFixture } from './get-fixture';
import { updatePaths } from './update-path';

const LINES_PATTERN = /(.*?(?:\r\n?|\n|$))/gm;

export function buildMaybeTodos(
  baseDir: string,
  lintResults: LintResult[],
  todoConfig?: TodoConfig
): Set<TodoDataV2> {
  const results = updatePaths(baseDir, lintResults).filter((result) => result.messages.length > 0);

  const todoData = results.reduce((converted, lintResult) => {
    lintResult.messages.forEach((message: LintMessage) => {
      if (message.severity === 2) {
        const range = getRange(message);
        const todoDatum = buildTodoDatum(
          baseDir,
          {
            engine: getEngine(lintResult),
            filePath: lintResult.filePath,
            ruleId: getRuleId(message),
            range,
            source: getSource(lintResult, message, range),
            originalLintResult: message,
          },
          todoConfig
        );

        converted.add(todoDatum);
      }
    });

    return converted;
  }, new Set<TodoDataV2>());

  return todoData;
}

export function buildMaybeTodosFromFixture(baseDir: string, fixtureName: string): Set<TodoDataV2> {
  const fixture = getFixture(fixtureName, baseDir, false);
  return buildMaybeTodos(baseDir, fixture);
}

export function buildMaybeTodosFromFixtureAsMap(
  baseDir: string,
  fixtureName: string
): Map<TodoFilePathHash, TodoDataV2> {
  const maybeTodos = buildMaybeTodosFromFixture(baseDir, fixtureName);

  return [...maybeTodos].reduce((map: Map<TodoFilePathHash, TodoDataV2>, todoDatum: TodoDataV2) => {
    const todoFilePathHash = todoFilePathFor(todoDatum);

    if (!map.has(todoFilePathHash)) {
      map.set(todoFilePathHash, todoDatum);
    }

    return map;
  }, new Map());
}

export function buildExistingTodos(
  baseDir: string,
  lintResults: LintResult[],
  todoConfig?: TodoConfig
): Map<FilePath, TodoMatcher> {
  const results = updatePaths(baseDir, lintResults).filter((result) => result.messages.length > 0);

  const todoData = results.reduce((converted, lintResult) => {
    lintResult.messages.forEach((message: LintMessage) => {
      if (message.severity === 2) {
        const range = getRange(message);
        const todoDatum = buildTodoDatum(
          baseDir,
          {
            engine: getEngine(lintResult),
            filePath: lintResult.filePath,
            ruleId: getRuleId(message),
            range,
            source: getSource(lintResult, message, range),
            originalLintResult: message,
          },
          todoConfig
        );

        if (!converted.has(todoDatum.filePath)) {
          converted.set(todoDatum.filePath, new TodoMatcher());
        }

        const matcher = converted.get(todoDatum.filePath);

        matcher?.add(todoDatum);
      }
    });

    return converted;
  }, new Map<FilePath, TodoMatcher>());

  return todoData;
}

export function buildExistingTodosFromFixture(
  baseDir: string,
  fixtureName: string
): Map<FilePath, TodoMatcher> {
  const fixture = getFixture(fixtureName, baseDir, false);
  return buildExistingTodos(baseDir, fixture);
}

export function getEngine(result: LintResult): string {
  return result.filePath.endsWith('.js') ? 'eslint' : 'ember-template-lint';
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function getRuleId(message: any): string {
  if (typeof message.ruleId !== 'undefined') {
    return message.ruleId;
  } else if (typeof message.rule !== 'undefined') {
    return message.rule;
  }
  return '';
}

export function getRange(loc: Location): Range {
  return {
    start: {
      line: loc.line,
      column: loc.column,
    },
    end: {
      // eslint-disable-next-line unicorn/no-null
      line: loc.endLine ?? loc.line,
      // eslint-disable-next-line unicorn/no-null
      column: loc.endColumn ?? loc.column,
    },
  };
}

export function getSource(lintResult: LintResult, lintMessage: LintMessage, range: Range): string {
  if (lintResult.source) {
    return generateHash(getSourceForRange(lintResult.source.match(LINES_PATTERN) || [], range));
  }

  if (lintMessage.source) {
    return generateHash(lintMessage.source);
  }

  return '';
}

function getSourceForRange(source: string[], range: Range) {
  const firstLine = range.start.line - 1;
  const lastLine = range.end.line - 1;
  let currentLine = firstLine - 1;
  const firstColumn = range.start.column - 1;
  const lastColumn = range.end.column - 1;
  const string = [];
  let line;

  while (currentLine < lastLine) {
    currentLine++;
    line = source[currentLine];

    if (currentLine === firstLine) {
      if (firstLine === lastLine) {
        string.push(line.slice(firstColumn, lastColumn));
      } else {
        string.push(line.slice(firstColumn));
      }
    } else if (currentLine === lastLine) {
      string.push(line.slice(0, lastColumn));
    } else {
      string.push(line);
    }
  }

  return string.join('');
}
