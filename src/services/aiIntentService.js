const { openai } = require('../integrations/openaiClient');
const { parseMessage } = require('./parserService');
const { getToday } = require('../utils/dateUtils');
const { normalizeText } = require('./parserService');

const INTENT_SCHEMA = {
  type: 'object',
  properties: {
    intent: {
      type: 'string',
      enum: [
        'add_expense',
        'confirm_action',
        'cancel_action',
        'get_month_total',
        'get_category_total',
        'update_expense_context',
        'add_incremental_expense',
        'repeat_last_expense',
        'correct_expense',
        'unknown',
      ],
    },
    amount: {
      type: ['number', 'null'],
    },
    category: {
      type: ['string', 'null'],
    },
    description: {
      type: ['string', 'null'],
    },
    date: {
      type: ['string', 'null'],
    },
    paymentMethod: {
      type: ['string', 'null'],
    },
  },
  required: ['intent', 'amount', 'category', 'description', 'date', 'paymentMethod'],
  additionalProperties: false,
};

const SYSTEM_PROMPT = [
  'Voce e um extrator de intencao financeira para um assistente de WhatsApp.',
  'Nunca converse com o usuario.',
  'Nunca responda texto livre.',
  'Responda apenas JSON valido aderente ao schema.',
  'Se nao entender, use intent = unknown.',
  '',
  'Categorias padrao:',
  'Alimentacao, Mercado, Moradia, Saude, Transporte, Lazer, Educacao, Assinaturas, Outros.',
  '',
  'Mapeamento inteligente:',
  '- almoco, jantar, lanche, ifood e restaurante => Alimentacao',
  '- mercado, supermercado e compras de comida para casa => Mercado',
  '- uber, gasolina, combustivel, onibus e transporte => Transporte',
  '- aluguel, condominio e moradia => Moradia',
  '- farmacia, remedio, consulta e saude => Saude',
  '- streaming, netflix, spotify e assinatura => Assinaturas',
  '',
  'Regras:',
  '- Para despesas, intent = add_expense.',
  '- Para confirmacoes como "sim", intent = confirm_action.',
  '- Para cancelamentos como "cancelar", "cancela", "nao" ou "cancelar operacao", intent = cancel_action.',
  '- Para "quanto gastei esse mes" ou equivalentes, intent = get_month_total.',
  '- Para "quanto gastei com mercado" ou equivalentes, intent = get_category_total e preencha category.',
  '- Para mensagens como "foi no credito", "foi no debito" ou "parcelado", intent = update_expense_context e preencha paymentMethod.',
  '- Para mensagens como "mais 20", intent = add_incremental_expense e preencha amount.',
  '- Para mensagens como "o mesmo valor", "repete", "igual ao de ontem", intent = repeat_last_expense.',
  '- Para mensagens como "corrige para 50", intent = correct_expense e preencha amount.',
  '- Considere apenas o historico recente fornecido na entrada.',
  '- Se a data nao for informada, use a data atual fornecida pelo sistema.',
  '- Para campos nao aplicaveis, use null.',
].join('\n');

function normalizeFallbackIntent(parsedMessage) {
  if (parsedMessage.intent === 'monthly_total') {
    return {
      intent: 'get_month_total',
      amount: null,
      category: null,
      description: null,
      date: null,
      paymentMethod: null,
    };
  }

  if (parsedMessage.intent === 'category_total') {
    return {
      intent: 'get_category_total',
      amount: null,
      category: parsedMessage.category || null,
      description: parsedMessage.description || null,
      date: null,
      paymentMethod: null,
    };
  }

  if (parsedMessage.intent === 'add_expense') {
    return {
      intent: 'add_expense',
      amount: parsedMessage.amount,
      category: parsedMessage.category || 'Outros',
      description: parsedMessage.description || null,
      date: parsedMessage.date || getToday(),
      paymentMethod: parsedMessage.paymentMethod || null,
    };
  }

  return {
    intent: 'unknown',
    amount: null,
    category: null,
    description: null,
    date: null,
    paymentMethod: null,
  };
}

