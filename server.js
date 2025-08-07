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

// Bulk customer creation endpoint
app.post('/customers/bulk', async (req, res) => {
  const companyId = process.env.COMPANY_ID;
  const { customers } = req.body;
  
  console.log('Creating bulk customers for company:', companyId);
  console.log('Number of customers to create:', customers?.length || 0);

  if (!accessToken) {
    return res.status(401).json({ error: 'Not authenticated. Please authenticate with QuickBooks first.' });
  }

  if (!customers || !Array.isArray(customers) || customers.length === 0) {
    return res.status(400).json({ error: 'Invalid request. Customers array is required.' });
  }

  try {
    const results = [];
    const errors = [];

    console.log('Received customers data:', JSON.stringify(customers, null, 2));

    // Process customers one by one to avoid rate limits
    for (let i = 0; i < customers.length; i++) {
      const customer = customers[i];
      
      try {
        console.log(`Creating customer ${i + 1}/${customers.length}: ${customer.name}`);
        console.log('Customer data structure:', JSON.stringify(customer, null, 2));
        
        // Clean the customer name for QuickBooks (no special characters, reasonable length)
        const cleanName = customer.name
          .replace(/[^\w\s\-.]/g, '') // Remove special characters except spaces, hyphens, dots
          .replace(/\s+/g, ' ')        // Replace multiple spaces with single space
          .trim()                      // Remove leading/trailing spaces
          .substring(0, 100);          // Limit length
        
        // Create a more complete QuickBooks Customer format
        const qbCustomer = {
          Name: cleanName,
          DisplayName: cleanName,
          CompanyName: cleanName,
          Active: true
        };

        // Only add address if it exists and has required fields
        if (customer.ShipAddr && customer.ShipAddr.Line1 && customer.ShipAddr.City) {
          qbCustomer.BillAddr = {
            Line1: customer.ShipAddr.Line1,
            City: customer.ShipAddr.City,
            CountrySubDivisionCode: customer.ShipAddr.CountrySubDivisionCode || "ME",
            PostalCode: customer.ShipAddr.PostalCode,
            Country: "US"
          };
          qbCustomer.ShipAddr = {
            Line1: customer.ShipAddr.Line1,
            City: customer.ShipAddr.City,
            CountrySubDivisionCode: customer.ShipAddr.CountrySubDivisionCode || "ME",
            PostalCode: customer.ShipAddr.PostalCode,
            Country: "US"
          };
        }

        console.log('Sending customer data to QuickBooks:', JSON.stringify(qbCustomer, null, 2));

        const response = await axios.post(
          `https://sandbox-quickbooks.api.intuit.com/v3/company/${companyId}/customer`,
          qbCustomer,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          }
        );

        console.log('QuickBooks response:', JSON.stringify(response.data, null, 2));

        // QuickBooks returns the customer in the QueryResponse
        const createdCustomer = response.data.QueryResponse?.Customer?.[0];
        if (!createdCustomer) {
          throw new Error('No customer returned from QuickBooks API');
        }

        results.push({
          originalName: customer.name,
          success: true,
          customer: createdCustomer,
          id: createdCustomer.Id
        });

        console.log(`✅ Created customer: ${customer.name} (ID: ${createdCustomer.Id})`);
        
        // Add delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        const errorMessage = error.response?.data?.Fault?.Error?.[0]?.Detail || 
                           error.response?.data?.Fault?.Error?.[0]?.code || 
                           error.response?.data?.message || 
                           error.message;
                           
        console.error(`❌ Failed to create customer ${customer.name}:`, errorMessage);
        console.error('Full error response:', JSON.stringify(error.response?.data, null, 2));
        
        errors.push({
          originalName: customer.name,
          success: false,
          error: errorMessage,
          details: error.response?.data?.Fault?.Error?.[0] || error.response?.data,
          fullError: error.response?.data
        });
      }
    }

    console.log(`Bulk creation completed. Success: ${results.length}, Errors: ${errors.length}`);

    res.json({
      success: true,
      message: `Bulk customer creation completed. ${results.length} created, ${errors.length} failed.`,
      results,
      errors,
      totalAttempted: customers.length,
      totalSuccessful: results.length,
      totalFailed: errors.length
    });

  } catch (error) {
    console.error('Error in bulk customer creation:', error.response?.data || error.message);
    res.status(500).json({ 
      success: false,
      error: 'Failed to create customers',
      details: error.response?.data || error.message
    });
  }
});

