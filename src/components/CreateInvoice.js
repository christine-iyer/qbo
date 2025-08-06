import React, { useState, useEffect } from 'react';
import axios from 'axios';

const CreateInvoice = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'
  
  const [invoice, setInvoice] = useState({
    CustomerRef: { value: '' },
    BillEmail: { Address: '' },
    Line: [
      {
        Amount: 0,
        DetailType: 'SalesItemLineDetail',
        SalesItemLineDetail: {
          ItemRef: { value: '1' },
          Qty: 1,
          UnitPrice: 0
        },
        Description: 'Product Delivery Service - 10% Commission'
      },
    ],
  });

  // State for commission calculation
  const [transactionValue, setTransactionValue] = useState(0);
  const [commissionRate, setCommissionRate] = useState(10); // Default 10%
  const [deliveryToCustomer, setDeliveryToCustomer] = useState(''); // Customer receiving the delivery

  // Fetch customers on component mount
  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await axios.get('http://localhost:3001/customers');
      setCustomers(response.data.customers || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      setMessage('Could not load customers. Please make sure you are authenticated.');
      setMessageType('error');
    }
  };

  const handleCustomerChange = (e) => {
    const selectedCustomerId = e.target.value;
    const selectedCustomer = customers.find(c => c.Id === selectedCustomerId);
    
    setInvoice((prevInvoice) => ({
      ...prevInvoice,
      CustomerRef: { value: selectedCustomerId },
      BillEmail: { 
        Address: selectedCustomer?.PrimaryEmailAddr?.Address || '' 
      }
    }));
  };

  // Helper function to update description with all current values
  const updateDescription = (transValue, commRate, deliveryCustomerId) => {
    const deliveryCustomer = customers.find(c => c.Id === deliveryCustomerId);
    const deliveryToName = deliveryCustomer ? (deliveryCustomer.DisplayName || deliveryCustomer.Name) : '';
    
    console.log('UpdateDescription called with:');
    console.log('- transValue:', transValue);
    console.log('- commRate:', commRate);
    console.log('- deliveryCustomerId:', deliveryCustomerId);
    console.log('- deliveryCustomer found:', deliveryCustomer);
    console.log('- deliveryToName:', deliveryToName);
    
    const description = deliveryToName 
      ? `Product Delivery Service - ${commRate}% Commission (Transaction Value: $${transValue.toFixed(2)}) - Delivering to: ${deliveryToName}`
      : `Product Delivery Service - ${commRate}% Commission (Transaction Value: $${transValue.toFixed(2)})`;
    
    console.log('- Generated description:', description);
    return description;
  };

  const handleDeliveryCustomerChange = (e) => {
    const selectedDeliveryCustomerId = e.target.value;
    setDeliveryToCustomer(selectedDeliveryCustomerId);
    
    // Update description with current values
    const description = updateDescription(transactionValue, commissionRate, selectedDeliveryCustomerId);
    
    setInvoice((prevInvoice) => ({
      ...prevInvoice,
      Line: [{
        ...prevInvoice.Line[0],
        Description: description
      }]
    }));
  };

  const handleEmailChange = (e) => {
    const { value } = e.target;
    setInvoice((prevInvoice) => ({
      ...prevInvoice,
      BillEmail: { Address: value },
    }));
  };

  const handleAmountChange = (e) => {
    const amount = parseFloat(e.target.value) || 0;
    setInvoice((prevInvoice) => ({
      ...prevInvoice,
      Line: [{
        ...prevInvoice.Line[0],
        Amount: amount,
        SalesItemLineDetail: {
          ...prevInvoice.Line[0].SalesItemLineDetail,
          UnitPrice: amount
        }
      }]
    }));
  };

  const handleTransactionValueChange = (e) => {
    const value = parseFloat(e.target.value) || 0;
    setTransactionValue(value);
    
    // Calculate commission automatically
    const commissionAmount = (value * commissionRate) / 100;
    
    // Update description with current values
    const description = updateDescription(value, commissionRate, deliveryToCustomer);
    
    setInvoice((prevInvoice) => ({
      ...prevInvoice,
      Line: [{
        ...prevInvoice.Line[0],
        Amount: commissionAmount,
        SalesItemLineDetail: {
          ...prevInvoice.Line[0].SalesItemLineDetail,
          UnitPrice: commissionAmount
        },
        Description: description
      }]
    }));
  };

  const handleCommissionRateChange = (e) => {
    const rate = parseFloat(e.target.value) || 0;
    setCommissionRate(rate);
    
    // Recalculate commission with new rate
    const commissionAmount = (transactionValue * rate) / 100;
    
    // Update description with current values
    const description = updateDescription(transactionValue, rate, deliveryToCustomer);
    
    setInvoice((prevInvoice) => ({
      ...prevInvoice,
      Line: [{
        ...prevInvoice.Line[0],
        Amount: commissionAmount,
        SalesItemLineDetail: {
          ...prevInvoice.Line[0].SalesItemLineDetail,
          UnitPrice: commissionAmount
        },
        Description: description
      }]
    }));
  };

  const handleDescriptionChange = (e) => {
    const description = e.target.value;
    setInvoice((prevInvoice) => ({
      ...prevInvoice,
      Line: [{
        ...prevInvoice.Line[0],
        Description: description
      }]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    
    // Validate that delivery recipient is selected
    if (!deliveryToCustomer) {
      setMessage('Please select a delivery recipient before creating the invoice.');
      setMessageType('error');
      setLoading(false);
      return;
    }
    
    // Validate that transaction value is greater than 0
    if (transactionValue <= 0) {
      setMessage('Please enter a transaction value greater than $0.');
      setMessageType('error');
      setLoading(false);
      return;
    }
    
    try {
      // Ensure the description is up-to-date with delivery recipient
      const finalDescription = updateDescription(transactionValue, commissionRate, deliveryToCustomer);
      
      // Create final invoice object with updated description
      const finalInvoice = {
        ...invoice,
        Line: [{
          ...invoice.Line[0],
          Description: finalDescription
        }]
      };
      
      console.log('Sending invoice data:', finalInvoice);
      console.log('Delivery recipient ID:', deliveryToCustomer);
      console.log('Transaction value:', transactionValue);
      console.log('Final Invoice Description:', finalDescription);
      
      const response = await axios.post('http://localhost:3001/create-invoice', finalInvoice);
      console.log('Invoice created successfully', response.data);
      setMessage(`Invoice created successfully! Invoice ID: ${response.data.QueryResponse?.Invoice?.[0]?.Id || 'N/A'}`);
      setMessageType('success');
      
      // Reset form
      setTransactionValue(0);
      setCommissionRate(10);
      setDeliveryToCustomer('');
      setInvoice({
        CustomerRef: { value: '' },
        BillEmail: { Address: '' },
        Line: [
          {
            Amount: 0,
            DetailType: 'SalesItemLineDetail',
            SalesItemLineDetail: {
              ItemRef: { value: '1' },
              Qty: 1,
              UnitPrice: 0
            },
            Description: 'Product Delivery Service - 10% Commission'
          },
        ],
      });
    } catch (error) {
      console.error('Error creating invoice', error);
      setMessage(`Failed to create invoice: ${error.response?.data?.error || error.message}`);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px' }}>
      <h1>Create Invoice</h1>
      
      {message && (
        <div style={{ 
          padding: '10px', 
          margin: '10px 0',
          backgroundColor: messageType === 'success' ? '#d4edda' : '#f8d7da',
          color: messageType === 'success' ? '#155724' : '#721c24',
          border: `1px solid ${messageType === 'success' ? '#c3e6cb' : '#f5c6cb'}`,
          borderRadius: '4px'
        }}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Select Customer:
          </label>
          <select
            value={invoice.CustomerRef.value}
            onChange={handleCustomerChange}
            required
            style={{ width: '100%', padding: '8px', fontSize: '14px' }}
          >
            <option value="">-- Select a Customer --</option>
            {customers.map(customer => (
              <option key={customer.Id} value={customer.Id}>
                {customer.DisplayName || customer.Name} {customer.CompanyName ? `(${customer.CompanyName})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Customer Email:
          </label>
          <input
            type="email"
            value={invoice.BillEmail.Address}
            onChange={handleEmailChange}
            required
            placeholder="customer@example.com"
            style={{ width: '100%', padding: '8px', fontSize: '14px' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Delivering To:
          </label>
          <select
            value={deliveryToCustomer}
            onChange={handleDeliveryCustomerChange}
            required
            style={{ width: '100%', padding: '8px', fontSize: '14px' }}
          >
            <option value="">-- Select Delivery Recipient --</option>
            {customers
              .filter(customer => customer.Id !== invoice.CustomerRef.value) // Exclude the customer being invoiced
              .map(customer => (
                <option key={customer.Id} value={customer.Id}>
                  {customer.DisplayName || customer.Name} {customer.CompanyName ? `(${customer.CompanyName})` : ''}
                </option>
              ))
            }
          </select>
          <small style={{ color: '#666' }}>Select who will receive the delivered products</small>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Transaction Value ($):
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={transactionValue}
            onChange={handleTransactionValueChange}
            required
            placeholder="Value of goods being delivered"
            style={{ width: '100%', padding: '8px', fontSize: '14px' }}
          />
          <small style={{ color: '#666' }}>Enter the total value of the products you're delivering</small>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Commission Rate (%):
          </label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="100"
            value={commissionRate}
            onChange={handleCommissionRateChange}
            required
            style={{ width: '100%', padding: '8px', fontSize: '14px' }}
          />
          <small style={{ color: '#666' }}>Your commission percentage (default: 10%)</small>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Invoice Description:
          </label>
          <textarea
            value={invoice.Line[0].Description}
            onChange={handleDescriptionChange}
            required
            placeholder="Describe the delivery service..."
            rows="3"
            style={{ width: '100%', padding: '8px', fontSize: '14px', resize: 'vertical' }}
          />
        </div>

        <div style={{ 
          marginBottom: '15px', 
          padding: '15px', 
          backgroundColor: '#f8f9fa', 
          border: '1px solid #dee2e6', 
          borderRadius: '4px' 
        }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#495057' }}>Delivery Summary:</h4>
          <div style={{ fontSize: '14px', lineHeight: '1.5' }}>
            <div><strong>Transaction Value:</strong> ${transactionValue.toFixed(2)}</div>
            <div><strong>Commission Rate:</strong> {commissionRate}%</div>
            {deliveryToCustomer && (
              <div><strong>Delivering To:</strong> {customers.find(c => c.Id === deliveryToCustomer)?.DisplayName || customers.find(c => c.Id === deliveryToCustomer)?.Name || 'Unknown'}</div>
            )}
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#28a745', marginTop: '8px' }}>
              <strong>Your Commission:</strong> ${invoice.Line[0].Amount.toFixed(2)}
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Final Invoice Amount ($):
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={invoice.Line[0].Amount}
            onChange={handleAmountChange}
            required
            style={{ 
              width: '100%', 
              padding: '8px', 
              fontSize: '14px',
              backgroundColor: '#e9ecef',
              fontWeight: 'bold'
            }}
            readOnly
          />
          <small style={{ color: '#666' }}>This amount is calculated automatically based on your commission rate</small>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          style={{
            backgroundColor: loading ? '#ccc' : '#007bff',
            color: 'white',
            padding: '10px 20px',
            border: 'none',
            borderRadius: '4px',
            fontSize: '16px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Creating Invoice...' : 'Create Invoice'}
        </button>
      </form>
    </div>
  );
};

export default CreateInvoice;
