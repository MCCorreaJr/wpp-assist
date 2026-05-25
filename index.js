const express = require('express');
const { env } = require('./src/config/env');
const whatsappController = require('./src/controllers/whatsappController');

const app = express();

app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'wpp-assist',
  });
});

app.get('/webhook', whatsappController.verifyWebhook);
app.post('/webhook', whatsappController.handleIncomingMessage);

app.listen(env.port, () => {
  console.log(`Server running on port ${env.port}`);
});
