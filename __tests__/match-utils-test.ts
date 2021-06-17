import { isFuzzyMatch } from "../src/match-utils";
import { getDatePart } from '../src/date-utils';
import { TodoData } from "../src";

describe('isFuzzyMatch', () => {
  let today: number;

  beforeEach(() => {
    today = getDatePart().getTime();
  });

  it('successfully identifies a fuzzy match when the line number has changed', () => {
    const testTodo: TodoData = {
      engine: 'ember-template-lint',
      filePath: 'app/components/my-input.hbs',
      ruleId: 'require-input-label',
      line: 4,
      column: 3,
      createdDate: today,
      source: '<input/>'
    }
    const refTodo: TodoData = {
      engine: 'ember-template-lint',
      filePath: 'app/components/my-input.hbs',
      ruleId: 'require-input-label',
      line: 5,
      column: 3,
      createdDate: today,
      source: '<input/>'
    }
    expect(isFuzzyMatch(testTodo, refTodo)).toEqual(true);
  });

  it('successfully identifies a fuzzy match when the column number has changed', () => {
    const testTodo: TodoData = {
      engine: 'ember-template-lint',
      filePath: 'app/components/my-input.hbs',
      ruleId: 'require-input-label',
      line: 4,
      column: 3,
      createdDate: today,
      source: '<input/>'
    }
    const refTodo: TodoData = {
      engine: 'ember-template-lint',
      filePath: 'app/components/my-input.hbs',
      ruleId: 'require-input-label',
      line: 4,
      column: 5,
      createdDate: today,
      source: '<input/>'
    }
    expect(isFuzzyMatch(testTodo, refTodo)).toEqual(true);
  });

  it('successfully identifies a fuzzy match if both line and column have changed', () => {
    const testTodo: TodoData = {
      engine: 'ember-template-lint',
      filePath: 'app/components/my-input.hbs',
      ruleId: 'require-input-label',
      line: 4,
      column: 3,
      createdDate: today,
      source: '<input/>'
    }
    const refTodo: TodoData = {
      engine: 'ember-template-lint',
      filePath: 'app/components/my-input.hbs',
      ruleId: 'require-input-label',
      line: 5,
      column: 5,
      createdDate: today,
      source: '<input/>'
    }
    expect(isFuzzyMatch(testTodo, refTodo)).toEqual(true);
  });

  it('does not recognize a fuzzy match if they are an exact match', () => {
    const testTodo: TodoData = {
      engine: 'ember-template-lint',
      filePath: 'app/components/my-input.hbs',
      ruleId: 'require-input-label',
      line: 4,
      column: 3,
      createdDate: today,
      source: '<input/>'
    }
    const refTodo: TodoData = {
      engine: 'ember-template-lint',
      filePath: 'app/components/my-input.hbs',
      ruleId: 'require-input-label',
      line: 4,
      column: 3,
      createdDate: today,
      source: '<input/>'
    }
    expect(isFuzzyMatch(testTodo, refTodo)).toEqual(false);
  });
});