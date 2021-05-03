import { subDays, addDays } from 'date-fns';
import { isExpired, getDatePart } from '../src/date-utils';

describe('isExpired', () => {
  let today: number;

  beforeEach(() => {
    today = getDatePart().getTime();
  });

  it('returns false when a date is not expired', () => {
    expect(isExpired(getDatePart().getTime(), today)).toEqual(false);
    expect(isExpired(addDays(getDatePart(), 1).getTime(), today)).toEqual(false);
  });

  it('returns true when a date is expired', () => {
    expect(isExpired(subDays(getDatePart(), 1).getTime(), today)).toEqual(true);
  });
});
