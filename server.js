const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(bodyParser.json());

// Enable CORS for development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const STATE = 'random-generated-state-string';  // Ensure this matches the one sent in the request

let accessToken = '';

app.get('/auth/callback', async (req, res) => {
  const { code, state, realmId } = req.query;
  
  console.log('Callback received:', { code, state, realmId });
  
  // Verify state parameter
  if (state !== STATE) {
    return res.status(400).send('Invalid state parameter');
  }
  
  try {
    // Prepare form data for token exchange
    const tokenData = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: REDIRECT_URI
    });

    const response = await axios.post('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', tokenData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`
      }
    });
    
    accessToken = response.data.access_token;
    console.log('Token exchange successful:', accessToken);
    console.log('Company ID (realmId):', realmId);
    
    // Store the realmId for future API calls
    process.env.COMPANY_ID = realmId;
    
    res.redirect('http://localhost:3000/create-invoice');
  } catch (error) {
    console.error('Error during token exchange:', error.response?.data || error.message);
    res.status(500).send('Authentication failed');
  }
});

// New endpoint to fetch customers from QuickBooks
app.get('/customers', async (req, res) => {
  const companyId = process.env.COMPANY_ID;
  
  console.log('Fetching customers for company:', companyId);
  
  if (!accessToken) {
    return res.status(401).json({ error: 'Not authenticated. Please connect to QuickBooks first.' });
  }
  
  try {
    const response = await axios.get(`https://sandbox-quickbooks.api.intuit.com/v3/company/${companyId}/query?query=SELECT * FROM Customer`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Accept': 'application/json'
      },
    });
    
    const customers = response.data.QueryResponse?.Customer || [];
    console.log('Customers fetched successfully. Count:', customers.length);
    if (customers.length > 0) {
      console.log('Sample customer structure:', JSON.stringify(customers[0], null, 2));
    }
    
    res.json({
      customers,
      count: customers.length,
      sampleStructure: customers[0] || null
    });
    
  } catch (error) {
    console.error('Error fetching customers:', error.response?.data || error.message);
    console.error('Full error details:', JSON.stringify(error.response?.data, null, 2));
    
    res.status(500).json({ 
      error: 'Failed to fetch customers',
      details: error.response?.data || error.message,
      fullError: error.response?.data || null
    });
  }
});

// New endpoint to fetch items/products from QuickBooks
app.get('/items', async (req, res) => {
  const companyId = process.env.COMPANY_ID;
  
  console.log('Fetching items for company:', companyId);

  if (!accessToken) {
    return res.status(401).json({ error: 'Not authenticated. Please authenticate with QuickBooks first.' });
  }

  try {
    // Query to get all items
    const response = await axios.get(
      `https://sandbox-quickbooks.api.intuit.com/v3/company/${companyId}/query?query=SELECT * FROM Item`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      }
    );

    console.log('Fetched items successfully');
    const items = response.data.QueryResponse?.Item || [];
    console.log('Items fetched successfully. Count:', items.length);
    if (items.length > 0) {
      console.log('Sample item structure:', JSON.stringify(items[0], null, 2));
    }

    res.json({
      success: true,
      items,
      count: items.length,
      sampleStructure: items[0] || null
    });
  } catch (error) {
    console.error('Error fetching items:', error.response?.data || error.message);
    console.error('Full error details:', JSON.stringify(error.response?.data, null, 2));
    
    res.status(500).json({ 
      error: 'Failed to fetch items',
      details: error.response?.data || error.message,
      fullError: error.response?.data || null
    });
  }
});

// New endpoint to create items in QuickBooks
app.post('/create-item', async (req, res) => {
  const itemData = req.body;
  const companyId = process.env.COMPANY_ID;
  
  console.log('Creating item for company:', companyId);
  console.log('Item data received:', JSON.stringify(itemData, null, 2));

  if (!accessToken) {
    return res.status(401).json({ error: 'Not authenticated. Please authenticate with QuickBooks first.' });
  }

  try {
    const response = await axios.post(
      `https://sandbox-quickbooks.api.intuit.com/v3/company/${companyId}/item`,
      itemData,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('Item created successfully');
    res.json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('Error creating item:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to create item',
      details: error.response?.data || error.message 
    });
  }
});