// Test single customer creation endpoint to debug validation issues
app.post('/customers/test', async (req, res) => {
  const companyId = process.env.COMPANY_ID;
  
  console.log('Testing single customer creation for company:', companyId);

  if (!accessToken) {
    return res.status(401).json({ error: 'Not authenticated. Please authenticate with QuickBooks first.' });
  }

  try {
    // Test with absolute minimal required fields only
    const timestamp = Date.now();
    const testCustomer = {
      DisplayName: `TestCustomer${timestamp}`
    };

    console.log('Testing with minimal DisplayName only:', JSON.stringify(testCustomer, null, 2));

    const response = await axios.post(
      `https://sandbox-quickbooks.api.intuit.com/v3/company/${companyId}/customer`,
      { Customer: testCustomer },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );

    console.log('✅ Test customer created successfully:', response.data);
    res.json({ success: true, data: response.data });

  } catch (error) {
    console.error('❌ Test customer creation failed:', JSON.stringify(error.response?.data, null, 2));
    res.status(500).json({ 
      success: false,
      error: 'Failed to create test customer',
      details: error.response?.data
    });
  }
});

// Single customer creation endpoint
app.post('/customers/create', async (req, res) => {
  const companyId = process.env.COMPANY_ID;
  const customerData = req.body;
  
  console.log('Creating single customer for company:', companyId);
  console.log('Customer data received:', JSON.stringify(customerData, null, 2));

  if (!accessToken) {
    return res.status(401).json({ error: 'Not authenticated. Please authenticate with QuickBooks first.' });
  }

  if (!customerData.Name || !customerData.Name.trim()) {
    return res.status(400).json({ error: 'Customer name is required.' });
  }

  try {
    // Ensure we have the minimum required fields for QuickBooks
    const customerToCreate = {
      Name: customerData.Name.trim(),
      DisplayName: customerData.DisplayName || customerData.Name.trim(),
      Active: true,
      ...customerData // Spread the rest of the customer data
    };

    console.log('Sending customer data to QuickBooks:', JSON.stringify(customerToCreate, null, 2));

    const response = await axios.post(
      `https://sandbox-quickbooks.api.intuit.com/v3/company/${companyId}/customer`,
      customerToCreate,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );

    console.log('QuickBooks response:', JSON.stringify(response.data, null, 2));

    // QuickBooks returns the customer in the QueryResponse
    const createdCustomer = response.data.QueryResponse?.Customer?.[0];
    if (!createdCustomer) {
      throw new Error('No customer returned from QuickBooks API');
    }

    console.log(`✅ Created customer: ${customerData.Name} (ID: ${createdCustomer.Id})`);

    res.json({
      success: true,
      customer: createdCustomer,
      message: `Customer "${customerData.Name}" created successfully`
    });

  } catch (error) {
    const errorMessage = error.response?.data?.Fault?.Error?.[0]?.Detail || 
                       error.response?.data?.Fault?.Error?.[0]?.code || 
                       error.response?.data?.message || 
                       error.message;
                       
    console.error('❌ Failed to create customer:', errorMessage);
    console.error('Full error response:', JSON.stringify(error.response?.data, null, 2));
    
    res.status(500).json({ 
      success: false,
      error: errorMessage,
      details: error.response?.data?.Fault?.Error?.[0] || error.response?.data,
      fullError: error.response?.data
    });
  }
});

