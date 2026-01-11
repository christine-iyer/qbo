const dotenv = require('dotenv');
dotenv.config();

const config = {
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  redirectUri: process.env.REDIRECT_URI,
  companyId: process.env.COMPANY_ID,
  state: 'random-generated-state-string',
  quickbooksApiUrl: 'https://sandbox-quickbooks.api.intuit.com/v3',
  oauthTokenUrl: 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
  port: process.env.PORT || 3001,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000'
};

module.exports = config;
