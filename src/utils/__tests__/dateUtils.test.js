const { isValidDate } = require('../dateUtils');

describe('dateUtils', () => {
  test('validates dates in YYYY-MM-DD format', () => {
    expect(isValidDate('2026-05-25')).toBe(true);
    expect(isValidDate('2026-02-31')).toBe(false);
    expect(isValidDate('25/05/2026')).toBe(false);
  });
});