// Update customer endpoint
app.put('/customers/:id', async (req, res) => {
  const companyId = process.env.COMPANY_ID;
  const customerId = req.params.id;
  const customerData = req.body;
  
  console.log('Updating customer for company:', companyId);
  console.log('Customer ID:', customerId);
  console.log('Update data received:', JSON.stringify(customerData, null, 2));

  if (!accessToken) {
    return res.status(401).json({ error: 'Not authenticated. Please authenticate with QuickBooks first.' });
  }

  try {
    // First, fetch the current customer to get the SyncToken
    const fetchResponse = await axios.get(
      `https://sandbox-quickbooks.api.intuit.com/v3/company/${companyId}/customer/${customerId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      }
    );

    // For single customer fetch, the response structure is different - it's directly in Customer
    const currentCustomer = fetchResponse.data.QueryResponse?.Customer?.[0] || fetchResponse.data.Customer;
    if (!currentCustomer) {
      console.log('Customer fetch response:', JSON.stringify(fetchResponse.data, null, 2));
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Prepare the update data - merge current customer with updates
    const customerToUpdate = {
      ...currentCustomer,
      ...customerData,
      Id: customerId,
      SyncToken: currentCustomer.SyncToken // Required for updates
    };

    console.log('Sending customer update to QuickBooks:', JSON.stringify(customerToUpdate, null, 2));

    const updateResponse = await axios.post(
      `https://sandbox-quickbooks.api.intuit.com/v3/company/${companyId}/customer`,
      customerToUpdate,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );

    console.log('QuickBooks update response:', JSON.stringify(updateResponse.data, null, 2));

    // For customer updates, the response structure is different - it's directly in Customer
    const updatedCustomer = updateResponse.data.QueryResponse?.Customer?.[0] || updateResponse.data.Customer;
    if (!updatedCustomer) {
      console.log('Update response structure:', JSON.stringify(updateResponse.data, null, 2));
      throw new Error('No customer returned from QuickBooks API');
    }

    console.log(`✅ Updated customer: ${updatedCustomer.DisplayName} (ID: ${customerId})`);

    res.json({
      success: true,
      customer: updatedCustomer,
      message: `Customer "${updatedCustomer.DisplayName}" updated successfully`
    });

  } catch (error) {
    const errorMessage = error.response?.data?.Fault?.Error?.[0]?.Detail || 
                       error.response?.data?.Fault?.Error?.[0]?.code || 
                       error.response?.data?.message || 
                       error.message;
                       
    console.error('❌ Failed to update customer:', errorMessage);
    console.error('Full error response:', JSON.stringify(error.response?.data, null, 2));
    
    res.status(500).json({ 
      success: false,
      error: errorMessage,
      details: error.response?.data?.Fault?.Error?.[0] || error.response?.data,
      fullError: error.response?.data
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

// Update invoice line item
app.put('/api/update-invoice-line', async (req, res) => {
  try {
    const { invoiceNumber, lineDescription, amount } = req.body;
    
    if (!invoiceNumber || !lineDescription || amount === undefined) {
      return res.status(400).json({ 
        error: 'Missing required fields: invoiceNumber, lineDescription, amount' 
      });
    }
    
    // First, find the invoice by document number
    const invoicesResponse = await axios.get(`https://sandbox-quickbooks.api.intuit.com/v3/company/${process.env.COMPANY_ID}/query?query=SELECT * FROM Invoice WHERE DocNumber = '${invoiceNumber}'`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });
    
    if (!invoicesResponse.data.QueryResponse?.Invoice?.[0]) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    const invoice = invoicesResponse.data.QueryResponse.Invoice[0];
    
    // Find the line item to update (assuming first delivery service line)
    let lineToUpdate = null;
    let lineIndex = -1;
    
    for (let i = 0; i < invoice.Line.length; i++) {
      const line = invoice.Line[i];
      if (line.Description && line.Description.includes('Product Delivery Service')) {
        lineToUpdate = line;
        lineIndex = i;
        break;
      }
    }
    
    if (!lineToUpdate) {
      return res.status(404).json({ error: 'Delivery service line not found in invoice' });
    }
    
    // Update the line item
    invoice.Line[lineIndex].Description = lineDescription;
    invoice.Line[lineIndex].Amount = parseFloat(amount);
    invoice.Line[lineIndex].SalesItemLineDetail.UnitPrice = parseFloat(amount);
    
    // Update the invoice via QuickBooks API
    const updateResponse = await axios.post(`https://sandbox-quickbooks.api.intuit.com/v3/company/${process.env.COMPANY_ID}/invoice`, invoice, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('QuickBooks update response:', JSON.stringify(updateResponse.data, null, 2));
    
    if (updateResponse.data.QueryResponse?.Invoice?.[0] || updateResponse.data.Invoice) {
      const updatedInvoice = updateResponse.data.QueryResponse?.Invoice?.[0] || updateResponse.data.Invoice;
      res.json({ 
        success: true, 
        invoice: updatedInvoice,
        message: 'Invoice line updated successfully'
      });
    } else {
      throw new Error('Unexpected response format from QuickBooks: ' + JSON.stringify(updateResponse.data));
    }
    
  } catch (error) {
    console.error('Error updating invoice line:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to update invoice line',
      details: error.response?.data || error.message
    });
  }
});

// Delete invoice line item
app.put('/api/delete-invoice-line', async (req, res) => {
  try {
    const { invoiceId, lineIndex } = req.body;
    
    if (!invoiceId || lineIndex === undefined) {
      return res.status(400).json({ error: 'Missing required fields: invoiceId and lineIndex' });
    }

    console.log(`Deleting line item ${lineIndex} from invoice ${invoiceId}`);

    // First get the current invoice
    const invoiceResponse = await axios.get(`https://sandbox-quickbooks.api.intuit.com/v3/company/${process.env.COMPANY_ID}/invoice/${invoiceId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    console.log('Invoice fetch response:', invoiceResponse.data);

    // Handle different response structures
    let invoice;
    if (invoiceResponse.data.QueryResponse && invoiceResponse.data.QueryResponse.Invoice) {
      invoice = invoiceResponse.data.QueryResponse.Invoice[0];
    } else if (invoiceResponse.data.Invoice) {
      invoice = invoiceResponse.data.Invoice;
    } else {
      throw new Error('Invoice not found in response');
    }

    console.log('Found invoice:', invoice.DocNumber, 'with', invoice.Line?.length, 'line items');
    
    // Remove the line item
    if (invoice.Line && invoice.Line[lineIndex]) {
      console.log('Removing line item at index:', lineIndex);
      invoice.Line = invoice.Line.filter((_, index) => index !== lineIndex);
      
      // Recalculate totals
      let subTotal = 0;
      invoice.Line.forEach(line => {
        if (line.Amount) {
          subTotal += parseFloat(line.Amount);
        }
      });
      invoice.TotalAmt = subTotal;
      console.log('New total after line removal:', subTotal);
    } else {
      throw new Error(`Line item at index ${lineIndex} not found`);
    }

    // Update the invoice via QuickBooks API
    const updateResponse = await axios.post(`https://sandbox-quickbooks.api.intuit.com/v3/company/${process.env.COMPANY_ID}/invoice`, invoice, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    console.log('Update response:', updateResponse.data);

    // Handle different response structures for update
    let updatedInvoice;
    if (updateResponse.data.QueryResponse && updateResponse.data.QueryResponse.Invoice) {
      updatedInvoice = updateResponse.data.QueryResponse.Invoice[0];
    } else if (updateResponse.data.Invoice) {
      updatedInvoice = updateResponse.data.Invoice;
    } else {
      throw new Error('No invoice returned from QuickBooks API update');
    }

    res.json({ 
      success: true, 
      message: 'Line item deleted successfully',
      invoice: updatedInvoice,
      lineIndex
    });
  } catch (error) {
    console.error('Error deleting invoice line:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to delete invoice line',
      details: error.response?.data || error.message
    });
  }
});

// Delete entire invoice
app.delete('/api/invoice/:invoiceId', async (req, res) => {
  try {
    const { invoiceId } = req.params;
    
    if (!invoiceId) {
      return res.status(400).json({ error: 'Missing invoiceId parameter' });
    }

    console.log(`Deleting invoice ${invoiceId}`);

    // First get the current invoice to get the SyncToken
    const invoiceResponse = await axios.get(`https://sandbox-quickbooks.api.intuit.com/v3/company/${process.env.COMPANY_ID}/invoice/${invoiceId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    console.log('Invoice fetch response for deletion:', invoiceResponse.data);

    // Handle different response structures
    let invoice;
    if (invoiceResponse.data.QueryResponse && invoiceResponse.data.QueryResponse.Invoice) {
      invoice = invoiceResponse.data.QueryResponse.Invoice[0];
    } else if (invoiceResponse.data.Invoice) {
      invoice = invoiceResponse.data.Invoice;
    } else {
      throw new Error('Invoice not found in response');
    }

    console.log('Found invoice for deletion:', invoice.DocNumber);
    
    // QuickBooks uses "soft delete" - set Active to false
    invoice.Active = false;

    // Update the invoice to mark it as deleted
    const deleteResponse = await axios.post(`https://sandbox-quickbooks.api.intuit.com/v3/company/${process.env.COMPANY_ID}/invoice`, invoice, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    console.log('Delete response:', deleteResponse.data);

    // Handle different response structures for delete
    let deletedInvoice;
    if (deleteResponse.data.QueryResponse && deleteResponse.data.QueryResponse.Invoice) {
      deletedInvoice = deleteResponse.data.QueryResponse.Invoice[0];
    } else if (deleteResponse.data.Invoice) {
      deletedInvoice = deleteResponse.data.Invoice;
    } else {
      // Some operations might not return the invoice, which is okay for deletion
      console.log('No invoice returned from delete operation, assuming success');
    }

    res.json({ 
      success: true, 
      message: 'Invoice deleted successfully',
      invoiceId
    });
  } catch (error) {
    console.error('Error deleting invoice:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to delete invoice',
      details: error.response?.data || error.message
    });
  }
});

app.listen(3001, () => {
  console.log('Server running on port 3001');
});
