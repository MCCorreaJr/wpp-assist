const {
  setPendingAction,
  getPendingAction,
  buildExpenseConfirmationMessage,
  handlePendingAction,
} = require('./confirmationService');
const { parseMessage } = require('./parserService');
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

async function processIncomingMessage(payload) {
  const incomingMessage = extractIncomingMessage(payload);

  if (!incomingMessage) {
    return {
      ignored: true,
    };
  }

  const { phone, text } = incomingMessage;

  if (getPendingAction(phone)) {
    const result = await handlePendingAction(phone, text);

    if (result?.text) {
      await sendTextMessage(phone, result.text);
    }

    return result;
  }

  const parsedMessage = parseMessage(text);

  if (parsedMessage.intent === 'add_expense') {
    setPendingAction(phone, {
      type: 'add_expense',
      data: parsedMessage,
    });

    const confirmationText = buildExpenseConfirmationMessage(parsedMessage);

    await sendTextMessage(phone, confirmationText);

    return {
      pending: true,
      intent: parsedMessage.intent,
    };
  }

  if (parsedMessage.intent === 'monthly_total') {
    const reportText = await getMonthlyTotalReport();

    await sendTextMessage(phone, reportText);

    return {
      intent: parsedMessage.intent,
    };
  }

  if (parsedMessage.intent === 'category_total') {
    const reportText = await getCategoryTotalReport(parsedMessage.category);

    await sendTextMessage(phone, reportText);

    return {
      intent: parsedMessage.intent,
    };
  }

  await sendTextMessage(
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
