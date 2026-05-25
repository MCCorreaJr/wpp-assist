const {
  getExpensesByMonth,
  getExpensesByCategory,
} = require('../integrations/googleSheetsClient');
const { formatBRL } = require('../utils/currencyUtils');
const { getCurrentYearMonth } = require('../utils/dateUtils');

function sumExpenses(expenses) {
  return expenses.reduce((total, expense) => {
    const amount = Number(String(expense.amount || '0').replace(',', '.'));

    return total + (Number.isNaN(amount) ? 0 : amount);
  }, 0);
}

async function getMonthlyTotalReport() {
  const { year, month } = getCurrentYearMonth();
  const expenses = await getExpensesByMonth(year, month);
  const total = sumExpenses(expenses);

  return `Você gastou ${formatBRL(total)} este mês.`;
}

async function getCategoryTotalReport(category) {
  const { year, month } = getCurrentYearMonth();
  const expenses = await getExpensesByCategory(category, year, month);
  const total = sumExpenses(expenses);

  return `Você gastou ${formatBRL(total)} com ${category} neste mês.`;
}

module.exports = {
  getMonthlyTotalReport,
  getCategoryTotalReport,
  sumExpenses,
};
