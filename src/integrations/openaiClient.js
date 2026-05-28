const OpenAI = require('openai');
const { env } = require('../config/env');

const openai = env.openaiApiKey
  ? new OpenAI({
      apiKey: env.openaiApiKey,
      timeout: 10000,
    })
  : null;

module.exports = {
  openai,
};
