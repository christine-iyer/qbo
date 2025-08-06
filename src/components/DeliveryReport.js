import React, { useState, useEffect } from 'react';
import axios from 'axios';

const DeliveryReport = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  
  // Date filter state
  const [startDate, setStartDate] = useState(() => {
    // Default to 30 days ago
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    // Default to today
    return new Date().toISOString().split('T')[0];
  });
  
  // Report data
  const [deliveryReport, setDeliveryReport] = useState([]);
  const [totalDeliveries, setTotalDeliveries] = useState(0);
  const [totalCommission, setTotalCommission] = useState(0);
  const [uniqueBusinesses, setUniqueBusinesses] = useState(0);

  useEffect(() => {
    fetchInvoices();
  }, []);

  useEffect(() => {
    if (invoices.length > 0) {
      // Generate delivery report based on selected date range
      const deliveryData = {};
      let totalDeliveryCount = 0;
      let totalCommissionAmount = 0;

      invoices.forEach(invoice => {
        if (!invoice.Line || !Array.isArray(invoice.Line)) return;

        invoice.Line.forEach(line => {
          const description = line.Description || '';
          
          if (isDeliveryService(description)) {
            const deliveryDate = extractDeliveryDate(description);
            const recipient = extractDeliveryRecipient(description);
            const transactionValue = extractTransactionValue(description);
            const commissionRate = extractCommissionRate(description);
            const commissionAmount = line.Amount || 0;
            
            // Filter by date range
            if (deliveryDate && deliveryDate >= startDate && deliveryDate <= endDate) {
              totalDeliveryCount++;
              totalCommissionAmount += commissionAmount;
              
              // Group by recipient business
              if (!deliveryData[recipient]) {
                deliveryData[recipient] = {
                  businessName: recipient,
                  deliveries: [],
                  totalDeliveries: 0,
                  totalTransactionValue: 0,
                  totalCommission: 0,
                  firstDelivery: deliveryDate,
                  lastDelivery: deliveryDate,
                  customerName: invoice.CustomerName
                };
              }
              
              deliveryData[recipient].deliveries.push({
                date: deliveryDate,
                transactionValue,
                commissionRate,
                commissionAmount,
                invoiceNumber: invoice.DocNumber,
                customerName: invoice.CustomerName
              });
              
              deliveryData[recipient].totalDeliveries++;
              deliveryData[recipient].totalTransactionValue += transactionValue;
              deliveryData[recipient].totalCommission += commissionAmount;
              
              // Update date range for this business
              if (deliveryDate < deliveryData[recipient].firstDelivery) {
                deliveryData[recipient].firstDelivery = deliveryDate;
              }
              if (deliveryDate > deliveryData[recipient].lastDelivery) {
                deliveryData[recipient].lastDelivery = deliveryDate;
              }
            }
          }
        });
      });

      // Convert to array and sort by total commission (highest first)
      const reportArray = Object.values(deliveryData).sort((a, b) => b.totalCommission - a.totalCommission);
      
      setDeliveryReport(reportArray);
      setTotalDeliveries(totalDeliveryCount);
      setTotalCommission(totalCommissionAmount);
      setUniqueBusinesses(reportArray.length);
    }
  }, [invoices, startDate, endDate]);

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

  // Fetch invoices from QuickBooks API
  const fetchInvoices = async () => {
    setLoading(true);
    setMessage('');
    try {
      const response = await axios.get('http://localhost:3001/invoices');
      const invoices = response.data.invoices || [];
      setInvoices(invoices);
      
      if (invoices.length > 0) {
        setMessage(`Loaded ${invoices.length} invoice(s) for analysis`);
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

  const refreshReport = () => {
    fetchInvoices();
  };

  const exportToCSV = () => {
    if (deliveryReport.length === 0) {
      setMessage('No data to export');
      setMessageType('error');
      return;
    }

    const csvHeaders = 'Business Name,Total Deliveries,Total Transaction Value,Total Commission,First Delivery,Last Delivery,Customer Name\n';
    const csvData = deliveryReport.map(business => 
      `"${business.businessName}",${business.totalDeliveries},$${business.totalTransactionValue.toFixed(2)},$${business.totalCommission.toFixed(2)},${business.firstDelivery},${business.lastDelivery},"${business.customerName}"`
    ).join('\n');

    const csvContent = csvHeaders + csvData;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `delivery-report-${startDate}-to-${endDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    setMessage('Report exported successfully!');
    setMessageType('success');
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1400px' }}>
      <h1>Delivery Report</h1>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        Track businesses delivered to and analyze your delivery performance by date range.
      </p>

      {message && (
        <div style={{ 
          padding: '10px', 
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
          borderRadius: '4px'
        }}>
          {message}
        </div>
      )}

      {/* Date Range Filter */}
      <div style={{ 
        backgroundColor: '#f8f9fa', 
        padding: '20px', 
        borderRadius: '8px', 
        marginBottom: '20px',
        border: '1px solid #dee2e6'
      }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#333' }}>📅 Date Range Filter</h3>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>
              Start Date:
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ padding: '8px', fontSize: '14px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>
              End Date:
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ padding: '8px', fontSize: '14px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </div>
          <div style={{ marginTop: '20px' }}>
            <button 
              onClick={refreshReport}
              disabled={loading}
              style={{
                backgroundColor: '#28a745',
                color: 'white',
                padding: '8px 16px',
                border: 'none',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer',
                marginRight: '10px',
                fontSize: '14px'
              }}
            >
              {loading ? 'Loading...' : 'Refresh Report'}
            </button>
            <button 
              onClick={exportToCSV}
              disabled={deliveryReport.length === 0}
              style={{
                backgroundColor: '#007bff',
                color: 'white',
                padding: '8px 16px',
                border: 'none',
                borderRadius: '4px',
                cursor: deliveryReport.length === 0 ? 'not-allowed' : 'pointer',
                fontSize: '14px'
              }}
            >
              📊 Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Summary Statistics */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '15px', 
        marginBottom: '30px' 
      }}>
        <div style={{ 
          backgroundColor: '#e8f5e8', 
          padding: '20px', 
          borderRadius: '8px', 
          border: '1px solid #c3e6cb',
          textAlign: 'center'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#155724', fontSize: '24px' }}>
            {totalDeliveries}
          </h3>
          <p style={{ margin: 0, color: '#155724', fontWeight: 'bold' }}>Total Deliveries</p>
        </div>
        
        <div style={{ 
          backgroundColor: '#e3f2fd', 
          padding: '20px', 
          borderRadius: '8px', 
          border: '1px solid #bee5eb',
          textAlign: 'center'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#0c5460', fontSize: '24px' }}>
            {uniqueBusinesses}
          </h3>
          <p style={{ margin: 0, color: '#0c5460', fontWeight: 'bold' }}>Unique Businesses</p>
        </div>

        <div style={{ 
          backgroundColor: '#fff3cd', 
          padding: '20px', 
          borderRadius: '8px', 
          border: '1px solid #ffeaa7',
          textAlign: 'center'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#856404', fontSize: '24px' }}>
            ${totalCommission.toFixed(2)}
          </h3>
          <p style={{ margin: 0, color: '#856404', fontWeight: 'bold' }}>Total Commission</p>
        </div>
      </div>

      {/* Delivery Report Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div>Loading delivery report...</div>
        </div>
      ) : deliveryReport.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px',
          backgroundColor: '#f8f9fa',
          borderRadius: '4px',
          border: '1px solid #dee2e6'
        }}>
          <h3>No Deliveries Found</h3>
          <p>No deliveries found in the selected date range. Try adjusting your date filter or create some delivery invoices!</p>
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
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>🏢 Business Name</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>👤 Customer</th>
                <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>📦 Deliveries</th>
                <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #dee2e6' }}>💰 Total Value</th>
                <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #dee2e6' }}>💵 Commission</th>
                <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>📅 Date Range</th>
                <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>📊 Details</th>
              </tr>
            </thead>
            <tbody>
              {deliveryReport.map((business, index) => (
                <tr key={index} style={{ 
                  backgroundColor: index % 2 === 0 ? '#fff' : '#f8f9fa',
                  borderBottom: '1px solid #dee2e6'
                }}>
                  <td style={{ padding: '12px', fontWeight: 'bold' }}>
                    {business.businessName}
                  </td>
                  <td style={{ padding: '12px' }}>
                    {business.customerName}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <span style={{
                      backgroundColor: '#28a745',
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}>
                      {business.totalDeliveries}
                    </span>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>
                    ${business.totalTransactionValue.toFixed(2)}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', color: '#28a745' }}>
                    ${business.totalCommission.toFixed(2)}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center', fontSize: '12px' }}>
                    <div>{business.firstDelivery}</div>
                    <div style={{ color: '#666' }}>to</div>
                    <div>{business.lastDelivery}</div>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <details>
                      <summary style={{ 
                        cursor: 'pointer', 
                        backgroundColor: '#007bff', 
                        color: 'white', 
                        padding: '4px 8px', 
                        borderRadius: '4px',
                        border: 'none',
                        fontSize: '11px'
                      }}>
                        View Details
                      </summary>
                      <div style={{ 
                        marginTop: '10px', 
                        padding: '10px', 
                        backgroundColor: '#f8f9fa', 
                        borderRadius: '4px',
                        fontSize: '11px'
                      }}>
                        {business.deliveries.map((delivery, idx) => (
                          <div key={idx} style={{ 
                            marginBottom: '6px', 
                            paddingBottom: '6px', 
                            borderBottom: idx < business.deliveries.length - 1 ? '1px solid #dee2e6' : 'none'
                          }}>
                            <div><strong>📅 {delivery.date}</strong></div>
                            <div>💰 ${delivery.transactionValue.toFixed(2)} @ {delivery.commissionRate}% = ${delivery.commissionAmount.toFixed(2)}</div>
                            <div style={{ color: '#666' }}>📄 Invoice: {delivery.invoiceNumber}</div>
                          </div>
                        ))}
                      </div>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DeliveryReport;
