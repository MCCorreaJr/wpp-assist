const { formatBRL } = require('../currencyUtils');

describe('currencyUtils', () => {
  test('formats values as BRL with regular space', () => {
    expect(formatBRL(45)).toBe('R$ 45,00');
    expect(formatBRL(120.5)).toBe('R$ 120,50');
  });
});
