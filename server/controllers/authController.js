const quickbooksClient = require('../utils/quickbooksClient');
const config = require('../config/environment');
const ResponseHandler = require('../utils/responseHandler');

class AuthController {
  async checkAuth(req, res) {
    const isAuthenticated = quickbooksClient.isAuthenticated();
    const companyId = quickbooksClient.getCompanyId();
    
    res.json({ 
      authenticated: isAuthenticated,
      companyId: companyId
    });
  }
  async handleCallback(req, res) {
    const { code, state, realmId } = req.query;
    
    console.log('Callback received:', { code, state, realmId });
    
    // Verify state parameter
    if (state !== config.state) {
      console.error('State mismatch - Expected:', config.state, 'Received:', state);
      return res.redirect(`${config.clientUrl}/?auth=failed&error=invalid_state`);
    }
    
    try {
      const tokenData = await quickbooksClient.exchangeCodeForToken(code);
      
      quickbooksClient.setAccessToken(tokenData.access_token);
      quickbooksClient.setCompanyId(realmId);
      
      // Also update environment for backwards compatibility
      process.env.COMPANY_ID = realmId;
      
      console.log('Token exchange successful');
      console.log('Company ID (realmId):', realmId);
      
      // Redirect with success parameter
      res.redirect(`${config.clientUrl}/create-invoice?auth=success`);
    } catch (error) {
      console.error('Error during token exchange:', error.response?.data || error.message);
      res.redirect(`${config.clientUrl}/?auth=failed&error=${encodeURIComponent(error.message)}`);
    }
  }
}

module.exports = new AuthController();
