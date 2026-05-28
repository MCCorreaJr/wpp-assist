describe('aiIntentService', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  test('extracts intent using OpenAI structured output', async () => {
    const create = jest.fn().mockResolvedValue({
      output_text: JSON.stringify({
        intent: 'add_expense',
        amount: 53,
        category: 'Alimenta\u00e7\u00e3o',
        description: 'ifood',
        date: '2026-05-28',
        paymentMethod: null,
      }),
    });

    jest.doMock('../../integrations/openaiClient', () => ({
      openai: {
        responses: {
          create,
        },
      },
    }));

    const { extractIntent } = require('../aiIntentService');

    await expect(extractIntent('gastei 53 no ifood')).resolves.toEqual({
      intent: 'add_expense',
      amount: 53,
      category: 'Alimenta\u00e7\u00e3o',
      description: 'ifood',
      date: '2026-05-28',
      paymentMethod: null,
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-5-mini',
        text: {
          format: expect.objectContaining({
            type: 'json_schema',
            name: 'financial_intent',
            strict: true,
          }),
        },
      }),
      {
        timeout: 10000,
      },
    );
  });

  test('falls back to regex parser when OpenAI is unavailable', async () => {
    jest.doMock('../../integrations/openaiClient', () => ({
      openai: null,
    }));

    const { extractIntent } = require('../aiIntentService');

    await expect(extractIntent('Adicione 20 de gasolina')).resolves.toMatchObject({
      intent: 'add_expense',
      amount: 20,
      category: 'Transporte',
      description: 'gasolina',
    });
  });

  test('falls back to regex parser when OpenAI throws', async () => {
    const create = jest.fn().mockRejectedValue(new Error('rate limit'));

    jest.doMock('../../integrations/openaiClient', () => ({
      openai: {
        responses: {
          create,
        },
      },
    }));

    const { extractIntent } = require('../aiIntentService');

    await expect(extractIntent('quanto gastei com mercado')).resolves.toEqual({
      intent: 'get_category_total',
      amount: null,
      category: 'Mercado',
      description: 'mercado',
      date: null,
      paymentMethod: null,
    });
  });
});
