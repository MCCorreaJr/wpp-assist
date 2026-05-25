const { createExpense } = require('./expenseService');
const { formatBRL } = require('../utils/currencyUtils');
const { normalizeText } = require('./parserService');

const pendingActions = {};

function setPendingAction(phone, action) {
  pendingActions[phone] = action;
}

function getPendingAction(phone) {
  return pendingActions[phone] || null;
}

function clearPendingAction(phone) {
  delete pendingActions[phone];
}

function buildExpenseConfirmationMessage(expense) {
  return [
    'Confirma o lançamento?',
    '',
    `Data: ${expense.date}`,
    `Categoria: ${expense.category}`,
    `Descrição: ${expense.description}`,
    `Valor: ${formatBRL(expense.amount)}`,
    '',
    'Responda:',
    'SIM',
    'ou',
    'CANCELAR',
  ].join('\n');
}

async function handlePendingAction(phone, text) {
  const action = getPendingAction(phone);

  if (!action) {
    return null;
  }

  const normalizedText = normalizeText(text);

  if (normalizedText === 'cancelar') {
    clearPendingAction(phone);

    return {
      handled: true,
      text: 'Operação cancelada.',
    };
  }

  if (normalizedText === 'sim') {
    try {
      if (action.type === 'add_expense') {
        await createExpense(action.data);
      }

      clearPendingAction(phone);

      return {
        handled: true,
        text: 'Despesa registrada com sucesso.',
      };
    } catch (error) {
      clearPendingAction(phone);

      console.error('Failed to confirm pending action', {
        phone,
        type: action.type,
        error: error.message,
      });

      return {
        handled: true,
        text: 'Não consegui registrar a despesa agora. Tente novamente em instantes.',
      };
    }
  }

  return {
    handled: true,
    text: 'Responda SIM para confirmar ou CANCELAR para cancelar.',
  };
}

module.exports = {
  pendingActions,
  setPendingAction,
  getPendingAction,
  clearPendingAction,
  buildExpenseConfirmationMessage,
  handlePendingAction,
};
