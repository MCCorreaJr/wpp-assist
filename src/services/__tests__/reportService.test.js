jest.mock('../../integrations/googleSheetsClient', () => ({
  getExpensesByMonth: jest.fn(),
  getExpensesByCategory: jest.fn(),
}));

jest.mock('../../utils/dateUtils', () => ({
  getCurrentYearMonth: jest.fn(() => ({ year: 2026, month: 5 })),
}));

const {
  getExpensesByMonth,
  getExpensesByCategory,
} = require('../../integrations/googleSheetsClient');
const {
  getMonthlyTotalReport,
  getCategoryTotalReport,
  sumExpenses,
} = require('../reportService');

describe('reportService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('sums expenses', () => {
    expect(sumExpenses([{ amount: 10 }, { amount: '15,5' }, { amount: 20 }])).toBe(45.5);
  });

  test('builds monthly total report', async () => {
    getExpensesByMonth.mockResolvedValue([{ amount: 45 }, { amount: 120 }]);

    await expect(getMonthlyTotalReport()).resolves.toBe(
      'Voc\u00ea gastou R$ 165,00 este m\u00eas.',
    );
    expect(getExpensesByMonth).toHaveBeenCalledWith(2026, 5);
  });

  test('builds category total report', async () => {
    getExpensesByCategory.mockResolvedValue([{ amount: 120 }, { amount: 30 }]);

    await expect(getCategoryTotalReport('Mercado')).resolves.toBe(
      'Voc\u00ea gastou R$ 150,00 com Mercado neste m\u00eas.',
    );
    expect(getExpensesByCategory).toHaveBeenCalledWith('Mercado', 2026, 5);
  });
});
