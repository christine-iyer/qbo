const quickbooksClient = require('../utils/quickbooksClient');
const config = require('../config/environment');
const ResponseHandler = require('../utils/responseHandler');

class AuthController {
  async handleCallback(req, res) {
    const { code, state, realmId } = req.query;
    
    console.log('Callback received:', { code, state, realmId });
    
    // Verify state parameter
    if (state !== config.state) {
      return ResponseHandler.badRequest(res, 'Invalid state parameter');
    }
    
    try {
      const tokenData = await quickbooksClient.exchangeCodeForToken(code);
      
      quickbooksClient.setAccessToken(tokenData.access_token);
      quickbooksClient.setCompanyId(realmId);
      
      // Also update environment for backwards compatibility
      process.env.COMPANY_ID = realmId;
      
      console.log('Token exchange successful');
      console.log('Company ID (realmId):', realmId);
      
      res.redirect(`${config.clientUrl}/create-invoice`);
    } catch (error) {
      console.error('Error during token exchange:', error.response?.data || error.message);
      res.status(500).send('Authentication failed');
    }
  }
}

module.exports = new AuthController();
