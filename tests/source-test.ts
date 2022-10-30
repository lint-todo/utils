import { describe, it, expect } from 'vitest';
import { buildRange, getSourceForRange } from '../src/source';

describe('source', () => {
  describe('getSourceForRange', () => {
    it('returns empty string for empty source', () => {
      expect(getSourceForRange('', buildRange(0, 0))).toEqual('');
    });

    it('returns correct full single line fragment', () => {
      const source = "const someLongVariableDeclaration = 'This is a message!!'";
      const range = buildRange(1, 1, 1, 58);

      expect(getSourceForRange(source, range)).toEqual(source);
    });

    it('returns correct single line sub-fragment', () => {
      const source = "const someLongVariableDeclaration = 'This is a message!!'";
      const range = buildRange(1, 1, 1, 34);

      expect(getSourceForRange(source, range)).toEqual('const someLongVariableDeclaration');
    });

    it('returns correct multi line sub-fragment', () => {
      const source = `function addOne(i) {
  if (i != NaN) {
    return i++;
  }
  return;
}`;

      expect(getSourceForRange(source, buildRange(1, 10, 1, 16))).toEqual('addOne');
      expect(getSourceForRange(source, buildRange(2, 7, 2, 15))).toEqual('i != NaN');
    });
  });
});
