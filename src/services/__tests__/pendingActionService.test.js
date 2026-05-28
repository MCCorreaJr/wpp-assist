const pendingActionService = require('../pendingActionService');

describe('pendingActionService', () => {
  const phone = '5511888888888';

  afterEach(() => {
    pendingActionService.remove(phone);
  });

  test('saves, gets, checks and removes pending actions', () => {
    pendingActionService.save(phone, {
      type: 'add_expense',
      data: {
        amount: 45,
        category: 'Alimenta\u00e7\u00e3o',
        description: 'almo\u00e7o',
        date: '2026-05-28',
        paymentMethod: null,
      },
    });

    expect(pendingActionService.exists(phone)).toBe(true);
    expect(pendingActionService.get(phone)).toMatchObject({
      type: 'add_expense',
      data: {
        amount: 45,
      },
    });

    pendingActionService.remove(phone);

    expect(pendingActionService.exists(phone)).toBe(false);
  });

  test('returns expired action once and removes it', () => {
    pendingActionService.save(phone, {
      type: 'add_expense',
      createdAt: '2000-01-01T18:00:00.000Z',
      expiresAt: '2000-01-01T18:01:00.000Z',
      data: {
        amount: 100,
        category: 'Mercado',
        description: 'mercado',
        date: '2026-05-28',
        paymentMethod: null,
      },
    });

    expect(pendingActionService.get(phone)).toMatchObject({
      expired: true,
      type: 'add_expense',
    });
    expect(pendingActionService.get(phone)).toBeNull();
  });
});
