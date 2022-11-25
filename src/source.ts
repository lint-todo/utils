import { existsSync, readFileSync } from 'node:fs';
import { Range } from './types';

const LINES_PATTERN = /(.*?(?:\r\n?|\n|$))/gm;
export const _sourceCache = new Map<string, string>();

/**
 * Converts node positional numbers into a Range object.
 *
 * @param line - The source start line.
 * @param column - The source start column.
 * @param endLine - The source end line.
 * @param endColumn - The source end column.
 * @returns A range object.
 */
export function buildRange(
  line: number,
  column: number,
  endLine?: number,
  endColumn?: number
): Range {
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

/**
 * Reads a source file, optionally caching it if it's already been read.
 *
 * @param filePath - The path to the source file.
 * @returns The file contents.
 */
export function readSource(filePath: string | undefined): string {
  if (!filePath) {
    return '';
  }

  if (existsSync(filePath) && !_sourceCache.has(filePath)) {
    const source = readFileSync(filePath, { encoding: 'utf8' });

    _sourceCache.set(filePath, source);
  }

  return _sourceCache.get(filePath) || '';
}

/**
 * Extracts a source fragment from a file's contents based on the provided Range.
 *
 * @param source - The file contents.
 * @param range - A Range object representing the range to extract from the file contents.
 * @returns The source fragment.
 */
export function getSourceForRange(source: string, range: Range): string {
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
