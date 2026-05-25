const { google } = require('googleapis');
const { env } = require('../config/env');

const SHEET_NAME = 'despesas';
const EXPENSE_COLUMNS = [
  'Data',
  'Categoria',
  'Descrição',
  'Valor',
  'Forma de Pagamento',
  'Criado Em',
  'Origem',
];

function assertGoogleSheetsConfig() {
  const missingVars = [];

  if (!env.googleSheetId) missingVars.push('GOOGLE_SHEET_ID');
  if (!env.googleServiceAccountEmail) missingVars.push('GOOGLE_SERVICE_ACCOUNT_EMAIL');
  if (!env.googlePrivateKey) missingVars.push('GOOGLE_PRIVATE_KEY');

  if (missingVars.length > 0) {
    throw new Error(`Missing Google Sheets configuration: ${missingVars.join(', ')}`);
  }
}

function getAuthClient() {
  assertGoogleSheetsConfig();

  return new google.auth.JWT({
    email: env.googleServiceAccountEmail,
    key: env.googlePrivateKey.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

function getSheetsClient() {
  return google.sheets({
    version: 'v4',
    auth: getAuthClient(),
  });
}

function buildExpenseRow(expense) {
  return [
    expense.date,
    expense.category,
    expense.description,
    expense.amount,
    expense.paymentMethod || '',
    expense.createdAt,
    expense.origin || 'whatsapp',
  ];
}

function mapRowToExpense(row) {
  return {
    date: row[0] || '',
    category: row[1] || '',
    description: row[2] || '',
    amount: Number(String(row[3] || '0').replace(',', '.')),
    paymentMethod: row[4] || null,
    createdAt: row[5] || '',
    origin: row[6] || '',
  };
}

function getYearMonthParts(date) {
  const [year, month] = String(date || '').split('-').map(Number);

  return { year, month };
}

async function appendExpense(expense) {
  const sheets = getSheetsClient();

  await sheets.spreadsheets.values.append({
    spreadsheetId: env.googleSheetId,
    range: `${SHEET_NAME}!A:G`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [buildExpenseRow(expense)],
    },
  });
}

async function getExpenses() {
  const sheets = getSheetsClient();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: env.googleSheetId,
    range: `${SHEET_NAME}!A:G`,
  });

  const rows = response.data.values || [];
  const dataRows = rows[0]?.join('|') === EXPENSE_COLUMNS.join('|') ? rows.slice(1) : rows;

  return dataRows.filter((row) => row.length > 0).map(mapRowToExpense);
}

async function getExpensesByMonth(year, month) {
  const expenses = await getExpenses();

  return expenses.filter((expense) => {
    const expenseDate = getYearMonthParts(expense.date);

    return expenseDate.year === Number(year) && expenseDate.month === Number(month);
  });
}

async function getExpensesByCategory(category, year, month) {
  const expenses = await getExpensesByMonth(year, month);
  const normalizedCategory = String(category || '').trim().toLowerCase();

  return expenses.filter(
    (expense) => String(expense.category || '').trim().toLowerCase() === normalizedCategory,
  );
}

module.exports = {
  appendExpense,
  getExpenses,
  getExpensesByMonth,
  getExpensesByCategory,
  SHEET_NAME,
  EXPENSE_COLUMNS,
};
