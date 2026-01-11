import React from 'react';
import config from '../config';

// const CLIENT_ID = process.env.REACT_APP_CLIENT_ID;
const REDIRECT_URI = `${config.API_BASE_URL}/auth/callback`;
const STATE = 'random-generated-state-string';  // Generate a unique state string for security
const SCOPE = 'com.intuit.quickbooks.accounting';

const QuickBooksAuth = () => {
  const handleLogin = () => {
    const authUrl = `https://appcenter.intuit.com/connect/oauth2?client_id=${process.env.REACT_APP_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=${SCOPE}&state=${STATE}`;
    window.location.href = authUrl;
  };

  return (
    <div>
      <button onClick={handleLogin}>Connect to QuickBooks</button>
    </div>
  );
};

export default QuickBooksAuth;
