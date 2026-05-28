const {
  setPendingAction,
  getPendingAction,
  buildExpenseConfirmationMessage,
  handlePendingAction,
} = require('./confirmationService');
const { extractIntent } = require('./aiIntentService');
const {
  addInteraction,
  getRecentHistory,
} = require('./conversationMemoryService');
const {
  getMonthlyTotalReport,
  getCategoryTotalReport,
} = require('./reportService');
const { sendTextMessage } = require('../integrations/whatsappClient');

function extractIncomingMessage(payload) {
  const value = payload?.entry?.[0]?.changes?.[0]?.value;
  const message = value?.messages?.[0];
  const contact = value?.contacts?.[0];

  if (!message || message.type !== 'text') {
    return null;
  }

  return {
    phone: message.from,
    text: message.text?.body || '',
    name: contact?.profile?.name || null,
    messageId: message.id,
    timestamp: message.timestamp,
  };
}

async function sendAndRemember(phone, text) {
  await sendTextMessage(phone, text);
  addInteraction(phone, 'assistant', text);
}

async function processIncomingMessage(payload) {
  const incomingMessage = extractIncomingMessage(payload);

  if (!incomingMessage) {
    return {
      ignored: true,
    };
  }

  const { phone, text } = incomingMessage;
  const recentHistory = getRecentHistory(phone);

  addInteraction(phone, 'user', text);

  const pendingAction = getPendingAction(phone);

  if (pendingAction) {
    const contextIntent = await extractIntent(text, recentHistory);
    const result = await handlePendingAction(phone, text, contextIntent, pendingAction);

    if (result?.text) {
      await sendAndRemember(phone, result.text);
    }

    return result;
  }

  const parsedMessage = await extractIntent(text, recentHistory);

  if (parsedMessage.intent === 'add_expense') {
    setPendingAction(phone, {
      type: 'add_expense',
      data: parsedMessage,
    });

    const confirmationText = buildExpenseConfirmationMessage(parsedMessage);

    await sendAndRemember(phone, confirmationText);

    return {
      pending: true,
      intent: parsedMessage.intent,
    };
  }

  if (parsedMessage.intent === 'get_month_total') {
    const reportText = await getMonthlyTotalReport();

    await sendAndRemember(phone, reportText);

    return {
      intent: parsedMessage.intent,
    };
  }

  if (parsedMessage.intent === 'get_category_total') {
    const reportText = await getCategoryTotalReport(parsedMessage.category);

    await sendAndRemember(phone, reportText);

    return {
      intent: parsedMessage.intent,
    };
  }

  if (parsedMessage.intent === 'confirm_action') {
    await sendAndRemember(phone, 'Não há operação pendente para confirmar.');

    return {
      intent: parsedMessage.intent,
    };
  }

  if (parsedMessage.intent === 'cancel_action') {
    await sendAndRemember(phone, 'Não há operação pendente para cancelar.');

    return {
      intent: parsedMessage.intent,
    };
  }

  if (
    [
      'update_expense_context',
      'add_incremental_expense',
      'repeat_last_expense',
      'correct_expense',
    ].includes(parsedMessage.intent)
  ) {
    await sendAndRemember(phone, 'Não há despesa pendente para atualizar.');

    return {
      intent: parsedMessage.intent,
    };
  }

  await sendAndRemember(
    phone,
    'Não entendi sua mensagem. Envie algo como: Gastei 45 de almoço.',
  );

  return {
    intent: 'unknown',
  };
}

module.exports = {
  processIncomingMessage,
  extractIncomingMessage,
};
