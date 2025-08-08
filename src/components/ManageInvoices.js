import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ManageInvoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [editAmount, setEditAmount] = useState('');
  const [editingLineItem, setEditingLineItem] = useState(null); // Format: "invoiceId-lineIndex"
  const [editLineItemData, setEditLineItemData] = useState({}); // Store editing data for line items

  useEffect(() => {
    fetchInvoices();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Helper functions to extract information from description
  const extractTransactionValue = (description) => {
    const match = description.match(/Transaction Value: \$(\d+(?:,\d{3})*\.?\d*)/);
    return match ? parseFloat(match[1].replace(/,/g, '')) : 0;
  };

  const extractCommissionRate = (description) => {
    const match = description.match(/(\d+\.?\d*)% Commission/);
    return match ? parseFloat(match[1]) : 10;
  };

  const extractDeliveryRecipient = (description) => {
    const match = description.match(/Delivering to: (.+)$/);
    return match ? match[1].trim() : 'Not specified';
  };

  const extractDeliveryDate = (description) => {
    const match = description.match(/Delivered on: (\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : '';
  };

  const isDeliveryService = (description) => {
    return description && description.includes('Product Delivery Service');
  };

  const isProductSale = (description) => {
    return description && !description.includes('Product Delivery Service') && description.length > 0;
  };

  // Function to analyze and categorize line items
  const analyzeLineItems = (invoice) => {
    if (!invoice.Line || !Array.isArray(invoice.Line)) {
      return { deliveryItems: [], productItems: [], totalItems: 0 };
    }

    const deliveryItems = [];
    const productItems = [];

    invoice.Line.forEach((line, index) => {
      const description = line.Description || '';
      
      if (isDeliveryService(description)) {
        deliveryItems.push({
          index: index + 1,
          description,
          amount: line.Amount || 0,
          quantity: line.SalesItemLineDetail?.Qty || 1,
          transactionValue: extractTransactionValue(description),
          commissionRate: extractCommissionRate(description),
          deliveryRecipient: extractDeliveryRecipient(description),
          deliveryDate: extractDeliveryDate(description)
        });
      } else if (isProductSale(description)) {
        productItems.push({
          index: index + 1,
          description,
          amount: line.Amount || 0,
          quantity: line.SalesItemLineDetail?.Qty || 1,
          unitPrice: line.SalesItemLineDetail?.UnitPrice || 0
        });
      }
    });

    return {
      deliveryItems,
      productItems,
      totalItems: deliveryItems.length + productItems.length
    };
  };

  // Fetch real invoices from QuickBooks API
  const fetchInvoices = async () => {
    setLoading(true);
    setMessage('');
    try {
      const response = await axios.get('http://localhost:3001/invoices');
      console.log('Fetched invoices:', response.data);
      const invoices = response.data.invoices || [];
      
      // Debug: log descriptions to see what we're parsing
      invoices.forEach((invoice, index) => {
        const lineItems = analyzeLineItems(invoice);
        console.log(`Invoice ${index + 1}:`, {
          docNumber: invoice.DocNumber,
          totalLineItems: lineItems.totalItems,
          deliveryItems: lineItems.deliveryItems.length,
          productItems: lineItems.productItems.length,
          customerName: invoice.CustomerName
        });
      });
      
      setInvoices(invoices);
      
      if (response.data.invoices && response.data.invoices.length > 0) {
        setMessage(`Successfully loaded ${response.data.invoices.length} invoice(s)`);
        setMessageType('success');
      } else {
        setMessage('No invoices found. Create some invoices first!');
        setMessageType('info');
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
      setMessage('Failed to fetch invoices. Please make sure you are authenticated with QuickBooks.');
      setMessageType('error');
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  const refreshInvoices = () => {
    fetchInvoices();
  };

  const handleEdit = (invoice) => {
    setEditingInvoice(invoice.Id);
    setEditAmount(invoice.TotalAmt.toString());
  };

  const handleSaveEdit = async (invoiceId) => {
    try {
      // In a real implementation, you would update the invoice in QuickBooks
      console.log(`Updating invoice ${invoiceId} with amount ${editAmount}`);
      
      // For now, just update locally
      setInvoices(invoices.map(inv => 
        inv.Id === invoiceId 
          ? { ...inv, TotalAmt: parseFloat(editAmount) }
          : inv
      ));
      
      setEditingInvoice(null);
      setEditAmount('');
      setMessage('Invoice updated successfully (local only - QuickBooks update not implemented)');
      setMessageType('success');
    } catch (error) {
      setMessage('Failed to update invoice');
      setMessageType('error');
    }
  };

  const handleCancelEdit = () => {
    setEditingInvoice(null);
    setEditAmount('');
  };

  // Line item editing functions
  const handleEditLineItem = (invoiceId, lineIndex, item) => {
    const editKey = `${invoiceId}-${lineIndex}`;
    setEditingLineItem(editKey);
    setEditLineItemData({
      ...item,
      invoiceId,
      lineIndex
    });
  };

  const handleSaveLineItem = async (invoiceId, lineIndex) => {
    try {
      // In a real implementation, you would update the specific line item in QuickBooks
      console.log(`Updating line item ${lineIndex} in invoice ${invoiceId}`, editLineItemData);
      
      // For now, just update locally
      setInvoices(invoices.map(invoice => {
        if (invoice.Id === invoiceId && invoice.Line && invoice.Line[lineIndex]) {
          const updatedLine = { ...invoice.Line[lineIndex] };
          
          // Update based on item type
          if (editLineItemData.transactionValue !== undefined) {
            // Delivery service update
            const commissionRate = editLineItemData.commissionRate || 10;
            updatedLine.Amount = (editLineItemData.transactionValue * commissionRate) / 100;
            updatedLine.Description = `Product Delivery Service - ${commissionRate}% Commission (Transaction Value: $${editLineItemData.transactionValue.toFixed(2)}) - Delivered on: ${editLineItemData.deliveryDate || ''} - Delivering to: ${editLineItemData.deliveryRecipient || 'Not specified'}`;
          } else {
            // Product sale update
            updatedLine.Amount = editLineItemData.amount;
            updatedLine.SalesItemLineDetail.Qty = editLineItemData.quantity;
            updatedLine.SalesItemLineDetail.UnitPrice = editLineItemData.unitPrice;
          }
          
          const updatedInvoice = { ...invoice };
          updatedInvoice.Line[lineIndex] = updatedLine;
          
          // Recalculate total
          updatedInvoice.TotalAmt = updatedInvoice.Line.reduce((total, line) => total + (line.Amount || 0), 0);
          
          return updatedInvoice;
        }
        return invoice;
      }));
      
      setEditingLineItem(null);
      setEditLineItemData({});
      setMessage('Line item updated successfully (local only - QuickBooks update not implemented)');
      setMessageType('success');
    } catch (error) {
      setMessage('Failed to update line item');
      setMessageType('error');
    }
  };

  const handleCancelLineItemEdit = () => {
    setEditingLineItem(null);
    setEditLineItemData({});
  };

  // Delete line item function
  const handleDeleteLineItem = async (invoiceId, lineIndex, itemDescription) => {
    if (window.confirm(`Are you sure you want to delete this line item: "${itemDescription.substring(0, 50)}..."?`)) {
      try {
        setMessage('Deleting line item...');
        setMessageType('info');
        
        console.log(`Deleting line item ${lineIndex} from invoice ${invoiceId}`);
        
        // Call backend API to delete line item in QuickBooks
        const response = await axios.put('http://localhost:3001/api/delete-invoice-line', {
          invoiceId,
          lineIndex
        });
        
        if (response.data.success) {
          // Update local state with the response from QuickBooks
          setInvoices(invoices.map(invoice => {
            if (invoice.Id === invoiceId) {
              return response.data.invoice;
            }
            return invoice;
          }));
          
          setMessage('Line item deleted successfully');
          setMessageType('success');
        } else {
          throw new Error(response.data.error || 'Failed to delete line item');
        }
      } catch (error) {
        console.error('Error deleting line item:', error);
        setMessage(error.response?.data?.error || 'Failed to delete line item');
        setMessageType('error');
      }
    }
  };

  const handleDelete = async (invoiceId) => {
    const invoice = invoices.find(inv => inv.Id === invoiceId);
    const lineItems = analyzeLineItems(invoice);
    
    if (window.confirm(
      `Are you sure you want to delete invoice ${invoice.DocNumber}?\n\n` +
      `Customer: ${invoice.CustomerName}\n` +
      `Total Amount: $${invoice.TotalAmt.toFixed(2)}\n` +
      `Line Items: ${lineItems.totalItems} (${lineItems.deliveryItems.length} delivery, ${lineItems.productItems.length} product)\n\n` +
      `Note: Due to QuickBooks API limitations, invoices cannot be truly deleted but will be marked for removal.`
    )) {
      try {
        setMessage('Attempting to delete invoice...');
        setMessageType('info');
        
        console.log(`Deleting invoice ${invoiceId}`);
        
        // Call backend API to delete invoice in QuickBooks
        const response = await axios.delete(`http://localhost:3001/api/invoice/${invoiceId}`);
        
        if (response.data.success) {
          // Remove from local state
          setInvoices(invoices.filter(inv => inv.Id !== invoiceId));
          setMessage(`Invoice ${invoice.DocNumber} deleted successfully`);
          setMessageType('success');
        } else {
          throw new Error(response.data.error || 'Failed to delete invoice');
        }
      } catch (error) {
        console.error('Error deleting invoice:', error);
        
        // Handle QuickBooks API limitations gracefully
        if (error.response?.status === 400 && error.response?.data?.limitation) {
          setMessage(
            `⚠️ QuickBooks Limitation: ${error.response.data.details}\n\n` +
            `${error.response.data.suggestion}\n\n` +
            `The invoice remains visible here but you can void it directly in QuickBooks Online.`
          );
          setMessageType('info');
        } else {
          setMessage(error.response?.data?.error || error.message || 'Failed to delete invoice');
          setMessageType('error');
        }
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Sent': return '#28a745';
      case 'NotSet': return '#ffc107';
      case 'Paid': return '#007bff';
      default: return '#6c757d';
    }
  };

  const getStatusText = (emailStatus, balance) => {
    if (balance === 0) return 'Paid';
    if (emailStatus === 'Sent') return 'Sent';
    if (emailStatus === 'NotSet') return 'Draft';
    return emailStatus || 'Unknown';
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px' }}>
      <h1>Manage Invoices</h1>
      
      {message && (
        <div style={{ 
          padding: '15px', 
          margin: '10px 0',
          backgroundColor: 
            messageType === 'success' ? '#d4edda' : 
            messageType === 'info' ? '#d1ecf1' : '#f8d7da',
          color: 
            messageType === 'success' ? '#155724' : 
            messageType === 'info' ? '#0c5460' : '#721c24',
          border: `1px solid ${
            messageType === 'success' ? '#c3e6cb' : 
            messageType === 'info' ? '#bee5eb' : '#f5c6cb'
          }`,
          borderRadius: '4px',
          whiteSpace: 'pre-line',
          lineHeight: '1.5'
        }}>
          {message}
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={refreshInvoices}
          disabled={loading}
          style={{
            backgroundColor: '#28a745',
            color: 'white',
            padding: '8px 16px',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            marginRight: '10px'
          }}
        >
          {loading ? 'Loading...' : 'Refresh Invoices'}
        </button>
        <span style={{ color: '#666', fontSize: '14px' }}>
          Showing {invoices.length} invoice(s)
        </span>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div>Loading invoices...</div>
        </div>
      ) : invoices.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px',
          backgroundColor: '#f8f9fa',
          borderRadius: '4px',
          border: '1px solid #dee2e6'
        }}>
          <h3>No Invoices Found</h3>
          <p>Create your first invoice to see it listed here!</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ 
            width: '100%', 
            borderCollapse: 'collapse',
            backgroundColor: 'white',
            boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)'
          }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa' }}>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Invoice #</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Customer</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Date</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Total Amount</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Status</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Line Items</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice, index) => {
                const lineItems = analyzeLineItems(invoice);
                return (
                <tr key={invoice.Id} style={{ 
                  backgroundColor: index % 2 === 0 ? '#fff' : '#f8f9fa',
                  borderBottom: '1px solid #dee2e6'
                }}>
                  <td style={{ padding: '12px' }}>{invoice.DocNumber}</td>
                  <td style={{ padding: '12px' }}>
                    <div>
                      <strong>{invoice.CustomerName}</strong>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {invoice.BillEmail?.Address}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px' }}>{invoice.TxnDate}</td>
                  <td style={{ padding: '12px' }}>
                    {editingInvoice === invoice.Id ? (
                      <input
                        type="number"
                        step="0.01"
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        style={{ 
                          width: '80px', 
                          padding: '4px',
                          border: '1px solid #ddd',
                          borderRadius: '2px'
                        }}
                      />
                    ) : (
                      <span style={{ fontWeight: 'bold' }}>
                        ${parseFloat(invoice.TotalAmt).toFixed(2)}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      backgroundColor: getStatusColor(getStatusText(invoice.EmailStatus, invoice.Balance)),
                      color: 'white'
                    }}>
                      {getStatusText(invoice.EmailStatus, invoice.Balance)}
                    </span>
                  </td>
                  <td style={{ padding: '12px', fontSize: '14px', maxWidth: '300px' }}>
                    <div style={{ marginBottom: '8px' }}>
                      <strong>Total Items:</strong> {lineItems.totalItems}
                      {lineItems.deliveryItems.length > 0 && (
                        <span style={{ color: '#28a745', marginLeft: '5px' }}>
                          ({lineItems.deliveryItems.length} delivery)
                        </span>
                      )}
                      {lineItems.productItems.length > 0 && (
                        <span style={{ color: '#007bff', marginLeft: '5px' }}>
                          ({lineItems.productItems.length} product)
                        </span>
                      )}
                    </div>
                    
                    {/* Delivery Services */}
                    {lineItems.deliveryItems.length > 0 && (
                      <div style={{ marginBottom: '6px' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#28a745', marginBottom: '4px' }}>
                          🚚 Delivery Services:
                        </div>
                        {lineItems.deliveryItems.map((item, idx) => {
                          const editKey = `${invoice.Id}-${item.index - 1}`;
                          const isEditing = editingLineItem === editKey;
                          
                          return (
                            <div key={idx} style={{ 
                              fontSize: '11px', 
                              paddingLeft: '10px', 
                              marginBottom: '6px',
                              borderLeft: '2px solid #28a745',
                              paddingBottom: '4px',
                              backgroundColor: isEditing ? '#f0f8f0' : 'transparent',
                              padding: isEditing ? '8px' : '2px 0 2px 10px',
                              borderRadius: isEditing ? '4px' : '0'
                            }}>
                              {isEditing ? (
                                <div style={{ fontSize: '12px' }}>
                                  <div style={{ marginBottom: '4px' }}>
                                    <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Transaction Value ($):</label>
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={editLineItemData.transactionValue || 0}
                                      onChange={(e) => setEditLineItemData({
                                        ...editLineItemData,
                                        transactionValue: parseFloat(e.target.value) || 0,
                                        commissionRate: parseFloat(e.target.value) < 50 ? 15 : parseFloat(e.target.value) < 100 ? 12 : 10
                                      })}
                                      style={{ width: '80px', padding: '2px', fontSize: '11px' }}
                                    />
                                  </div>
                                  <div style={{ marginBottom: '4px' }}>
                                    <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Delivery Date:</label>
                                    <input
                                      type="date"
                                      value={editLineItemData.deliveryDate || ''}
                                      onChange={(e) => setEditLineItemData({
                                        ...editLineItemData,
                                        deliveryDate: e.target.value
                                      })}
                                      style={{ width: '120px', padding: '2px', fontSize: '11px' }}
                                    />
                                  </div>
                                  <div style={{ marginBottom: '4px' }}>
                                    <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Delivery Recipient:</label>
                                    <input
                                      type="text"
                                      value={editLineItemData.deliveryRecipient || ''}
                                      onChange={(e) => setEditLineItemData({
                                        ...editLineItemData,
                                        deliveryRecipient: e.target.value
                                      })}
                                      style={{ width: '150px', padding: '2px', fontSize: '11px' }}
                                    />
                                  </div>
                                  <div style={{ marginTop: '6px' }}>
                                    <button
                                      onClick={() => handleSaveLineItem(invoice.Id, item.index - 1)}
                                      style={{
                                        backgroundColor: '#28a745',
                                        color: 'white',
                                        border: 'none',
                                        padding: '2px 6px',
                                        borderRadius: '2px',
                                        fontSize: '10px',
                                        marginRight: '4px',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={handleCancelLineItemEdit}
                                      style={{
                                        backgroundColor: '#6c757d',
                                        color: 'white',
                                        border: 'none',
                                        padding: '2px 6px',
                                        borderRadius: '2px',
                                        fontSize: '10px',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                      <div>
                                        <strong>${item.transactionValue.toFixed(2)}</strong> transaction 
                                        @ {item.commissionRate}% = <strong>${item.amount.toFixed(2)}</strong>
                                      </div>
                                      <div style={{ color: '#666' }}>
                                        {item.deliveryDate && <span>📅 {item.deliveryDate} | </span>}
                                        To: {item.deliveryRecipient}
                                      </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                      <button
                                        onClick={() => handleEditLineItem(invoice.Id, item.index - 1, item)}
                                        style={{
                                          backgroundColor: '#007bff',
                                          color: 'white',
                                          border: 'none',
                                          padding: '2px 4px',
                                          borderRadius: '2px',
                                          fontSize: '9px',
                                          cursor: 'pointer'
                                        }}
                                      >
                                        Edit
                                      </button>
                                      <button
                                        onClick={() => handleDeleteLineItem(invoice.Id, item.index - 1, `Delivery to ${item.deliveryRecipient}`)}
                                        style={{
                                          backgroundColor: '#dc3545',
                                          color: 'white',
                                          border: 'none',
                                          padding: '2px 4px',
                                          borderRadius: '2px',
                                          fontSize: '9px',
                                          cursor: 'pointer'
                                        }}
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    
                    {/* Product Sales */}
                    {lineItems.productItems.length > 0 && (
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#007bff', marginBottom: '4px' }}>
                          📦 Product Sales:
                        </div>
                        {lineItems.productItems.map((item, idx) => {
                          const editKey = `${invoice.Id}-${item.index - 1}`;
                          const isEditing = editingLineItem === editKey;
                          
                          return (
                            <div key={idx} style={{ 
                              fontSize: '11px', 
                              paddingLeft: '10px', 
                              marginBottom: '6px',
                              borderLeft: '2px solid #007bff',
                              paddingBottom: '4px',
                              backgroundColor: isEditing ? '#f0f4f8' : 'transparent',
                              padding: isEditing ? '8px' : '2px 0 2px 10px',
                              borderRadius: isEditing ? '4px' : '0'
                            }}>
                              {isEditing ? (
                                <div style={{ fontSize: '12px' }}>
                                  <div style={{ marginBottom: '4px' }}>
                                    <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Quantity:</label>
                                    <input
                                      type="number"
                                      min="1"
                                      value={editLineItemData.quantity || 1}
                                      onChange={(e) => setEditLineItemData({
                                        ...editLineItemData,
                                        quantity: parseInt(e.target.value) || 1,
                                        amount: (editLineItemData.unitPrice || 0) * (parseInt(e.target.value) || 1)
                                      })}
                                      style={{ width: '60px', padding: '2px', fontSize: '11px' }}
                                    />
                                  </div>
                                  <div style={{ marginBottom: '4px' }}>
                                    <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Unit Price ($):</label>
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={editLineItemData.unitPrice || 0}
                                      onChange={(e) => setEditLineItemData({
                                        ...editLineItemData,
                                        unitPrice: parseFloat(e.target.value) || 0,
                                        amount: (parseFloat(e.target.value) || 0) * (editLineItemData.quantity || 1)
                                      })}
                                      style={{ width: '80px', padding: '2px', fontSize: '11px' }}
                                    />
                                  </div>
                                  <div style={{ marginBottom: '4px' }}>
                                    <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Description:</label>
                                    <input
                                      type="text"
                                      value={editLineItemData.description || ''}
                                      onChange={(e) => setEditLineItemData({
                                        ...editLineItemData,
                                        description: e.target.value
                                      })}
                                      style={{ width: '200px', padding: '2px', fontSize: '11px' }}
                                    />
                                  </div>
                                  <div style={{ marginTop: '6px' }}>
                                    <button
                                      onClick={() => handleSaveLineItem(invoice.Id, item.index - 1)}
                                      style={{
                                        backgroundColor: '#28a745',
                                        color: 'white',
                                        border: 'none',
                                        padding: '2px 6px',
                                        borderRadius: '2px',
                                        fontSize: '10px',
                                        marginRight: '4px',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={handleCancelLineItemEdit}
                                      style={{
                                        backgroundColor: '#6c757d',
                                        color: 'white',
                                        border: 'none',
                                        padding: '2px 6px',
                                        borderRadius: '2px',
                                        fontSize: '10px',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                      <div>
                                        {item.quantity}x <strong>${item.unitPrice.toFixed(2)}</strong> = <strong>${item.amount.toFixed(2)}</strong>
                                      </div>
                                      <div style={{ color: '#666', fontSize: '10px' }}>
                                        {item.description.substring(0, 50)}{item.description.length > 50 ? '...' : ''}
                                      </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                      <button
                                        onClick={() => handleEditLineItem(invoice.Id, item.index - 1, item)}
                                        style={{
                                          backgroundColor: '#007bff',
                                          color: 'white',
                                          border: 'none',
                                          padding: '2px 4px',
                                          borderRadius: '2px',
                                          fontSize: '9px',
                                          cursor: 'pointer'
                                        }}
                                      >
                                        Edit
                                      </button>
                                      <button
                                        onClick={() => handleDeleteLineItem(invoice.Id, item.index - 1, item.description)}
                                        style={{
                                          backgroundColor: '#dc3545',
                                          color: 'white',
                                          border: 'none',
                                          padding: '2px 4px',
                                          borderRadius: '2px',
                                          fontSize: '9px',
                                          cursor: 'pointer'
                                        }}
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {editingInvoice === invoice.Id ? (
                        <>
                          <button
                            onClick={() => handleSaveEdit(invoice.Id)}
                            style={{
                              backgroundColor: '#28a745',
                              color: 'white',
                              border: 'none',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            Save
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            style={{
                              backgroundColor: '#6c757d',
                              color: 'white',
                              border: 'none',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEdit(invoice)}
                            style={{
                              backgroundColor: '#007bff',
                              color: 'white',
                              border: 'none',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(invoice.Id)}
                            style={{
                              backgroundColor: '#dc3545',
                              color: 'white',
                              border: 'none',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ManageInvoices;
