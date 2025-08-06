import React, { useState, useEffect } from 'react';
import axios from 'axios';

const CreateInvoice = () => {
  const [customers, setCustomers] = useState([]);
  const [items, setItems] = useState([]);
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
        Description: 'Product Delivery Service - Commission TBD'
      },
    ],
  });

  // State for managing multiple line items
  const [lineItems, setLineItems] = useState([
    {
      id: 1,
      type: 'delivery', // 'delivery' or 'product'
      transactionValue: 0,
      deliveryToCustomer: '',
      selectedItem: '',
      quantity: 1,
      amount: 0,
      description: 'Product Delivery Service - Commission TBD'
    }
  ]);

  // Helper function to calculate tiered commission rate
  const calculateCommissionRate = (value) => {
    if (value < 49.99) return 15;
    if (value >= 50 && value <= 99.99) return 12;
    return 10; // > $100
  };

  // Function to add a new line item
  const addLineItem = () => {
    const newId = Math.max(...lineItems.map(item => item.id)) + 1;
    setLineItems([...lineItems, {
      id: newId,
      type: 'delivery',
      transactionValue: 0,
      deliveryToCustomer: '',
      selectedItem: '',
      quantity: 1,
      amount: 0,
      description: 'Product Delivery Service - Commission TBD'
    }]);
  };

  // Function to remove a line item
  const removeLineItem = (id) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter(item => item.id !== id));
      updateInvoiceFromLineItems(lineItems.filter(item => item.id !== id));
    }
  };

  // Function to update a specific line item
  const updateLineItem = (id, updates) => {
    const updatedItems = lineItems.map(item => 
      item.id === id ? { ...item, ...updates } : item
    );
    setLineItems(updatedItems);
    updateInvoiceFromLineItems(updatedItems);
  };

  // Function to update the main invoice from line items
  const updateInvoiceFromLineItems = (items) => {
    const lines = items.map(item => {
      let amount = 0;
      let description = item.description;
      
      if (item.type === 'delivery') {
        const commissionRate = calculateCommissionRate(item.transactionValue);
        amount = (item.transactionValue * commissionRate) / 100;
        
        const deliveryCustomer = customers.find(c => c.Id === item.deliveryToCustomer);
        const deliveryToName = deliveryCustomer ? (deliveryCustomer.DisplayName || deliveryCustomer.Name) : '';
        
        description = deliveryToName 
          ? `Product Delivery Service - ${commissionRate}% Commission (Transaction Value: $${item.transactionValue.toFixed(2)}) - Delivering to: ${deliveryToName}`
          : `Product Delivery Service - ${commissionRate}% Commission (Transaction Value: $${item.transactionValue.toFixed(2)})`;
      } else if (item.type === 'product' && item.selectedItem) {
        const selectedItemData = items.find(i => i.Id === item.selectedItem);
        if (selectedItemData) {
          amount = (selectedItemData.UnitPrice || 0) * item.quantity;
          description = selectedItemData.Description || selectedItemData.Name;
        }
      }
      
      return {
        Amount: amount,
        DetailType: 'SalesItemLineDetail',
        SalesItemLineDetail: {
          ItemRef: { value: item.selectedItem || '1' },
          Qty: item.quantity,
          UnitPrice: item.type === 'delivery' ? amount : (items.find(i => i.Id === item.selectedItem)?.UnitPrice || 0)
        },
        Description: description
      };
    });
    
    setInvoice(prev => ({
      ...prev,
      Line: lines
    }));
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

  const handleEmailChange = (e) => {
    const { value } = e.target;
    setInvoice((prevInvoice) => ({
      ...prevInvoice,
      BillEmail: { Address: value },
    }));
  };



  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    
    // Validate line items
    for (let item of lineItems) {
      if (item.type === 'delivery') {
        if (!item.deliveryToCustomer) {
          setMessage(`Line item ${lineItems.indexOf(item) + 1}: Please select a delivery recipient.`);
          setMessageType('error');
          setLoading(false);
          return;
        }
        
        if (item.transactionValue <= 0) {
          setMessage(`Line item ${lineItems.indexOf(item) + 1}: Please enter a transaction value greater than $0.`);
          setMessageType('error');
          setLoading(false);
          return;
        }
      } else {
        if (!item.selectedItem) {
          setMessage(`Line item ${lineItems.indexOf(item) + 1}: Please select an item to sell.`);
          setMessageType('error');
          setLoading(false);
          return;
        }
      }
    }
    
    try {
      // Build the invoice from line items
      const lines = lineItems.map(item => {
        let amount = 0;
        let description = '';
        let itemRef = '1';
        let unitPrice = 0;
        
        if (item.type === 'delivery') {
          const commissionRate = calculateCommissionRate(item.transactionValue);
          amount = (item.transactionValue * commissionRate) / 100;
          unitPrice = amount;
          
          const deliveryCustomer = customers.find(c => c.Id === item.deliveryToCustomer);
          const deliveryToName = deliveryCustomer ? (deliveryCustomer.DisplayName || deliveryCustomer.Name) : '';
          
          description = deliveryToName 
            ? `Product Delivery Service - ${commissionRate}% Commission (Transaction Value: $${item.transactionValue.toFixed(2)}) - Delivering to: ${deliveryToName}`
            : `Product Delivery Service - ${commissionRate}% Commission (Transaction Value: $${item.transactionValue.toFixed(2)})`;
        } else {
          const selectedItemData = items.find(i => i.Id === item.selectedItem);
          if (selectedItemData) {
            amount = (selectedItemData.UnitPrice || 0) * item.quantity;
            unitPrice = selectedItemData.UnitPrice || 0;
            itemRef = item.selectedItem;
            description = selectedItemData.Description || selectedItemData.Name;
          }
        }
        
        return {
          Amount: amount,
          DetailType: 'SalesItemLineDetail',
          SalesItemLineDetail: {
            ItemRef: { value: itemRef },
            Qty: item.quantity,
            UnitPrice: unitPrice
          },
          Description: description
        };
      });
      
      const finalInvoice = {
        ...invoice,
        Line: lines
      };
      
      console.log('Sending multi-line invoice data:', finalInvoice);
      console.log('Line items:', lineItems);
      
      const response = await axios.post('http://localhost:3001/create-invoice', finalInvoice);
      console.log('Invoice created successfully', response.data);
      setMessage(`Invoice created successfully! Invoice ID: ${response.data.QueryResponse?.Invoice?.[0]?.Id || 'N/A'} with ${lineItems.length} line item(s)`);
      setMessageType('success');
      
      // Reset form
      setLineItems([{
        id: 1,
        type: 'delivery',
        transactionValue: 0,
        deliveryToCustomer: '',
        selectedItem: '',
        quantity: 1,
        amount: 0,
        description: 'Product Delivery Service - Commission TBD'
      }]);
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

        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0 }}>Invoice Line Items</h3>
            <button 
              type="button"
              onClick={addLineItem}
              style={{
                backgroundColor: '#28a745',
                color: 'white',
                padding: '8px 15px',
                border: 'none',
                borderRadius: '4px',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              + Add Line Item
            </button>
          </div>

          {lineItems.map((lineItem, index) => (
            <div key={lineItem.id} style={{
              border: '1px solid #dee2e6',
              borderRadius: '4px',
              padding: '15px',
              marginBottom: '15px',
              backgroundColor: '#f8f9fa'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h4 style={{ margin: 0 }}>Line Item {index + 1}</h4>
                {lineItems.length > 1 && (
                  <button 
                    type="button"
                    onClick={() => removeLineItem(lineItem.id)}
                    style={{
                      backgroundColor: '#dc3545',
                      color: 'white',
                      padding: '5px 10px',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Item Type:
                </label>
                <select
                  value={lineItem.type}
                  onChange={(e) => updateLineItem(lineItem.id, { 
                    type: e.target.value,
                    transactionValue: 0,
                    deliveryToCustomer: '',
                    selectedItem: '',
                    quantity: 1,
                    amount: 0
                  })}
                  style={{ width: '100%', padding: '8px', fontSize: '14px' }}
                >
                  <option value="delivery">Delivery Service</option>
                  <option value="product">Product Sale</option>
                </select>
              </div>

              {lineItem.type === 'delivery' ? (
                <>
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                      Delivering To:
                    </label>
                    <select
                      value={lineItem.deliveryToCustomer}
                      onChange={(e) => updateLineItem(lineItem.id, { deliveryToCustomer: e.target.value })}
                      required
                      style={{ width: '100%', padding: '8px', fontSize: '14px' }}
                    >
                      <option value="">-- Select Delivery Recipient --</option>
                      {customers
                        .filter(customer => customer.Id !== invoice.CustomerRef.value)
                        .map(customer => (
                          <option key={customer.Id} value={customer.Id}>
                            {customer.DisplayName || customer.Name} {customer.CompanyName ? `(${customer.CompanyName})` : ''}
                          </option>
                        ))
                      }
                    </select>
                  </div>

                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                      Transaction Value ($):
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={lineItem.transactionValue}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        const commissionRate = calculateCommissionRate(value);
                        const amount = (value * commissionRate) / 100;
                        updateLineItem(lineItem.id, { 
                          transactionValue: value,
                          amount: amount
                        });
                      }}
                      required
                      style={{ width: '100%', padding: '8px', fontSize: '14px' }}
                    />
                    <small style={{ color: '#666' }}>
                      Commission: {calculateCommissionRate(lineItem.transactionValue)}% = ${((lineItem.transactionValue * calculateCommissionRate(lineItem.transactionValue)) / 100).toFixed(2)}
                    </small>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                      Select Item:
                    </label>
                    <select
                      value={lineItem.selectedItem}
                      onChange={(e) => {
                        const itemId = e.target.value;
                        const selectedItemData = items.find(item => item.Id === itemId);
                        updateLineItem(lineItem.id, { 
                          selectedItem: itemId,
                          amount: selectedItemData ? (selectedItemData.UnitPrice || 0) * lineItem.quantity : 0
                        });
                      }}
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
                  </div>

                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                      Quantity:
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={lineItem.quantity}
                      onChange={(e) => {
                        const qty = parseInt(e.target.value) || 1;
                        const selectedItemData = items.find(item => item.Id === lineItem.selectedItem);
                        updateLineItem(lineItem.id, { 
                          quantity: qty,
                          amount: selectedItemData ? (selectedItemData.UnitPrice || 0) * qty : 0
                        });
                      }}
                      required
                      style={{ width: '100%', padding: '8px', fontSize: '14px' }}
                    />
                  </div>
                </>
              )}

              <div style={{ 
                padding: '10px', 
                backgroundColor: '#e9ecef', 
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: 'bold'
              }}>
                Line Total: ${((lineItem.type === 'delivery' 
                  ? (lineItem.transactionValue * calculateCommissionRate(lineItem.transactionValue)) / 100
                  : lineItem.amount) || 0).toFixed(2)}
              </div>
            </div>
          ))}

          <div style={{ 
            padding: '15px', 
            backgroundColor: '#d4edda', 
            border: '1px solid #c3e6cb',
            borderRadius: '4px',
            fontSize: '16px',
            fontWeight: 'bold',
            textAlign: 'center'
          }}>
            Invoice Total: ${lineItems.reduce((total, item) => {
              const lineTotal = item.type === 'delivery' 
                ? (item.transactionValue * calculateCommissionRate(item.transactionValue)) / 100
                : item.amount;
              return total + (lineTotal || 0);
            }, 0).toFixed(2)}
          </div>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Invoice Description (Optional):
          </label>
          <textarea
            value={invoice.Line[0]?.Description || ''}
            onChange={(e) => {
              const description = e.target.value;
              setInvoice((prevInvoice) => ({
                ...prevInvoice,
                Line: [{
                  ...prevInvoice.Line[0],
                  Description: description
                }]
              }));
            }}
            placeholder="Add an overall description for this invoice..."
            rows="2"
            style={{ width: '100%', padding: '8px', fontSize: '14px', resize: 'vertical' }}
          />
          <small style={{ color: '#666' }}>This will be added as a header description. Individual line items have their own descriptions.</small>
        </div>

        <button 
          type="submit" 
          disabled={loading || lineItems.length === 0}
          style={{
            backgroundColor: loading || lineItems.length === 0 ? '#ccc' : '#007bff',
            color: 'white',
            padding: '10px 20px',
            border: 'none',
            borderRadius: '4px',
            fontSize: '16px',
            cursor: loading || lineItems.length === 0 ? 'not-allowed' : 'pointer'
          }}
        >
          {loading 
            ? `Creating Invoice with ${lineItems.length} item(s)...` 
            : `Create Invoice (${lineItems.length} line item${lineItems.length === 1 ? '' : 's'})`
          }
        </button>
      </form>
    </div>
  );
};

export default CreateInvoice;
