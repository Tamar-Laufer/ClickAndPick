import { describe, it, expect } from 'vitest';
import { fullName, priceParts, priceText, distanceLabel } from '../format';

describe('fullName', () => {
  it('joins first + last name', () => {
    expect(fullName({ firstName: 'Dana', lastName: 'Cohen' })).toBe('Dana Cohen');
  });

  it('uses only the part that is present', () => {
    expect(fullName({ firstName: 'Dana' })).toBe('Dana');
    expect(fullName({ lastName: 'Cohen' })).toBe('Cohen');
  });

  it('returns the fallback when the person is missing', () => {
    expect(fullName(null)).toBe('');
    expect(fullName(undefined, 'משתמש')).toBe('משתמש');
  });

  it('returns the fallback when all name parts are blank', () => {
    expect(fullName({ firstName: '', lastName: '' }, 'אורח')).toBe('אורח');
  });
});

describe('priceParts / priceText', () => {
  it('formats a paid daily rate', () => {
    expect(priceParts({ dailyRate: 30 })).toEqual({ main: '₪30', unit: '/ ליום' });
    expect(priceText({ dailyRate: 30 })).toBe('₪30 ליום');
  });

  it('formats a free item', () => {
    expect(priceParts({ dailyRate: 0 })).toEqual({ main: 'חינם', unit: '' });
    expect(priceText({ dailyRate: 0 })).toBe('חינם');
  });

  it('falls back to "by arrangement" for a missing or negative rate', () => {
    expect(priceParts({}).main).toBe('לפי תיאום');
    expect(priceText({ dailyRate: -5 })).toBe('לפי תיאום');
  });
});

describe('distanceLabel', () => {
  it('returns null when there is no usable distance', () => {
    expect(distanceLabel(null)).toBeNull();
    expect(distanceLabel(undefined)).toBeNull();
    expect(distanceLabel(NaN)).toBeNull();
  });

  it('shows "less than 0.5 km" for very close items', () => {
    expect(distanceLabel(200)).toBe('פחות מ-0.5 ק״מ ממך');
  });

  it('rounds to the nearest half kilometre', () => {
    expect(distanceLabel(1300)).toBe('כ-1.5 ק״מ ממך');
    expect(distanceLabel(2000)).toBe('כ-2 ק״מ ממך');
  });
});
