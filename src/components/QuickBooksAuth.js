import React, { useState, useEffect } from 'react';
import config from '../config';
import axios from 'axios';

// const CLIENT_ID = process.env.REACT_APP_CLIENT_ID;
const REDIRECT_URI = `${config.API_BASE_URL}/auth/callback`;
const STATE = 'random-generated-state-string';  // Generate a unique state string for security
const SCOPE = 'com.intuit.quickbooks.accounting';

const QuickBooksAuth = () => {
  const [authStatus, setAuthStatus] = useState({ loading: true, authenticated: false, companyId: null });
  const [error, setError] = useState('');

  useEffect(() => {
    checkAuthStatus();
    
    // Check for auth error in URL
    const params = new URLSearchParams(window.location.search);
    const authError = params.get('auth');
    const errorMsg = params.get('error');
    
    if (authError === 'failed') {
      setError(`Authentication failed: ${errorMsg || 'Unknown error'}`);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await axios.get(`${config.API_BASE_URL}/auth/status`);
      setAuthStatus({
        loading: false,
        authenticated: response.data.authenticated,
        companyId: response.data.companyId
      });
    } catch (err) {
      console.error('Error checking auth status:', err);
      // If endpoint doesn't exist (404/401), assume not authenticated
      // This is expected until backend is updated with the new endpoint
      setAuthStatus({ loading: false, authenticated: false, companyId: null });
    }
  };

  const handleLogin = () => {
    const authUrl = `https://appcenter.intuit.com/connect/oauth2?client_id=${process.env.REACT_APP_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=${SCOPE}&state=${STATE}`;
    window.location.href = authUrl;
  };

  if (authStatus.loading) {
    return <div>Checking authentication status...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      {error && (
        <div style={{ 
          padding: '10px', 
          marginBottom: '20px', 
          backgroundColor: '#ffebee', 
          color: '#c62828',
          borderRadius: '4px' 
        }}>
          {error}
        </div>
      )}
      
      {authStatus.authenticated ? (
        <div style={{ 
          padding: '20px', 
          backgroundColor: '#e8f5e9', 
          color: '#2e7d32',
          borderRadius: '4px' 
        }}>
          <h3>✓ Connected to QuickBooks</h3>
          <p>Company ID: {authStatus.companyId}</p>
          <p>You can now use all features of the application.</p>
        </div>
      ) : (
        <div>
          <h3>Connect to QuickBooks</h3>
          <p>Click the button below to authenticate with QuickBooks</p>
          <button 
            onClick={handleLogin}
            style={{
              padding: '10px 20px',
              fontSize: '16px',
              backgroundColor: '#2ca01c',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Connect to QuickBooks
          </button>
        </div>
      )}
    </div>
  );
};

export default QuickBooksAuth;
