
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import config from '../config';

const FetchCustomers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sampleStructure, setSampleStructure] = useState(null);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [editFormData, setEditFormData] = useState({});

  const fetchCustomers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Fetching from:', `${config.API_BASE_URL}/auth/customers`);
      const response = await axios.get(`${config.API_BASE_URL}/tortilla/customers`);
      console.log('Full API Response:', response);
      console.log('Response data:', response.data);
      console.log('Customers array:', response.data.customers);
      console.log('Number of customers:', response.data.customers?.length || 0);
      
      // Check if response is valid JSON with customers array
      if (response.data && typeof response.data === 'object') {
        setCustomers(response.data.customers || []);
        setSampleStructure(response.data.sampleStructure);
      } else {
        throw new Error('Invalid response format from API');
      }
    } catch (error) {
      console.error('Full error object:', error);
      console.error('Error response:', error.response);
      console.error('Error message:', error.message);
      
      // Check if we got HTML instead of JSON
      if (error.message.includes('Unexpected token') || error.message.includes('JSON')) {
        setError('API endpoint returned HTML instead of JSON. The backend may not be running or the endpoint is incorrect.');
      } else if (error.response?.status === 401) {
        setError('Not authenticated with QuickBooks. Please go to the QuickBooks Auth page and connect your account first.');
      } else {
        setError(error.response?.data?.error || error.message || 'Failed to fetch customers');
      }
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (customer) => {
    setEditingCustomer(customer.Id);
    setEditFormData({
      DisplayName: customer.DisplayName || '',
      CompanyName: customer.CompanyName || '',
      PrimaryEmailAddr: customer.PrimaryEmailAddr?.Address || '',
      PrimaryPhone: customer.PrimaryPhone?.FreeFormNumber || '',
      BillAddr: {
        Line1: customer.BillAddr?.Line1 || '',
        City: customer.BillAddr?.City || '',
        CountrySubDivisionCode: customer.BillAddr?.CountrySubDivisionCode || '',
        PostalCode: customer.BillAddr?.PostalCode || '',
        Country: customer.BillAddr?.Country || 'US'
      },
      ShipAddr: {
        Line1: customer.ShipAddr?.Line1 || '',
        City: customer.ShipAddr?.City || '',
        CountrySubDivisionCode: customer.ShipAddr?.CountrySubDivisionCode || '',
        PostalCode: customer.ShipAddr?.PostalCode || '',
        Country: customer.ShipAddr?.Country || 'US'
      }
    });
  };

  const cancelEdit = () => {
    setEditingCustomer(null);
    setEditFormData({});
  };

  const saveEdit = async (customerId) => {
    try {
      setLoading(true);
      
      const updateData = {
        DisplayName: editFormData.DisplayName,
        CompanyName: editFormData.CompanyName,
        PrimaryEmailAddr: editFormData.PrimaryEmailAddr ? { Address: editFormData.PrimaryEmailAddr } : undefined,
        PrimaryPhone: editFormData.PrimaryPhone ? { FreeFormNumber: editFormData.PrimaryPhone } : undefined,
        BillAddr: editFormData.BillAddr,
        ShipAddr: editFormData.ShipAddr
      };

      const response = await axios.put(`${config.API_BASE_URL}/customers/${customerId}`, updateData);
      
      if (response.data.success) {
        // Refresh the customer list
        await fetchCustomers();
        setEditingCustomer(null);
        setEditFormData({});
        setError(null);
        console.log('Customer updated successfully:', response.data);
      } else {
        throw new Error(response.data.error || 'Update failed');
      }
    } catch (error) {
      setError(error.response?.data?.error || error.message || 'Failed to update customer');
      console.error('Error updating customer:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddressChange = (addressType, field, value) => {
    setEditFormData(prev => ({
      ...prev,
      [addressType]: {
        ...prev[addressType],
        [field]: value
      }
    }));
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <h1>QuickBooks Customers</h1>
      
      <div style={{ background: '#e3f2fd', padding: '10px', borderRadius: '5px', marginBottom: '10px' }}>
        <small>
          <strong>API Endpoint:</strong> {config.API_BASE_URL}/customers
          <br />
          <strong>Status:</strong> {loading ? 'Loading...' : `Found ${customers.length} customers`}
          <br />
          <strong>Tip:</strong> Check browser console for detailed logs. If getting HTML instead of JSON, your backend URL may be incorrect.
        </small>
      </div>
      
      <button onClick={fetchCustomers} disabled={loading}>
        {loading ? 'Loading...' : 'Refresh Customers'}
      </button>
      
      {error && (
        <div style={{ color: 'red', margin: '10px 0' }}>
          <strong>Error:</strong> {error}
        </div>
      )}
      
      {customers.length > 0 && (
        <div>
          <h2>Found {customers.length} customers:</h2>
          
          <div style={{ marginBottom: '20px' }}>
            <h3>Customer List:</h3>
            {customers.map((customer, index) => (
              <div key={customer.Id} style={{ border: '1px solid #ccc', padding: '15px', margin: '10px 0', borderRadius: '8px' }}>
                {editingCustomer === customer.Id ? (
                  // Edit Mode
                  <div>
                    <h4 style={{ margin: '0 0 15px 0', color: '#1976d2' }}>✏️ Editing: {customer.DisplayName}</h4>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                      {/* Basic Info */}
                      <div>
                        <h5>Basic Information</h5>
                        <div style={{ marginBottom: '10px' }}>
                          <label style={{ display: 'block', marginBottom: '5px' }}>Display Name:</label>
                          <input
                            type="text"
                            value={editFormData.DisplayName}
                            onChange={(e) => handleInputChange('DisplayName', e.target.value)}
                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                          />
                        </div>
                        <div style={{ marginBottom: '10px' }}>
                          <label style={{ display: 'block', marginBottom: '5px' }}>Company Name:</label>
                          <input
                            type="text"
                            value={editFormData.CompanyName}
                            onChange={(e) => handleInputChange('CompanyName', e.target.value)}
                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                          />
                        </div>
                        <div style={{ marginBottom: '10px' }}>
                          <label style={{ display: 'block', marginBottom: '5px' }}>Email:</label>
                          <input
                            type="email"
                            value={editFormData.PrimaryEmailAddr}
                            onChange={(e) => handleInputChange('PrimaryEmailAddr', e.target.value)}
                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                          />
                        </div>
                        <div style={{ marginBottom: '10px' }}>
                          <label style={{ display: 'block', marginBottom: '5px' }}>Phone:</label>
                          <input
                            type="text"
                            value={editFormData.PrimaryPhone}
                            onChange={(e) => handleInputChange('PrimaryPhone', e.target.value)}
                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                          />
                        </div>
                      </div>

                      {/* Address Info */}
                      <div>
                        <h5>Shipping Address</h5>
                        <div style={{ marginBottom: '10px' }}>
                          <label style={{ display: 'block', marginBottom: '5px' }}>Street Address:</label>
                          <input
                            type="text"
                            value={editFormData.ShipAddr?.Line1 || ''}
                            onChange={(e) => handleAddressChange('ShipAddr', 'Line1', e.target.value)}
                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                          />
                        </div>
                        <div style={{ marginBottom: '10px' }}>
                          <label style={{ display: 'block', marginBottom: '5px' }}>City:</label>
                          <input
                            type="text"
                            value={editFormData.ShipAddr?.City || ''}
                            onChange={(e) => handleAddressChange('ShipAddr', 'City', e.target.value)}
                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                          />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <div>
                            <label style={{ display: 'block', marginBottom: '5px' }}>State:</label>
                            <input
                              type="text"
                              value={editFormData.ShipAddr?.CountrySubDivisionCode || ''}
                              onChange={(e) => handleAddressChange('ShipAddr', 'CountrySubDivisionCode', e.target.value)}
                              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', marginBottom: '5px' }}>ZIP Code:</label>
                            <input
                              type="text"
                              value={editFormData.ShipAddr?.PostalCode || ''}
                              onChange={(e) => handleAddressChange('ShipAddr', 'PostalCode', e.target.value)}
                              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        onClick={() => saveEdit(customer.Id)}
                        disabled={loading}
                        style={{
                          padding: '10px 20px',
                          backgroundColor: '#4caf50',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: loading ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {loading ? 'Saving...' : '💾 Save Changes'}
                      </button>
                      <button
                        onClick={cancelEdit}
                        disabled={loading}
                        style={{
                          padding: '10px 20px',
                          backgroundColor: '#f44336',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: loading ? 'not-allowed' : 'pointer'
                        }}
                      >
                        ❌ Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  // Display Mode
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <strong>#{index + 1} - {customer.DisplayName || customer.Name}</strong>
                        <br />
                        <small>ID: {customer.Id}</small>
                        {customer.CompanyName && <><br /><small>Company: {customer.CompanyName}</small></>}
                        {customer.PrimaryEmailAddr?.Address && (
                          <><br /><small>Email: {customer.PrimaryEmailAddr.Address}</small></>
                        )}
                        {customer.PrimaryPhone?.FreeFormNumber && (
                          <><br /><small>Phone: {customer.PrimaryPhone.FreeFormNumber}</small></>
                        )}
                        {customer.ShipAddr && (
                          <><br /><small>Address: {customer.ShipAddr.Line1}, {customer.ShipAddr.City}, {customer.ShipAddr.CountrySubDivisionCode} {customer.ShipAddr.PostalCode}</small></>
                        )}
                        {customer.Balance !== undefined && (
                          <><br /><small>Balance: ${customer.Balance.toFixed(2)}</small></>
                        )}
                      </div>
                      <button
                        onClick={() => startEdit(customer)}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#2196f3',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        ✏️ Edit
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {sampleStructure && (
            <div>
              <h3>Sample Customer JSON Structure:</h3>
              <pre style={{ 
                background: '#f5f5f5', 
                padding: '15px', 
                borderRadius: '5px', 
                overflow: 'auto',
                fontSize: '12px'
              }}>
                {JSON.stringify(sampleStructure, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
      
      {!loading && customers.length === 0 && !error && (
        <p>No customers found. Make sure you're authenticated and have customers in your QuickBooks sandbox.</p>
      )}
    </div>
  );
};

export default FetchCustomers;
