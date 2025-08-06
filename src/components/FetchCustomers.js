
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const FetchCustomers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sampleStructure, setSampleStructure] = useState(null);

  const fetchCustomers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get('http://localhost:3001/customers');
      setCustomers(response.data.customers);
      setSampleStructure(response.data.sampleStructure);
      console.log('Customer data:', response.data);
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to fetch customers');
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <h1>QuickBooks Customers</h1>
      
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
              <div key={customer.Id} style={{ border: '1px solid #ccc', padding: '10px', margin: '5px 0' }}>
                <strong>#{index + 1} - {customer.Name}</strong>
                <br />
                <small>ID: {customer.Id}</small>
                {customer.CompanyName && <><br /><small>Company: {customer.CompanyName}</small></>}
                {customer.PrimaryEmailAddr?.Address && (
                  <><br /><small>Email: {customer.PrimaryEmailAddr.Address} City: {customer.ShipAddr?.City} State: {customer.ShipAddr?.CountrySubDivisionCode}</small></>
                )}
                {customer.BillAddr?.City && (
                  <><br /><small>Balance: {customer.Balance}</small></>
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
