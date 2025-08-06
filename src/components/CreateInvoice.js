import React, { useState, useEffect } from 'react';
import axios from 'axios';

const CreateInvoice = () => {
  const [customers, setCustomers] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'
  
  // Invoice type: 'product' or 'delivery'
  const [invoiceType, setInvoiceType] = useState('delivery');
  
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
        Description: 'Product Delivery Service - Commission TBD'
      },
    ],
  });

  // State for commission calculation (delivery invoices)
  const [transactionValue, setTransactionValue] = useState(0);
  const [deliveryToCustomer, setDeliveryToCustomer] = useState(''); // Customer receiving the delivery

  // State for product sales
  const [selectedItem, setSelectedItem] = useState('');
  const [quantity, setQuantity] = useState(1);

  // Helper function to calculate tiered commission rate
  const calculateCommissionRate = (value) => {
    if (value < 49.99) return 15;
    if (value >= 50 && value <= 99.99) return 12;
    return 10; // > $100
  };

  // Fetch customers on component mount
  useEffect(() => {
    fetchCustomers();
    fetchItems();
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

  const fetchItems = async () => {
    try {
      const response = await axios.get('http://localhost:3001/items');
      setItems(response.data.items || []);
    } catch (error) {
      console.error('Error fetching items:', error);
      // Don't show error message for items as it's not critical
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
  const updateDescription = (transValue, deliveryCustomerId) => {
    if (invoiceType === 'product') {
      const selectedItemData = items.find(item => item.Id === selectedItem);
      return selectedItemData ? selectedItemData.Description || selectedItemData.Name : 'Product Sale';
    }
    
    // For delivery invoices
    const deliveryCustomer = customers.find(c => c.Id === deliveryCustomerId);
    const deliveryToName = deliveryCustomer ? (deliveryCustomer.DisplayName || deliveryCustomer.Name) : '';
    const commissionRate = calculateCommissionRate(transValue);
    
    console.log('UpdateDescription called with:');
    console.log('- transValue:', transValue);
    console.log('- calculated commissionRate:', commissionRate);
    console.log('- deliveryCustomerId:', deliveryCustomerId);
    console.log('- deliveryCustomer found:', deliveryCustomer);
    console.log('- deliveryToName:', deliveryToName);
    
    const description = deliveryToName 
      ? `Product Delivery Service - ${commissionRate}% Commission (Transaction Value: $${transValue.toFixed(2)}) - Delivering to: ${deliveryToName}`
      : `Product Delivery Service - ${commissionRate}% Commission (Transaction Value: $${transValue.toFixed(2)})`;
    
    console.log('- Generated description:', description);
    return description;
  };

  const handleDeliveryCustomerChange = (e) => {
    const selectedDeliveryCustomerId = e.target.value;
    setDeliveryToCustomer(selectedDeliveryCustomerId);
    
    // Update description with current values
    const description = updateDescription(transactionValue, selectedDeliveryCustomerId);
    
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
    
    // Calculate commission automatically using tiered rates
    const commissionRate = calculateCommissionRate(value);
    const commissionAmount = (value * commissionRate) / 100;
    
    // Update description with current values
    const description = updateDescription(value, deliveryToCustomer);
    
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

  const handleInvoiceTypeChange = (e) => {
    const type = e.target.value;
    setInvoiceType(type);
    
    // Reset form based on type
    if (type === 'delivery') {
      setTransactionValue(0);
      setDeliveryToCustomer('');
      setSelectedItem('');
      setInvoice((prevInvoice) => ({
        ...prevInvoice,
        Line: [{
          ...prevInvoice.Line[0],
          Amount: 0,
          SalesItemLineDetail: {
            ...prevInvoice.Line[0].SalesItemLineDetail,
            ItemRef: { value: '1' },
            UnitPrice: 0
          },
          Description: 'Product Delivery Service - Commission TBD'
        }]
      }));
    } else {
      // Product sale
      setTransactionValue(0);
      setDeliveryToCustomer('');
      setInvoice((prevInvoice) => ({
        ...prevInvoice,
        Line: [{
          ...prevInvoice.Line[0],
          Amount: 0,
          SalesItemLineDetail: {
            ...prevInvoice.Line[0].SalesItemLineDetail,
            ItemRef: { value: selectedItem || '1' },
            UnitPrice: 0
          },
          Description: 'Product Sale'
        }]
      }));
    }
  };

  const handleItemChange = (e) => {
    const itemId = e.target.value;
    setSelectedItem(itemId);
    
    const selectedItemData = items.find(item => item.Id === itemId);
    if (selectedItemData) {
      setInvoice((prevInvoice) => ({
        ...prevInvoice,
        Line: [{
          ...prevInvoice.Line[0],
          Description: selectedItemData.Description || selectedItemData.Name,
          Amount: selectedItemData.UnitPrice ? (selectedItemData.UnitPrice * quantity) : 0,
          SalesItemLineDetail: {
            ...prevInvoice.Line[0].SalesItemLineDetail,
            ItemRef: { value: itemId },
            UnitPrice: selectedItemData.UnitPrice || 0
          }
        }]
      }));
    }
  };

  const handleQuantityChange = (e) => {
    const qty = parseInt(e.target.value) || 1;
    setQuantity(qty);
    
    if (invoiceType === 'product' && selectedItem) {
      const selectedItemData = items.find(item => item.Id === selectedItem);
      if (selectedItemData) {
        const amount = (selectedItemData.UnitPrice || 0) * qty;
        setInvoice((prevInvoice) => ({
          ...prevInvoice,
          Line: [{
            ...prevInvoice.Line[0],
            Amount: amount,
            SalesItemLineDetail: {
              ...prevInvoice.Line[0].SalesItemLineDetail,
              Qty: qty,
              UnitPrice: selectedItemData.UnitPrice || 0
            }
          }]
        }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    
    // Validate based on invoice type
    if (invoiceType === 'delivery') {
      if (!deliveryToCustomer) {
        setMessage('Please select a delivery recipient before creating the invoice.');
        setMessageType('error');
        setLoading(false);
        return;
      }
      
      if (transactionValue <= 0) {
        setMessage('Please enter a transaction value greater than $0.');
        setMessageType('error');
        setLoading(false);
        return;
      }
    } else {
      // Product sale validation
      if (!selectedItem) {
        setMessage('Please select an item to sell.');
        setMessageType('error');
        setLoading(false);
        return;
      }
    }
    
    try {
      let finalDescription;
      
      if (invoiceType === 'delivery') {
        // Ensure the description is up-to-date with delivery recipient
        finalDescription = updateDescription(transactionValue, deliveryToCustomer);
      } else {
        // Use current description for product sales
        finalDescription = invoice.Line[0].Description;
      }
      
      // Create final invoice object with updated description
      const finalInvoice = {
        ...invoice,
        Line: [{
          ...invoice.Line[0],
          Description: finalDescription
        }]
      };
      
      console.log('Sending invoice data:', finalInvoice);
      console.log('Invoice type:', invoiceType);
      console.log('Final Invoice Description:', finalDescription);
      
      const response = await axios.post('http://localhost:3001/create-invoice', finalInvoice);
      console.log('Invoice created successfully', response.data);
      setMessage(`Invoice created successfully! Invoice ID: ${response.data.QueryResponse?.Invoice?.[0]?.Id || 'N/A'}`);
      setMessageType('success');
      
      // Reset form
      setTransactionValue(0);
      setDeliveryToCustomer('');
      setSelectedItem('');
      setQuantity(1);
      setInvoiceType('delivery');
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
            Description: 'Product Delivery Service - Commission TBD'
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
            Invoice Type:
          </label>
          <select
            value={invoiceType}
            onChange={handleInvoiceTypeChange}
            style={{ width: '100%', padding: '8px', fontSize: '14px' }}
          >
            <option value="delivery">Delivery Service</option>
            <option value="product">Product Sale</option>
          </select>
          <small style={{ color: '#666' }}>
            {invoiceType === 'delivery' 
              ? 'Commission-based delivery service with tiered rates' 
              : 'Direct sale of products from inventory'
            }
          </small>
        </div>

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

        {invoiceType === 'product' && (
          <>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Select Item:
              </label>
              <select
                value={selectedItem}
                onChange={handleItemChange}
                required
                style={{ width: '100%', padding: '8px', fontSize: '14px' }}
              >
                <option value="">-- Select an Item --</option>
                {items.map(item => (
                  <option key={item.Id} value={item.Id}>
                    {item.Name} - ${item.UnitPrice || 0}
                  </option>
                ))}
              </select>
              <small style={{ color: '#666' }}>Choose the product you're selling</small>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Quantity:
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={handleQuantityChange}
                required
                style={{ width: '100%', padding: '8px', fontSize: '14px' }}
              />
              <small style={{ color: '#666' }}>Number of items to sell</small>
            </div>
          </>
        )}

        {invoiceType === 'delivery' && (
          <>
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
              <small style={{ color: '#666' }}>
                Enter the total value of the products you're delivering. 
                Commission rates: 15% (&lt;$50), 12% ($50-$99.99), 10% (≥$100)
              </small>
            </div>
          </>
        )}

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Invoice Description:
          </label>
          <textarea
            value={invoice.Line[0].Description}
            onChange={handleDescriptionChange}
            required
            placeholder="Describe the service or product..."
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
          <h4 style={{ margin: '0 0 10px 0', color: '#495057' }}>
            {invoiceType === 'delivery' ? 'Delivery Summary:' : 'Sale Summary:'}
          </h4>
          <div style={{ fontSize: '14px', lineHeight: '1.5' }}>
            {invoiceType === 'delivery' ? (
              <>
                <div><strong>Transaction Value:</strong> ${transactionValue.toFixed(2)}</div>
                <div><strong>Commission Rate:</strong> {calculateCommissionRate(transactionValue)}%</div>
                {deliveryToCustomer && (
                  <div><strong>Delivering To:</strong> {customers.find(c => c.Id === deliveryToCustomer)?.DisplayName || customers.find(c => c.Id === deliveryToCustomer)?.Name || 'Unknown'}</div>
                )}
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#28a745', marginTop: '8px' }}>
                  <strong>Your Commission:</strong> ${invoice.Line[0].Amount.toFixed(2)}
                </div>
              </>
            ) : (
              <>
                {selectedItem && (
                  <>
                    <div><strong>Item:</strong> {items.find(i => i.Id === selectedItem)?.Name || 'Unknown'}</div>
                    <div><strong>Unit Price:</strong> ${items.find(i => i.Id === selectedItem)?.UnitPrice || 0}</div>
                    <div><strong>Quantity:</strong> {quantity}</div>
                  </>
                )}
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#28a745', marginTop: '8px' }}>
                  <strong>Total Amount:</strong> ${invoice.Line[0].Amount.toFixed(2)}
                </div>
              </>
            )}
          </div>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            {invoiceType === 'delivery' ? 'Commission Amount ($):' : 'Total Sale Amount ($):'}
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
          <small style={{ color: '#666' }}>
            {invoiceType === 'delivery' 
              ? 'Commission calculated automatically based on tiered rates' 
              : 'Amount calculated based on item price and quantity'
            }
          </small>
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
          {loading 
            ? (invoiceType === 'delivery' ? 'Creating Delivery Invoice...' : 'Creating Sales Invoice...') 
            : (invoiceType === 'delivery' ? 'Create Delivery Invoice' : 'Create Sales Invoice')
          }
        </button>
      </form>
    </div>
  );
};

export default CreateInvoice;
