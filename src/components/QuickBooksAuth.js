import React from 'react';

const CLIENT_ID = 'your-client-id';
const REDIRECT_URI = 'http://localhost:3001/auth/callback';

const QuickBooksAuth = () => {
  const handleLogin = () => {
    const authUrl = `https://appcenter.intuit.com/connect/oauth2?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=com.intuit.quickbooks.accounting`;
    window.location.href = authUrl;
  };

  return (
    <div>
      <button onClick={handleLogin}>Connect to QuickBooks</button>
    </div>
  );
};

export default QuickBooksAuth;
