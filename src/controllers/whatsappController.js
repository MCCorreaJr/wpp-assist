const { env } = require('../config/env');
const { processIncomingMessage } = require('../services/messageService');

function verifyWebhook(req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === env.whatsappVerifyToken) {
    return res.status(200).send(challenge);
  }

  return res.status(403).json({
    error: 'Webhook verification failed',
  });
}

function handleIncomingMessage(req, res) {
  processIncomingMessage(req.body).catch((error) => {
    console.error('Failed to process WhatsApp webhook', {
      message: error.message,
    });
  });

  return res.status(200).json({
    received: true,
  });
}

module.exports = {
  verifyWebhook,
  handleIncomingMessage,
};
