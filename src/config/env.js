require('dotenv').config();

const env = {
  port: Number(process.env.PORT || 3000),
  whatsappVerifyToken: process.env.WHATSAPP_VERIFY_TOKEN,
  whatsappToken: process.env.WHATSAPP_TOKEN,
  phoneNumberId: process.env.PHONE_NUMBER_ID,
  googleSheetId: process.env.GOOGLE_SHEET_ID,
  googleServiceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  googlePrivateKey: process.env.GOOGLE_PRIVATE_KEY,
};

module.exports = { env };
