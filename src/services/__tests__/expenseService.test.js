jest.mock('../../integrations/googleSheetsClient', () => ({
  appendExpense: jest.fn().mockResolvedValue(undefined),
}));

const { appendExpense } = require('../../integrations/googleSheetsClient');
const { createExpense, validateExpense } = require('../expenseService');

describe('expenseService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('creates a valid expense using Google Sheets', async () => {
    const expense = await createExpense({
      date: '2026-05-25',
      category: 'Mercado',
      description: 'mercado',
      amount: 120,
      paymentMethod: null,
    });

    expect(appendExpense).toHaveBeenCalledWith(
      expect.objectContaining({
        date: '2026-05-25',
        category: 'Mercado',
        description: 'mercado',
        amount: 120,
        origin: 'whatsapp',
      }),
    );
    expect(expense.createdAt).toEqual(expect.any(String));
  });

  test('rejects invalid expenses', () => {
    expect(() => validateExpense({ amount: 0, date: '2026-05-25', description: 'x' })).toThrow(
      'Expense amount must be greater than zero',
    );

    expect(() => validateExpense({ amount: 10, date: 'invalid', description: 'x' })).toThrow(
      'Expense date is invalid',
    );

    expect(() => validateExpense({ amount: 10, date: '2026-05-25', description: '' })).toThrow(
      'Expense description is required',
    );
  });
});
