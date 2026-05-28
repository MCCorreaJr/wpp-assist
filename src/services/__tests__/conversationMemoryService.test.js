const conversationMemoryService = require('../conversationMemoryService');

describe('conversationMemoryService', () => {
  const phone = '5511777777777';

  afterEach(() => {
    conversationMemoryService.clearHistory(phone);
  });

  test('keeps only recent history for OpenAI context', () => {
    for (let index = 0; index < 12; index += 1) {
      conversationMemoryService.addInteraction(phone, 'user', `mensagem ${index}`);
    }

    const recentHistory = conversationMemoryService.getRecentHistory(phone);

    expect(recentHistory).toHaveLength(10);
    expect(recentHistory[0].message).toBe('mensagem 2');
    expect(recentHistory[9].message).toBe('mensagem 11');
  });

  test('finds the last expense-like context', () => {
    conversationMemoryService.addInteraction(phone, 'user', 'gastei 45 de almoço');

    expect(conversationMemoryService.getLastExpenseContext(phone)).toMatchObject({
      role: 'user',
      message: 'gastei 45 de almoço',
    });
  });
});
