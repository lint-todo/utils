import { TodoDataV2, getDatePart, getSeverity, Severity } from '../src';
import { subDays, addDays } from 'date-fns';

describe('getSeverity', () => {
  let todo: TodoDataV2;

  beforeEach(() => {
    todo = {
      engine: 'eslint',
      filePath: 'app/controllers/settings.js',
      ruleId: 'no-prototype-builtins',
      range: {
        start: {
          line: 25,
          column: 21,
        },
        end: {
          line: 25,
          column: 21,
        },
      },
      source: '',
      fileFormat: 2,

      createdDate: getDatePart(new Date()).getTime(),
    };
  });

  it('returns todo severity if no error or warn dates present', () => {
    expect(getSeverity(todo)).toEqual(Severity.todo);
  });

  it('returns error severity if errorDate is before than today', () => {
    todo.errorDate = subDays(getDatePart(new Date()), 1).getTime();

    expect(getSeverity(todo)).toEqual(Severity.error);
  });

  it('returns warn severity if warnDate is before than today', () => {
    todo.warnDate = subDays(getDatePart(new Date()), 1).getTime();

    expect(getSeverity(todo)).toEqual(Severity.warn);
  });

  it('returns warn severity if warnDate is before than today but errorDate is after', () => {
    todo.errorDate = addDays(getDatePart(new Date()), 1).getTime();
    todo.warnDate = subDays(getDatePart(new Date()), 1).getTime();

    expect(getSeverity(todo)).toEqual(Severity.warn);
  });
});
