const { getToday } = require('../utils/dateUtils');

const CATEGORY_BY_KEYWORD = {
  almoco: 'Alimentação',
  jantar: 'Alimentação',
  lanche: 'Alimentação',
  mercado: 'Mercado',
  gasolina: 'Transporte',
  uber: 'Transporte',
  aluguel: 'Moradia',
  farmacia: 'Saúde',
};

function normalizeText(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function parseAmount(value) {
  return Number(String(value || '').replace(/\./g, '').replace(',', '.'));
}

function normalizeDescription(description) {
  return String(description || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function inferCategory(description) {
  const normalizedDescription = normalizeText(description);
  const keyword = Object.keys(CATEGORY_BY_KEYWORD).find((item) =>
    normalizedDescription.includes(item),
  );

  return keyword ? CATEGORY_BY_KEYWORD[keyword] : 'Outros';
}

function parseAddExpense(text) {
  const cleanText = String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  const patterns = [
    /^(?:lance|adicione)\s+(?:r\$\s*)?(\d+(?:[.,]\d{1,2})?)\s*(?:reais?)?\s+(?:de|do|da|no|na)\s+(.+)$/i,
    /^(?:gastei|paguei)\s+(?:r\$\s*)?(\d+(?:[.,]\d{1,2})?)\s*(?:reais?)?\s+(?:de|do|da|no|na|com)\s+(.+)$/i,
  ];

  const match = patterns.map((pattern) => cleanText.match(pattern)).find(Boolean);

  if (!match) {
    return null;
  }

  const amount = parseAmount(match[1]);
  const description = normalizeDescription(match[2]);

  return {
    intent: 'add_expense',
    amount,
    category: inferCategory(description),
    description,
    date: getToday(),
    paymentMethod: null,
  };
}

function parseReport(text) {
  const normalized = normalizeText(text);

  if (normalized === 'quanto gastei esse mes' || normalized === 'gastos do mes') {
    return {
      intent: 'monthly_total',
    };
  }

  const categoryMatch = normalized.match(/^quanto gastei com\s+(.+)$/);

  if (categoryMatch) {
    const description = normalizeDescription(categoryMatch[1]);

    return {
      intent: 'category_total',
      category: inferCategory(description),
      description,
    };
  }

  return null;
}

function parseMessage(text) {
  return parseReport(text) || parseAddExpense(text) || { intent: 'unknown' };
}

module.exports = {
  parseMessage,
  inferCategory,
  normalizeText,
};
