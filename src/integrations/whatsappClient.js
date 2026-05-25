const axios = require('axios');
const { env } = require('../config/env');

async function sendTextMessage(phone, text) {
  if (!env.whatsappToken || !env.phoneNumberId) {
    console.error('WhatsApp message not sent: missing WHATSAPP_TOKEN or PHONE_NUMBER_ID');

    return {
      success: false,
      error: 'missing_whatsapp_config',
    };
  }

  try {
    const response = await axios.post(
      `https://graph.facebook.com/v23.0/${env.phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: {
          body: text,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${env.whatsappToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      },
    );

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    const metaError = error.response?.data?.error || error.response?.data || null;

    console.error('WhatsApp message not sent', {
      status: error.response?.status,
      error: metaError || error.message,
    });

    return {
      success: false,
      status: error.response?.status,
      error: metaError || error.message,
    };
  }
}

module.exports = {
  sendTextMessage,
};
