import { isFuzzyMatch, hasFuzzyMatch, isFuzzyMatchFromSourceHash } from "../src/match-utils";
import { getDatePart } from '../src/date-utils';
import { TodoData, FilePath } from "../src";

const todoDatumTemplate: TodoData = {
  engine: 'ember-template-lint',
  filePath: 'app/components/my-input.hbs',
  ruleId: 'require-input-label',
  line: 1,
  column: 1,
  createdDate: getDatePart().getTime(),
  source: '<input/>'
};

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

  it('does not recognize a fuzzy match if the filePath(s) do not match', () => {
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
      filePath: 'app/components/my-inputs.hbs',
      ruleId: 'require-input-label',
      line: 4,
      column: 3,
      createdDate: today,
      source: '<input/>'
    }
    expect(isFuzzyMatch(testTodo, refTodo)).toEqual(false);
  });

  it('does not recognize a fuzzy match if the ruleId(s) do not match', () => {
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
      ruleId: 'no-nested-interactive',
      line: 4,
      column: 3,
      createdDate: today,
      source: '<input/>'
    }
    expect(isFuzzyMatch(testTodo, refTodo)).toEqual(false);
  });

  it('does not recognize a fuzzy match if the source(s) do not match', () => {
    const testTodo: TodoData = {
      engine: 'ember-template-lint',
      filePath: 'app/components/my-input.hbs',
      ruleId: 'require-input-label',
      line: 4,
      column: 3,
      createdDate: today,
      source: '<textarea/>'
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

describe('isFuzzyMatch from template TodoData objects', () => {

  it('successfully identifies a fuzzy match when the line number has changed', () => {
    const testTodo: TodoData = todoDatumTemplate;
    const refTodo: TodoData = Object.assign({}, todoDatumTemplate, { line: 2 } );
    expect(isFuzzyMatch(testTodo, refTodo)).toEqual(true);
  });
});

describe('hasFuzzyMatch', () => {
  let today: number;
  beforeEach(() => {
    today = getDatePart().getTime();
  });

    // Relevant properties of default template:
    //   filePath: 'app/components/my-input.hbs',
    //   ruleId: 'require-input-label',
    //   line: 1, column: 1,
    //   source: '<input/>'

  it('successfully identifies a fuzzy match within a refMap when the line number has changed', () => {
    const testTodo: TodoData = todoDatumTemplate;
    const refTodoMap = new Map<FilePath, TodoData>();
    refTodoMap.set("hash01", Object.assign({}, todoDatumTemplate, { filepath: 'app/components/my-other-input.hbs' } ));
    refTodoMap.set("hash02", Object.assign({}, todoDatumTemplate, { ruleId: 'some-other-rule' } ));
    refTodoMap.set("hash03", Object.assign({}, todoDatumTemplate, { source: '<otherInput>' } ));
    refTodoMap.set("needle", Object.assign({}, todoDatumTemplate, { line: 2 } ));
    expect(hasFuzzyMatch(testTodo, refTodoMap)).toEqual(true);
  });

  it('successfully identifies a fuzzy match within a refMap when the column has changed', () => {
    const testTodo: TodoData = todoDatumTemplate;
    const refTodoMap = new Map<FilePath, TodoData>();
    refTodoMap.set("hash01", Object.assign({}, todoDatumTemplate, { filepath: 'app/components/my-other-input.hbs' } ));
    refTodoMap.set("hash02", Object.assign({}, todoDatumTemplate, { ruleId: 'some-other-rule' } ));
    refTodoMap.set("hash03", Object.assign({}, todoDatumTemplate, { source: '<otherInput>' } ));
    refTodoMap.set("needle", Object.assign({}, todoDatumTemplate, { column: 2 } ));
    expect(hasFuzzyMatch(testTodo, refTodoMap)).toEqual(true);
  });

  it('successfully identifies a fuzzy match within a refMap when the line and column have changed', () => {
    const testTodo: TodoData = todoDatumTemplate;
    const refTodoMap = new Map<FilePath, TodoData>();
    refTodoMap.set("hash01", Object.assign({}, todoDatumTemplate, { filepath: 'app/components/my-other-input.hbs' } ));
    refTodoMap.set("hash02", Object.assign({}, todoDatumTemplate, { ruleId: 'some-other-rule' } ));
    refTodoMap.set("hash03", Object.assign({}, todoDatumTemplate, { source: '<otherInput>' } ));
    refTodoMap.set("needle", Object.assign({}, todoDatumTemplate, { line: 2, column: 2 } ));
    expect(hasFuzzyMatch(testTodo, refTodoMap)).toEqual(true);
  });

  it('does not find a fuzzy match within a refMap containing exclusively todo data that has different filepath/ruleId/source properties', () => {
    const testTodo: TodoData = todoDatumTemplate;
    const refTodoMap = new Map<FilePath, TodoData>();
    refTodoMap.set("hash01", Object.assign({}, todoDatumTemplate, { filepath: 'app/components/my-other-input.hbs' } ));
    refTodoMap.set("hash02", Object.assign({}, todoDatumTemplate, { ruleId: 'some-other-rule' } ));
    refTodoMap.set("hash03", Object.assign({}, todoDatumTemplate, { source: '<otherInput>' } ));
    expect(hasFuzzyMatch(testTodo, refTodoMap)).toEqual(false);
  });

  it('does not find a fuzzy match within a refMap containing an exact match', () => {
    const testTodo: TodoData = todoDatumTemplate;
    const refTodoMap = new Map<FilePath, TodoData>();
    refTodoMap.set("hash01", Object.assign({}, todoDatumTemplate, { filepath: 'app/components/my-other-input.hbs' } ));
    refTodoMap.set("hash02", Object.assign({}, todoDatumTemplate, { ruleId: 'some-other-rule' } ));
    refTodoMap.set("hash03", Object.assign({}, todoDatumTemplate, { source: '<otherInput>' } ));
    refTodoMap.set("needle", Object.assign({}, todoDatumTemplate));
    expect(hasFuzzyMatch(testTodo, refTodoMap)).toEqual(false);
  });
});

describe('isFuzzyMatchFromSourceHash', () => {
    it('successfully identifies a source-hashed fuzzy matchwhen the line number has changed', () => {
      const testTodo: TodoData = todoDatumTemplate;
      const refTodo: TodoData = Object.assign({}, todoDatumTemplate, { line: 2 } );
      expect(isFuzzyMatchFromSourceHash(testTodo, refTodo)).toEqual(true);
    });

    it('successfully identifies a source-hashed fuzzy matchwhen the column number has changed', () => {
      const testTodo: TodoData = todoDatumTemplate;
      const refTodo: TodoData = Object.assign({}, todoDatumTemplate, { column: 2 } );
      expect(isFuzzyMatch(testTodo, refTodo)).toEqual(true);
    });

    it('successfully identifies a source-hashed fuzzy matchif both line and column have changed', () => {
      const testTodo: TodoData = todoDatumTemplate;
      const refTodo: TodoData = Object.assign({}, todoDatumTemplate, { line: 2, column: 2 } );
      expect(isFuzzyMatch(testTodo, refTodo)).toEqual(true);
    });

    it('does not recognize a source-hashed fuzzy matchif they are an exact match', () => {
      const testTodo: TodoData = todoDatumTemplate;
      const refTodo: TodoData = Object.assign({}, todoDatumTemplate );
      expect(isFuzzyMatch(testTodo, refTodo)).toEqual(false);
    });

    it('does not recognize a source-hashed fuzzy matchif the filePath(s) do not match', () => {
      const testTodo: TodoData = todoDatumTemplate;
      const refTodo: TodoData = Object.assign({}, todoDatumTemplate, { filePath: 'app/components/my-other-input.hbs' } );
      expect(isFuzzyMatch(testTodo, refTodo)).toEqual(false);
    });

    it('does not recognize a source-hashed fuzzy matchif the ruleId(s) do not match', () => {
      const testTodo: TodoData = todoDatumTemplate;
      const refTodo: TodoData = Object.assign({}, todoDatumTemplate, { ruleId: 'some-other-rule'  } );
      expect(isFuzzyMatch(testTodo, refTodo)).toEqual(false);
    });

    it('does not recognize a source-hashed fuzzy matchif the source(s) do not match', () => {
      const testTodo: TodoData = todoDatumTemplate;
      const refTodo: TodoData = Object.assign({}, todoDatumTemplate);
      expect(isFuzzyMatch(testTodo, refTodo)).toEqual(false);
    });

  });