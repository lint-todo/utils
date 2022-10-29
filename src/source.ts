import { existsSync, readFileSync } from 'fs';
import { Range } from './types';

const LINES_PATTERN = /(.*?(?:\r\n?|\n|$))/gm;
export const _sourceCache = new Map<string, string>();

export function buildRange(line: number, column: number, endLine?: number, endColumn?: number) {
  return {
    start: {
      line: line,
      column: column,
    },
    end: {
      line: endLine ?? line,
      column: endColumn ?? column,
    },
  };
}

export function readSource(filePath: string | undefined) {
  if (!filePath) {
    return '';
  }

  if (existsSync(filePath) && !_sourceCache.has(filePath)) {
    const source = readFileSync(filePath, { encoding: 'utf8' });

    _sourceCache.set(filePath, source);
  }

  return _sourceCache.get(filePath) || '';
}

export function getSourceForRange(source: string, range: Range) {
  if (!source) {
    return '';
  }

  const sourceLines = source.match(LINES_PATTERN) || [];
  const firstLine = range.start.line - 1;
  const lastLine = range.end.line - 1;
  let currentLine = firstLine - 1;
  const firstColumn = range.start.column - 1;
  const lastColumn = range.end.column - 1;
  const src = [];
  let line;

  while (currentLine < lastLine) {
    currentLine++;
    line = sourceLines[currentLine];

    if (currentLine === firstLine) {
      if (firstLine === lastLine) {
        src.push(line.slice(firstColumn, lastColumn));
      } else {
        src.push(line.slice(firstColumn));
      }
    } else if (currentLine === lastLine) {
      src.push(line.slice(0, lastColumn));
    } else {
      src.push(line);
    }
  }

  return src.join('');
}
