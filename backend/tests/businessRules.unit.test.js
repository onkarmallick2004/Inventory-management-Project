// Unit tests for the pure business-rule functions (no database needed).
const { resetsServiceClock, calculateNextServiceDue } = require('../src/services/dueDateService');
const { findShortages, isLowStock } = require('../src/services/stockService');
const { coverageStatus, daysUntil } = require('../src/utils/dates');

describe('Next service due date', () => {
  test('is the closing date plus the service interval', () => {
    const next = calculateNextServiceDue(new Date('2026-03-01T10:00:00Z'), 90);
    expect(next.toISOString()).toBe('2026-05-30T10:00:00.000Z');
  });

  test('handles month and year boundaries', () => {
    expect(calculateNextServiceDue(new Date('2026-12-15T00:00:00Z'), 30).toISOString()).toBe('2027-01-14T00:00:00.000Z');
    expect(calculateNextServiceDue(new Date('2028-02-01T00:00:00Z'), 29).toISOString()).toBe('2028-03-01T00:00:00.000Z'); // leap year
  });

  test('rejects invalid intervals', () => {
    expect(() => calculateNextServiceDue(new Date(), 0)).toThrow();
    expect(() => calculateNextServiceDue(new Date(), -5)).toThrow();
    expect(() => calculateNextServiceDue(new Date(), 1.5)).toThrow();
  });

  test('only ROUTINE jobs reset the service clock', () => {
    expect(resetsServiceClock('ROUTINE')).toBe(true);
    expect(resetsServiceClock('BREAKDOWN')).toBe(false);
    expect(resetsServiceClock('INSTALLATION')).toBe(false);
  });
});

describe('Stock shortage check', () => {
  const part = (id, stockQty) => ({ id, partNumber: `P-${id}`, name: `Part ${id}`, stockQty });

  test('no shortages when every part has enough stock (including exactly enough)', () => {
    expect(findShortages([{ quantity: 2, part: part(1, 5) }, { quantity: 3, part: part(2, 3) }])).toEqual([]);
  });

  test('lists every part that is short, with required vs in stock', () => {
    const shortages = findShortages([
      { quantity: 2, part: part(1, 5) },
      { quantity: 4, part: part(2, 1) },
      { quantity: 1, part: part(3, 0) },
    ]);
    expect(shortages).toEqual([
      { partId: 2, partNumber: 'P-2', name: 'Part 2', required: 4, inStock: 1 },
      { partId: 3, partNumber: 'P-3', name: 'Part 3', required: 1, inStock: 0 },
    ]);
  });

  test('a job with no parts has no shortages', () => {
    expect(findShortages([])).toEqual([]);
  });

  test('low stock means at or below the minimum level', () => {
    expect(isLowStock({ stockQty: 3, minimumLevel: 3 })).toBe(true);
    expect(isLowStock({ stockQty: 2, minimumLevel: 3 })).toBe(true);
    expect(isLowStock({ stockQty: 4, minimumLevel: 3 })).toBe(false);
  });
});

describe('Warranty / AMC status', () => {
  const today = new Date('2026-06-01T09:00:00Z');
  test('classifies end dates', () => {
    expect(coverageStatus(null, today)).toBe('NONE');
    expect(coverageStatus(new Date('2026-05-20'), today)).toBe('EXPIRED');
    expect(coverageStatus(new Date('2026-06-20'), today)).toBe('EXPIRING_SOON');
    expect(coverageStatus(new Date('2026-09-01'), today)).toBe('ACTIVE');
  });

  test('daysUntil counts whole days', () => {
    expect(daysUntil(new Date('2026-06-11T09:00:00Z'), today)).toBe(10);
    expect(daysUntil(new Date('2026-05-30T09:00:00Z'), today)).toBe(-2);
  });
});
