const axios = require('axios');
const config = require('../config/environment');

class QuickBooksClient {
  constructor() {
    this.accessToken = '';
    this.companyId = config.companyId;
  }

  setAccessToken(token) {
    this.accessToken = token;
  }

  setCompanyId(id) {
    this.companyId = id;
  }

  getAccessToken() {
    return this.accessToken;
  }

  getCompanyId() {
    return this.companyId;
  }

  isAuthenticated() {
    return !!this.accessToken;
  }

  async get(endpoint) {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    const url = `${config.quickbooksApiUrl}/company/${this.companyId}/${endpoint}`;
    
    try {
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          Accept: 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error(`Error in GET ${endpoint}:`, error.response?.data || error.message);
      throw error;
    }
  }

  async post(endpoint, data) {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    const url = `${config.quickbooksApiUrl}/company/${this.companyId}/${endpoint}`;
    
    try {
      const response = await axios.post(url, data, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error(`Error in POST ${endpoint}:`, error.response?.data || error.message);
      throw error;
    }
  }

  async query(queryString) {
    return this.get(`query?query=${encodeURIComponent(queryString)}`);
  }

  async exchangeCodeForToken(code) {
    const tokenData = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: config.redirectUri
    });

    const response = await axios.post(config.oauthTokenUrl, tokenData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`
      }
    });

    return response.data;
  }
}

// Singleton instance
const quickbooksClient = new QuickBooksClient();

module.exports = quickbooksClient;
