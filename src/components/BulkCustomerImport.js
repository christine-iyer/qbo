import React, { useState } from 'react';
import axios from 'axios';
import destinations from './data.jsx';

const BulkCustomerImport = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [results, setResults] = useState(null);

  const testSingleCustomer = async () => {
    setLoading(true);
    setMessage('');
    setResults(null);

    try {
      console.log('Testing single customer creation...');
      
      const response = await axios.post('http://localhost:3001/customers/test');

      console.log('Test customer response:', response.data);

      if (response.data.success) {
        setMessage('✅ Test customer created successfully!');
        setMessageType('success');
      } else {
        setMessage('❌ Test customer creation failed. Check console for details.');
        setMessageType('error');
      }

    } catch (error) {
      console.error('Error testing customer creation:', error);
      setMessage(error.response?.data?.error || 'Failed to test customer creation');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const importCustomers = async () => {
    setLoading(true);
    setMessage('');
    setResults(null);

    try {
      console.log('Starting bulk customer import...');
      
      // Send the destinations in the correct format
      // Your data is already in the right format with name and ShipAddr
      const customersToImport = destinations.map(dest => ({
        name: dest.name,
        ShipAddr: {
          Line1: dest.ShipAddr.Line1,
          City: dest.ShipAddr.City,
          CountrySubDivisionCode: dest.ShipAddr.CountrySubDivisionCode,
          PostalCode: dest.ShipAddr.PostalCode
        }
      }));

      const response = await axios.post('http://localhost:3001/customers/bulk', {
        customers: customersToImport
      });

      console.log('Import response:', response.data);

      if (response.data.results || response.data.errors) {
        const allResults = [...(response.data.results || []), ...(response.data.errors || [])];
        setResults(allResults);
        
        const successful = response.data.results?.length || 0;
        const failed = response.data.errors?.length || 0;
        
        setMessage(`✅ Import completed: ${successful} successful, ${failed} failed`);
        setMessageType(failed === 0 ? 'success' : failed === allResults.length ? 'error' : 'warning');
      } else {
        setMessage('✅ Import completed successfully');
        setMessageType('success');
      }

    } catch (error) {
      console.error('Error importing customers:', error);
      setMessage(error.response?.data?.error || 'Failed to import customers');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px' }}>
      <h1>🚚 Bulk Customer Import</h1>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        Import Maine-based destinations as customers into QuickBooks. This will add {destinations.length} new businesses to your customer database for delivery management.
      </p>

      {message && (
        <div style={{ 
          padding: '12px', 
          margin: '15px 0',
          backgroundColor: 
            messageType === 'success' ? '#d4edda' : 
            messageType === 'warning' ? '#fff3cd' :
            messageType === 'info' ? '#d1ecf1' : '#f8d7da',
          color: 
            messageType === 'success' ? '#155724' : 
            messageType === 'warning' ? '#856404' :
            messageType === 'info' ? '#0c5460' : '#721c24',
          border: `1px solid ${
            messageType === 'success' ? '#c3e6cb' : 
            messageType === 'warning' ? '#ffeaa7' :
            messageType === 'info' ? '#bee5eb' : '#f5c6cb'
          }`,
          borderRadius: '6px',
          fontSize: '14px',
          fontWeight: '500'
        }}>
          {message}
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ marginBottom: '25px', display: 'flex', gap: '12px' }}>
        <button 
          onClick={testSingleCustomer}
          disabled={loading}
          style={{
            backgroundColor: '#007bff',
            color: 'white',
            padding: '12px 24px',
            border: 'none',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: '600',
            opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? '🔄 Testing...' : '🧪 Test Single Customer'}
        </button>
        
        <button 
          onClick={importCustomers}
          disabled={loading}
          style={{
            backgroundColor: '#28a745',
            color: 'white',
            padding: '12px 24px',
            border: 'none',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: '600',
            opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? '📤 Importing...' : '📤 Import All Customers'}
        </button>
      </div>

      {/* Preview Section */}
      <div style={{ 
        backgroundColor: '#f8f9fa', 
        padding: '20px', 
        borderRadius: '8px', 
        marginBottom: '25px',
        border: '1px solid #dee2e6'
      }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#333', fontSize: '18px' }}>📋 Preview: Customers to Import</h3>
        <div style={{ fontSize: '14px', marginBottom: '15px', color: '#666' }}>
          <strong style={{ color: '#333' }}>Total customers to import:</strong> {destinations.length} Maine businesses
        </div>
        
        <div style={{ 
          maxHeight: '350px', 
          overflowY: 'auto',
          backgroundColor: 'white',
          border: '1px solid #dee2e6',
          borderRadius: '6px'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#495057' }}>Business Name</th>
                <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#495057' }}>Address</th>
                <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#495057' }}>City, State</th>
                <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#495057' }}>Zip Code</th>
              </tr>
            </thead>
            <tbody>
              {destinations.map((dest, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '10px 8px', fontSize: '13px', fontWeight: '500', color: '#333' }}>
                    {dest.name}
                  </td>
                  <td style={{ padding: '10px 8px', fontSize: '13px', color: '#666' }}>
                    {dest.ShipAddr.Line1}
                  </td>
                  <td style={{ padding: '10px 8px', fontSize: '13px', color: '#666' }}>
                    {dest.ShipAddr.City}, {dest.ShipAddr.CountrySubDivisionCode}
                  </td>
                  <td style={{ padding: '10px 8px', fontSize: '13px', color: '#666' }}>
                    {dest.ShipAddr.PostalCode}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Results Section */}
      {results && (
        <div style={{ 
          backgroundColor: '#f8f9fa', 
          padding: '20px', 
          borderRadius: '8px',
          border: '1px solid #dee2e6'
        }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#333', fontSize: '18px' }}>📊 Import Results</h3>
          
          <div style={{ 
            maxHeight: '400px', 
            overflowY: 'auto',
            backgroundColor: 'white',
            border: '1px solid #dee2e6',
            borderRadius: '6px'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#495057' }}>Customer Name</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#495057' }}>Status</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#495057' }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '10px 8px', fontSize: '13px', fontWeight: '500', color: '#333' }}>
                      {result.originalName || result.name}
                    </td>
                    <td style={{ padding: '10px 8px', fontSize: '13px' }}>
                      <span style={{
                        color: result.success ? '#28a745' : '#dc3545',
                        fontWeight: 'bold'
                      }}>
                        {result.success ? '✅ Success' : '❌ Failed'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 8px', fontSize: '12px', color: '#666' }}>
                      {result.success ? (
                        <span style={{ color: '#28a745' }}>
                          ID: {result.customer?.Id || result.id || 'Created'}
                        </span>
                      ) : (
                        <span style={{ color: '#dc3545' }}>
                          {result.error?.Error?.[0]?.Detail || result.error || 'Unknown error'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkCustomerImport;
