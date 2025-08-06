// Add this to your .env file for production
ENVIRONMENT=production  // or 'sandbox' for testing

// In your server.js, you'll need to update the base URL:
const getQuickBooksBaseURL = () => {
  return process.env.ENVIRONMENT === 'production' 
    ? 'https://quickbooks.api.intuit.com'      // Production
    : 'https://sandbox-quickbooks.api.intuit.com';  // Sandbox (current)
};

// Update your API calls to use the dynamic URL:
const response = await axios.get(
  `${getQuickBooksBaseURL()}/v3/company/${companyId}/query?query=SELECT * FROM Customer`
);
