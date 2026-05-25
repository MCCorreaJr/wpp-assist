const { parseMessage, inferCategory } = require('../parserService');

describe('parserService', () => {
  test('parses add expense messages with known categories', () => {
    expect(parseMessage('Lance 45 reais de almo\u00e7o')).toMatchObject({
      intent: 'add_expense',
      amount: 45,
      category: 'Alimenta\u00e7\u00e3o',
      description: 'almo\u00e7o',
      paymentMethod: null,
    });

    expect(parseMessage('Gastei 120 no mercado')).toMatchObject({
      intent: 'add_expense',
      amount: 120,
      category: 'Mercado',
      description: 'mercado',
    });

    expect(parseMessage('Adicione 20 de gasolina')).toMatchObject({
      intent: 'add_expense',
      amount: 20,
      category: 'Transporte',
      description: 'gasolina',
    });

    expect(parseMessage('Paguei 300 de aluguel')).toMatchObject({
      intent: 'add_expense',
      amount: 300,
      category: 'Moradia',
      description: 'aluguel',
    });
  });

  test('uses Outros when category is unknown', () => {
    expect(parseMessage('Gastei 89 de presente')).toMatchObject({
      intent: 'add_expense',
      amount: 89,
      category: 'Outros',
      description: 'presente',
    });
  });

  test('parses report intents', () => {
    expect(parseMessage('quanto gastei esse m\u00eas')).toEqual({
      intent: 'monthly_total',
    });

    expect(parseMessage('gastos do m\u00eas')).toEqual({
      intent: 'monthly_total',
    });

    expect(parseMessage('quanto gastei com mercado')).toEqual({
      intent: 'category_total',
      category: 'Mercado',
      description: 'mercado',
    });
  });

  test('normalizes accents for category inference', () => {
    expect(inferCategory('farm\u00e1cia')).toBe('Sa\u00fade');
    expect(inferCategory('almoco')).toBe('Alimenta\u00e7\u00e3o');
  });

  test('returns unknown intent for unsupported messages', () => {
    expect(parseMessage('oi')).toEqual({
      intent: 'unknown',
    });
  });
});
