const { appendExpense } = require('../integrations/googleSheetsClient');
const { isValidDate } = require('../utils/dateUtils');

function validateExpense(expense) {
  if (!expense || Number(expense.amount) <= 0) {
    throw new Error('Expense amount must be greater than zero');
  }

  if (!isValidDate(expense.date)) {
    throw new Error('Expense date is invalid');
  }

  if (!String(expense.description || '').trim()) {
    throw new Error('Expense description is required');
  }
}

async function createExpense(expense) {
  const expenseToCreate = {
    ...expense,
    createdAt: expense.createdAt || new Date().toISOString(),
    origin: expense.origin || 'whatsapp',
  };

  validateExpense(expenseToCreate);
  await appendExpense(expenseToCreate);

  return expenseToCreate;
}

module.exports = {
  createExpense,
  validateExpense,
};
