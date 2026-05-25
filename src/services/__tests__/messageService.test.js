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
    await processIncomingMessage(buildPayload('cancelar'));

    expect(createExpense).not.toHaveBeenCalled();
    expect(sendTextMessage).toHaveBeenLastCalledWith('5511999999999', 'Opera\u00e7\u00e3o cancelada.');
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