app.post('/create-invoice', async (req, res) => {
  const invoice = req.body;
  const companyId = process.env.COMPANY_ID;
  
  console.log('Creating invoice for company:', companyId);
  console.log('Invoice data received:', JSON.stringify(invoice, null, 2));
  console.log('Invoice line description:', invoice.Line?.[0]?.Description);
  console.log('Does description include delivery info?', invoice.Line?.[0]?.Description?.includes('Delivering to:'));
  
  if (!accessToken) {
    return res.status(401).json({ error: 'Not authenticated. Please connect to QuickBooks first.' });
  }
  
  try {
    const response = await axios.post(`https://sandbox-quickbooks.api.intuit.com/v3/company/${companyId}/invoice`, invoice, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
    });
    const invoiceData = response.data;
    console.log('Invoice created successfully:', JSON.stringify(invoiceData, null, 2));

    // Email functionality disabled
    console.log('Email sending is disabled. Invoice created without email notification.');

    res.json(invoiceData);
  } catch (error) {
    console.error('Error creating invoice:', error.response?.data || error.message);
    console.error('Full error details:', JSON.stringify(error.response?.data, null, 2));
    
    res.status(500).json({
      error: 'Failed to create invoice',
      details: error.response?.data || error.message,
      fullError: error.response?.data || null
    });
  }
});

// New endpoint to fetch invoices from QuickBooks
app.get('/invoices', async (req, res) => {
  const companyId = process.env.COMPANY_ID;
  
  if (!accessToken) {
    return res.status(401).json({ error: 'Not authenticated. Please connect to QuickBooks first.' });
  }
  
  try {
    // Query to get all invoices
    const query = "SELECT * FROM Invoice ORDER BY TxnDate DESC MAXRESULTS 50";
    const response = await axios.get(`https://sandbox-quickbooks.api.intuit.com/v3/company/${companyId}/query?query=${encodeURIComponent(query)}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Accept': 'application/json'
      },
    });
    
    console.log('Fetched invoices successfully');
    const invoices = response.data.QueryResponse?.Invoice || [];
    console.log('Number of invoices found:', invoices.length);
    
    // Log first invoice for debugging
    if (invoices.length > 0) {
      console.log('First invoice sample:', JSON.stringify(invoices[0], null, 2));
    }
    
    // Also fetch customer data to enrich invoice information
    const customerResponse = await axios.get(`https://sandbox-quickbooks.api.intuit.com/v3/company/${companyId}/query?query=${encodeURIComponent("SELECT * FROM Customer")}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Accept': 'application/json'
      },
    });
    
    const customers = customerResponse.data.QueryResponse?.Customer || [];
    console.log('Number of customers found:', customers.length);
    
    const customerMap = {};
    customers.forEach(customer => {
      customerMap[customer.Id] = customer;
      console.log(`Customer mapping: ID=${customer.Id} -> Name=${customer.DisplayName || customer.Name}`);
    });
    
    // Enrich invoice data with customer names
    const enrichedInvoices = invoices.map(invoice => {
      const customerName = customerMap[invoice.CustomerRef?.value]?.DisplayName || 
                          customerMap[invoice.CustomerRef?.value]?.Name || 
                          'Unknown Customer';
      console.log(`Invoice ${invoice.DocNumber}: CustomerRef=${invoice.CustomerRef?.value}, CustomerName=${customerName}`);
      if (invoice.Line?.[0]?.Description) {
        console.log(`Invoice ${invoice.DocNumber} description:`, invoice.Line[0].Description);
      }
      
      return {
        ...invoice,
        CustomerName: customerName
      };
    });
    
    res.json({ 
      invoices: enrichedInvoices,
      total: enrichedInvoices.length 
    });
  } catch (error) {
    console.error('Error fetching invoices:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to fetch invoices',
      details: error.response?.data || error.message
    });
  }
});

app.listen(3001, () => {
  console.log('Server running on port 3001');
});
