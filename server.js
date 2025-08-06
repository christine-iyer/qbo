const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const nodemailer = require('nodemailer');
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

app.post('/create-invoice', async (req, res) => {
  const invoice = req.body;
  const companyId = process.env.COMPANY_ID;
  
  console.log('Creating invoice for company:', companyId);
  console.log('Invoice data received:', JSON.stringify(invoice, null, 2));
  
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

    // Send email with the invoice (optional - can be disabled for testing)
    try {
      const transporter = nodemailer.createTransporter({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: invoice.BillEmail.Address,
        subject: 'Your Invoice from [Your Company]',
        text: `Please find attached your invoice.`,
        html: `<p>Please find attached your invoice.</p><p>Invoice ID: ${invoiceData.QueryResponse?.Invoice?.[0]?.Id || 'N/A'}</p>`,
      };

      await transporter.sendMail(mailOptions);
      console.log('Email sent successfully to:', invoice.BillEmail.Address);
    } catch (emailError) {
      console.error('Email sending failed (but invoice was created):', emailError.message);
      // Don't fail the whole request if email fails
    }

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

app.listen(3001, () => {
  console.log('Server running on port 3001');
});
