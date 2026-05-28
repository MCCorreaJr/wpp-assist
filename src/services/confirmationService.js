const { createExpense } = require('./expenseService');
const { formatBRL } = require('../utils/currencyUtils');
const { normalizeText } = require('./parserService');
const pendingActionService = require('./pendingActionService');

function setPendingAction(phone, action) {
  return pendingActionService.save(phone, action);
}

function getPendingAction(phone) {
  return pendingActionService.get(phone);
}

function clearPendingAction(phone) {
  pendingActionService.remove(phone);
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

function updatePendingExpense(phone, action, data) {
  const updatedAction = pendingActionService.save(phone, {
    ...action,
    data: {
      ...action.data,
      ...data,
    },
  });

  return {
    handled: true,
    text: [
      'Atualizei a despesa pendente.',
      '',
      buildExpenseConfirmationMessage(updatedAction.data),
    ].join('\n'),
  };
}

function handleContextIntent(phone, action, contextIntent) {
  if (!contextIntent || action.type !== 'add_expense') {
    return null;
  }

  if (contextIntent.intent === 'update_expense_context') {
    return updatePendingExpense(phone, action, {
      paymentMethod: contextIntent.paymentMethod || action.data.paymentMethod || null,
      category: contextIntent.category || action.data.category,
      description: contextIntent.description || action.data.description,
      date: contextIntent.date || action.data.date,
    });
  }

  if (contextIntent.intent === 'correct_expense') {
    return updatePendingExpense(phone, action, {
      amount: contextIntent.amount || action.data.amount,
      category: contextIntent.category || action.data.category,
      description: contextIntent.description || action.data.description,
      date: contextIntent.date || action.data.date,
      paymentMethod: contextIntent.paymentMethod || action.data.paymentMethod || null,
    });
  }

  if (contextIntent.intent === 'add_incremental_expense') {
    return updatePendingExpense(phone, action, {
      amount: Number(action.data.amount || 0) + Number(contextIntent.amount || 0),
    });
  }

  if (contextIntent.intent === 'repeat_last_expense') {
    return updatePendingExpense(phone, action, {
      amount: contextIntent.amount || action.data.amount,
      category: contextIntent.category || action.data.category,
      description: contextIntent.description || action.data.description,
      date: contextIntent.date || action.data.date,
      paymentMethod: contextIntent.paymentMethod || action.data.paymentMethod || null,
    });
  }

  if (contextIntent.intent === 'cancel_action') {
    clearPendingAction(phone);

    return {
      handled: true,
      text: 'Operação cancelada.',
    };
  }

  if (contextIntent.intent === 'confirm_action') {
    return null;
  }

  return null;
}

async function handlePendingAction(phone, text, contextIntent = null, existingAction = null) {
  const action = existingAction || getPendingAction(phone);

  if (!action) {
    return null;
  }

  if (action.expired) {
    return {
      handled: true,
      expired: true,
      text: 'Essa solicitação expirou.\nPor favor envie novamente.',
    };
  }

  const normalizedText = normalizeText(text);

  if (['cancelar', 'cancela', 'cancela isso', 'nao', 'não'].includes(normalizedText)) {
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

  const contextResult = handleContextIntent(phone, action, contextIntent);

  if (contextResult) {
    return contextResult;
  }

  return {
    handled: true,
    text: 'Responda SIM para confirmar ou CANCELAR para cancelar.',
  };
}

module.exports = {
  setPendingAction,
  getPendingAction,
  clearPendingAction,
  buildExpenseConfirmationMessage,
  handlePendingAction,
};
