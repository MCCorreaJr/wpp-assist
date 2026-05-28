jest.mock('../../integrations/whatsappClient', () => ({
  sendTextMessage: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('../expenseService', () => ({
  createExpense: jest.fn().mockResolvedValue({
    date: '2026-05-25',
    category: 'Alimenta\u00e7\u00e3o',
    description: 'almo\u00e7o',
    amount: 45,
  }),
}));

jest.mock('../reportService', () => ({
  getMonthlyTotalReport: jest.fn().mockResolvedValue('Voc\u00ea gastou R$ 165,00 este m\u00eas.'),
  getCategoryTotalReport: jest
    .fn()
    .mockResolvedValue('Voc\u00ea gastou R$ 120,00 com Mercado neste m\u00eas.'),
}));

jest.mock('../aiIntentService', () => ({
  extractIntent: jest.fn(async (text) => {
    const normalizedText = String(text || '').toLowerCase();

    if (normalizedText.includes('almo\u00e7o')) {
      return {
        intent: 'add_expense',
        amount: 45,
        category: 'Alimenta\u00e7\u00e3o',
        description: 'almo\u00e7o',
        date: '2026-05-28',
        paymentMethod: null,
      };
    }

    if (normalizedText.includes('gasolina')) {
      return {
        intent: 'add_expense',
        amount: 140,
        category: 'Transporte',
        description: 'gasolina',
        date: '2026-05-28',
        paymentMethod: null,
      };
    }

    if (normalizedText.includes('cr\u00e9dito') || normalizedText.includes('credito')) {
      return {
        intent: 'update_expense_context',
        amount: null,
        category: null,
        description: null,
        date: null,
        paymentMethod: 'Cr\u00e9dito',
      };
    }

    if (normalizedText.includes('mais 20')) {
      return {
        intent: 'add_incremental_expense',
        amount: 20,
        category: null,
        description: null,
        date: null,
        paymentMethod: null,
      };
    }

    if (normalizedText.includes('quanto gastei esse')) {
      return {
        intent: 'get_month_total',
        amount: null,
        category: null,
        description: null,
        date: null,
        paymentMethod: null,
      };
    }

    if (normalizedText.includes('quanto gastei com mercado')) {
      return {
        intent: 'get_category_total',
        amount: null,
        category: 'Mercado',
        description: 'mercado',
        date: null,
        paymentMethod: null,
      };
    }

    return {
      intent: 'unknown',
      amount: null,
      category: null,
      description: null,
      date: null,
      paymentMethod: null,
    };
  }),
}));

const { sendTextMessage } = require('../../integrations/whatsappClient');
const { createExpense } = require('../expenseService');
const {
  getMonthlyTotalReport,
  getCategoryTotalReport,
} = require('../reportService');
const {
  processIncomingMessage,
  extractIncomingMessage,
} = require('../messageService');
const { clearPendingAction } = require('../confirmationService');
const { clearHistory } = require('../conversationMemoryService');
const pendingActionService = require('../pendingActionService');

function buildPayload(text, type = 'text') {
  return {
    entry: [
      {
        changes: [
          {
            value: {
              contacts: [
                {
                  profile: {
                    name: 'Manoel',
                  },
                },
              ],
              messages: [
                {
                  from: '5511999999999',
                  type,
                  text: {
                    body: text,
                  },
                  id: 'wamid.test',
                  timestamp: '1779710400',
                },
              ],
            },
          },
        ],
      },
    ],
  };
}

describe('messageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearPendingAction('5511999999999');
    clearHistory('5511999999999');
  });

  afterEach(() => {
    clearPendingAction('5511999999999');
    clearHistory('5511999999999');
  });

  test('extracts text message data from WhatsApp payload', () => {
    expect(extractIncomingMessage(buildPayload('Gastei 45 de almo\u00e7o'))).toEqual({
      phone: '5511999999999',
      text: 'Gastei 45 de almo\u00e7o',
      name: 'Manoel',
      messageId: 'wamid.test',
      timestamp: '1779710400',
    });
  });

  test('ignores invalid or non-text payloads', async () => {
    expect(extractIncomingMessage(buildPayload('', 'image'))).toBeNull();

    await expect(processIncomingMessage({})).resolves.toEqual({
      ignored: true,
    });
    expect(sendTextMessage).not.toHaveBeenCalled();
  });

  test('asks for confirmation before saving an expense', async () => {
    await expect(processIncomingMessage(buildPayload('Gastei 45 de almo\u00e7o'))).resolves.toEqual({
      pending: true,
      intent: 'add_expense',
    });

    expect(createExpense).not.toHaveBeenCalled();
    expect(sendTextMessage).toHaveBeenCalledWith(
      '5511999999999',
      expect.stringContaining('Valor: R$ 45,00'),
    );
  });

  test('saves pending expense when user confirms with SIM', async () => {
    await processIncomingMessage(buildPayload('Gastei 45 de almo\u00e7o'));
    await processIncomingMessage(buildPayload('sim'));

    expect(createExpense).toHaveBeenCalledWith(
      expect.objectContaining({
        intent: 'add_expense',
        amount: 45,
        category: 'Alimenta\u00e7\u00e3o',
        description: 'almo\u00e7o',
      }),
    );
    expect(sendTextMessage).toHaveBeenLastCalledWith(
      '5511999999999',
      'Despesa registrada com sucesso.',
    );
  });

  test('cancels pending expense', async () => {
    await processIncomingMessage(buildPayload('Gastei 45 de almo\u00e7o'));
    await processIncomingMessage(buildPayload('cancela'));

    expect(createExpense).not.toHaveBeenCalled();
    expect(sendTextMessage).toHaveBeenLastCalledWith('5511999999999', 'Opera\u00e7\u00e3o cancelada.');
  });

  test('updates a pending expense with conversational context', async () => {
    await processIncomingMessage(buildPayload('coloca 140 de gasolina'));
    await processIncomingMessage(buildPayload('foi no cr\u00e9dito'));

    expect(sendTextMessage).toHaveBeenLastCalledWith(
      '5511999999999',
      expect.stringContaining('Atualizei a despesa pendente.'),
    );
    expect(sendTextMessage).toHaveBeenLastCalledWith(
      '5511999999999',
      expect.stringContaining('Valor: R$ 140,00'),
    );

    await processIncomingMessage(buildPayload('sim'));

    expect(createExpense).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 140,
        paymentMethod: 'Cr\u00e9dito',
      }),
    );
  });

  test('increments a pending expense with conversational context', async () => {
    await processIncomingMessage(buildPayload('Gastei 45 de almo\u00e7o'));
    await processIncomingMessage(buildPayload('mais 20'));
    await processIncomingMessage(buildPayload('sim'));

    expect(createExpense).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 65,
        category: 'Alimenta\u00e7\u00e3o',
      }),
    );
  });

  test('blocks confirmation when pending expense is expired', async () => {
    pendingActionService.save('5511999999999', {
      type: 'add_expense',
      createdAt: '2000-01-01T18:00:00.000Z',
      expiresAt: '2000-01-01T18:01:00.000Z',
      data: {
        amount: 45,
        category: 'Alimenta\u00e7\u00e3o',
        description: 'almo\u00e7o',
        date: '2026-05-28',
        paymentMethod: null,
      },
    });

    await processIncomingMessage(buildPayload('sim'));

    expect(createExpense).not.toHaveBeenCalled();
    expect(sendTextMessage).toHaveBeenLastCalledWith(
      '5511999999999',
      'Essa solicita\u00e7\u00e3o expirou.\nPor favor envie novamente.',
    );
  });

  test('asks for confirmation from natural AI-parsed expense text', async () => {
    await expect(processIncomingMessage(buildPayload('coloca 140 de gasolina'))).resolves.toEqual({
      pending: true,
      intent: 'add_expense',
    });

    expect(sendTextMessage).toHaveBeenCalledWith(
      '5511999999999',
      expect.stringContaining('Categoria: Transporte'),
    );
    expect(sendTextMessage).toHaveBeenCalledWith(
      '5511999999999',
      expect.stringContaining('Valor: R$ 140,00'),
    );
  });

  test('responds monthly and category reports', async () => {
    await processIncomingMessage(buildPayload('quanto gastei esse m\u00eas'));
    await processIncomingMessage(buildPayload('quanto gastei com mercado'));

    expect(getMonthlyTotalReport).toHaveBeenCalledTimes(1);
    expect(getCategoryTotalReport).toHaveBeenCalledWith('Mercado');
    expect(sendTextMessage).toHaveBeenCalledWith(
      '5511999999999',
      'Voc\u00ea gastou R$ 165,00 este m\u00eas.',
    );
    expect(sendTextMessage).toHaveBeenCalledWith(
      '5511999999999',
      'Voc\u00ea gastou R$ 120,00 com Mercado neste m\u00eas.',
    );
  });
});
