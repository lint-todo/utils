import { describe, beforeEach, it, expect } from 'vitest';
import { subDays, addDays } from 'date-fns';
import { isExpired, getDatePart, differenceInDays, format } from '../src/date-utils';

describe('date-utils', () => {
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

  describe('differenceInDays', () => {
    it('returns 0 when dates are same', () => {
      expect(differenceInDays(new Date('2021-01-01'), new Date('2021-01-01'))).toEqual(0);
    });

    it('returns 1 when start date is 1 days before end date', () => {
      expect(differenceInDays(new Date('2021-01-01'), new Date('2021-01-02'))).toEqual(1);
    });

    it('returns 10 when start date is 10 days before end date', () => {
      expect(differenceInDays(new Date('2021-01-01'), new Date('2021-01-11'))).toEqual(10);
    });

    it('returns -1 when start date is past end date', () => {
      expect(differenceInDays(new Date('2021-01-02'), new Date('2021-01-01'))).toEqual(-1);
    });

    it('returns -10 when start date is past end date', () => {
      expect(differenceInDays(new Date('2021-01-11'), new Date('2021-01-01'))).toEqual(-10);
    });
  });

  describe('format', () => {
    it('returns correctly formatted date for string', () => {
      expect(format('2021-01-01')).toEqual('2021-01-01');
    });

    it('returns correctly formatted date for number', () => {
      expect(format(1_609_459_200_000)).toEqual('2021-01-01');
    });

    it('returns correctly formatted date for date', () => {
      expect(format(getDatePart(new Date('2021-01-01')))).toEqual('2021-01-01');
    });
  });
});