function fallbackExtractIntent(message) {
  const normalizedMessage = normalizeText(message);

  if (normalizedMessage === 'sim') {
    return {
      intent: 'confirm_action',
      amount: null,
      category: null,
      description: null,
      date: null,
      paymentMethod: null,
    };
  }

  if (['cancelar', 'cancela', 'cancela isso', 'nao', 'não'].includes(normalizedMessage)) {
    return {
      intent: 'cancel_action',
      amount: null,
      category: null,
      description: null,
      date: null,
      paymentMethod: null,
    };
  }

  const paymentMethodByText = [
    { pattern: /\bcredito\b/, value: 'Crédito' },
    { pattern: /\bdebito\b/, value: 'Débito' },
    { pattern: /\bparcelado\b/, value: 'Parcelado' },
  ].find((item) => item.pattern.test(normalizedMessage));

  if (paymentMethodByText) {
    return {
      intent: 'update_expense_context',
      amount: null,
      category: null,
      description: null,
      date: null,
      paymentMethod: paymentMethodByText.value,
    };
  }

  const incrementalMatch = normalizedMessage.match(/^mais\s+(\d+(?:[.,]\d{1,2})?)$/);

  if (incrementalMatch) {
    return {
      intent: 'add_incremental_expense',
      amount: Number(incrementalMatch[1].replace(',', '.')),
      category: null,
      description: null,
      date: null,
      paymentMethod: null,
    };
  }

  const correctionMatch = normalizedMessage.match(/^corrige\s+para\s+(\d+(?:[.,]\d{1,2})?)$/);

  if (correctionMatch) {
    return {
      intent: 'correct_expense',
      amount: Number(correctionMatch[1].replace(',', '.')),
      category: null,
      description: null,
      date: null,
      paymentMethod: null,
    };
  }

  if (['o mesmo valor', 'repete', 'igual ao de ontem'].includes(normalizedMessage)) {
    return {
      intent: 'repeat_last_expense',
      amount: null,
      category: null,
      description: null,
      date: null,
      paymentMethod: null,
    };
  }

  return normalizeFallbackIntent(parseMessage(message));
}

function getOutputText(response) {
  if (response.output_text) {
    return response.output_text;
  }

  const outputContent = response.output?.flatMap((item) => item.content || []) || [];
  const textContent = outputContent.find((item) => item.type === 'output_text' && item.text);

  return textContent?.text || null;
}

function normalizeIntent(intent) {
  if (!intent || !INTENT_SCHEMA.properties.intent.enum.includes(intent.intent)) {
    return fallbackExtractIntent('');
  }

  return {
    intent: intent.intent,
    amount: intent.amount ?? null,
    category: intent.category || null,
    description: intent.description || null,
    date: intent.date || (intent.intent === 'add_expense' ? getToday() : null),
    paymentMethod: intent.paymentMethod || null,
  };
}

function buildUserInput(message, recentHistory) {
  return JSON.stringify({
    currentMessage: message,
    recentHistory: Array.isArray(recentHistory) ? recentHistory.slice(-10) : [],
  });
}

async function extractIntent(message, recentHistory = []) {
  if (!openai) {
    return fallbackExtractIntent(message);
  }

  try {
    const today = getToday();
    const response = await openai.responses.create(
      {
        model: 'gpt-5-mini',
        input: [
          {
            role: 'system',
            content: `${SYSTEM_PROMPT}\n\nData atual: ${today}`,
          },
          {
            role: 'user',
            content: buildUserInput(message, recentHistory),
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'financial_intent',
            strict: true,
            schema: INTENT_SCHEMA,
          },
        },
      },
      {
        timeout: 10000,
      },
    );

    const outputText = getOutputText(response);
    const intent = normalizeIntent(JSON.parse(outputText));

    console.log('AI intent', {
      intent: intent.intent,
      category: intent.category,
    });

    return intent;
  } catch (error) {
    console.error('AI intent extraction failed, using regex fallback', {
      message: error.message,
      status: error.status,
    });

    return fallbackExtractIntent(message);
  }
}

module.exports = {
  extractIntent,
  fallbackExtractIntent,
  normalizeFallbackIntent,
  SYSTEM_PROMPT,
  INTENT_SCHEMA,
};
