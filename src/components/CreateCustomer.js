import React, { useState } from 'react';
import axios from 'axios';
import config from '../config';

const CreateCustomer = () => {
  const [customerData, setCustomerData] = useState({
    name: '',
    companyName: '',
    email: '',
    phone: '',
    billAddr: {
      line1: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'US'
    },
    shipAddr: {
      line1: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'US'
    }
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [section, field] = name.split('.');
      setCustomerData(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value
        }
      }));
    } else {
      setCustomerData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const copyBillToShip = () => {
    setCustomerData(prev => ({
      ...prev,
      shipAddr: { ...prev.billAddr }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      // Prepare customer data for QuickBooks API
      const qbCustomer = {
        Name: customerData.name.trim(),
      };

      // Add optional fields only if they have values
      if (customerData.companyName.trim()) {
        qbCustomer.CompanyName = customerData.companyName.trim();
      }

      if (customerData.email.trim()) {
        qbCustomer.PrimaryEmailAddr = {
          Address: customerData.email.trim()
        };
      }

      if (customerData.phone.trim()) {
        qbCustomer.PrimaryPhone = {
          FreeFormNumber: customerData.phone.trim()
        };
      }

      // Add billing address if any field is filled
      if (customerData.billAddr.line1 || customerData.billAddr.city) {
        qbCustomer.BillAddr = {};
        if (customerData.billAddr.line1) qbCustomer.BillAddr.Line1 = customerData.billAddr.line1;
        if (customerData.billAddr.city) qbCustomer.BillAddr.City = customerData.billAddr.city;
        if (customerData.billAddr.state) qbCustomer.BillAddr.CountrySubDivisionCode = customerData.billAddr.state;
        if (customerData.billAddr.postalCode) qbCustomer.BillAddr.PostalCode = customerData.billAddr.postalCode;
        if (customerData.billAddr.country) qbCustomer.BillAddr.Country = customerData.billAddr.country;
      }

      // Add shipping address if any field is filled
      if (customerData.shipAddr.line1 || customerData.shipAddr.city) {
        qbCustomer.ShipAddr = {};
        if (customerData.shipAddr.line1) qbCustomer.ShipAddr.Line1 = customerData.shipAddr.line1;
        if (customerData.shipAddr.city) qbCustomer.ShipAddr.City = customerData.shipAddr.city;
        if (customerData.shipAddr.state) qbCustomer.ShipAddr.CountrySubDivisionCode = customerData.shipAddr.state;
        if (customerData.shipAddr.postalCode) qbCustomer.ShipAddr.PostalCode = customerData.shipAddr.postalCode;
        if (customerData.shipAddr.country) qbCustomer.ShipAddr.Country = customerData.shipAddr.country;
      }

      console.log('Sending customer data:', JSON.stringify(qbCustomer, null, 2));

      const response = await axios.post(`${config.API_BASE_URL}/customers/create`, qbCustomer);

      if (response.data.success) {
        setMessage(`✅ Customer "${customerData.name}" created successfully! ID: ${response.data.customer.Id}`);
        setMessageType('success');
        
        // Reset form
        setCustomerData({
          name: '',
          companyName: '',
          email: '',
          phone: '',
          billAddr: { line1: '', city: '', state: '', postalCode: '', country: 'US' },
          shipAddr: { line1: '', city: '', state: '', postalCode: '', country: 'US' }
        });
      } else {
        setMessage('❌ Failed to create customer. Check console for details.');
        setMessageType('error');
      }

    } catch (error) {
      console.error('Error creating customer:', error);
      setMessage(error.response?.data?.error || 'Failed to create customer');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px' }}>
      <h1>🏪 Create New Customer</h1>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        Add a new customer to your QuickBooks database for delivery management.
      </p>

      {message && (
        <div style={{ 
          padding: '12px', 
          margin: '15px 0',
          backgroundColor: messageType === 'success' ? '#d4edda' : '#f8d7da',
          color: messageType === 'success' ? '#155724' : '#721c24',
          border: `1px solid ${messageType === 'success' ? '#c3e6cb' : '#f5c6cb'}`,
          borderRadius: '6px',
          fontSize: '14px',
          fontWeight: '500'
        }}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Basic Information */}
        <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px', border: '1px solid #dee2e6' }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#333' }}>Basic Information</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                Customer Name <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="text"
                name="name"
                value={customerData.name}
                onChange={handleInputChange}
                required
                placeholder="e.g., Down East Lobster Co"
                style={{ 
                  width: '100%', 
                  padding: '8px 12px', 
                  border: '1px solid #ddd', 
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                Company Name
              </label>
              <input
                type="text"
                name="companyName"
                value={customerData.companyName}
                onChange={handleInputChange}
                placeholder="e.g., Down East Lobster Co LLC"
                style={{ 
                  width: '100%', 
                  padding: '8px 12px', 
                  border: '1px solid #ddd', 
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                Email
              </label>
              <input
                type="email"
                name="email"
                value={customerData.email}
                onChange={handleInputChange}
                placeholder="contact@business.com"
                style={{ 
                  width: '100%', 
                  padding: '8px 12px', 
                  border: '1px solid #ddd', 
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                Phone
              </label>
              <input
                type="tel"
                name="phone"
                value={customerData.phone}
                onChange={handleInputChange}
                placeholder="(207) 555-0123"
                style={{ 
                  width: '100%', 
                  padding: '8px 12px', 
                  border: '1px solid #ddd', 
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>
        </div>

        {/* Billing Address */}
        <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px', border: '1px solid #dee2e6' }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#333' }}>Billing Address</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                Street Address
              </label>
              <input
                type="text"
                name="billAddr.line1"
                value={customerData.billAddr.line1}
                onChange={handleInputChange}
                placeholder="123 Harbor Way"
                style={{ 
                  width: '100%', 
                  padding: '8px 12px', 
                  border: '1px solid #ddd', 
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  City
                </label>
                <input
                  type="text"
                  name="billAddr.city"
                  value={customerData.billAddr.city}
                  onChange={handleInputChange}
                  placeholder="Bar Harbor"
                  style={{ 
                    width: '100%', 
                    padding: '8px 12px', 
                    border: '1px solid #ddd', 
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  State
                </label>
                <input
                  type="text"
                  name="billAddr.state"
                  value={customerData.billAddr.state}
                  onChange={handleInputChange}
                  placeholder="ME"
                  maxLength="2"
                  style={{ 
                    width: '100%', 
                    padding: '8px 12px', 
                    border: '1px solid #ddd', 
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  ZIP Code
                </label>
                <input
                  type="text"
                  name="billAddr.postalCode"
                  value={customerData.billAddr.postalCode}
                  onChange={handleInputChange}
                  placeholder="04609"
                  style={{ 
                    width: '100%', 
                    padding: '8px 12px', 
                    border: '1px solid #ddd', 
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Shipping Address */}
        <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px', border: '1px solid #dee2e6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: '0', color: '#333' }}>Shipping Address</h3>
            <button
              type="button"
              onClick={copyBillToShip}
              style={{
                backgroundColor: '#6c757d',
                color: 'white',
                padding: '6px 12px',
                border: 'none',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Copy from Billing
            </button>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                Street Address
              </label>
              <input
                type="text"
                name="shipAddr.line1"
                value={customerData.shipAddr.line1}
                onChange={handleInputChange}
                placeholder="123 Harbor Way"
                style={{ 
                  width: '100%', 
                  padding: '8px 12px', 
                  border: '1px solid #ddd', 
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  City
                </label>
                <input
                  type="text"
                  name="shipAddr.city"
                  value={customerData.shipAddr.city}
                  onChange={handleInputChange}
                  placeholder="Bar Harbor"
                  style={{ 
                    width: '100%', 
                    padding: '8px 12px', 
                    border: '1px solid #ddd', 
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  State
                </label>
                <input
                  type="text"
                  name="shipAddr.state"
                  value={customerData.shipAddr.state}
                  onChange={handleInputChange}
                  placeholder="ME"
                  maxLength="2"
                  style={{ 
                    width: '100%', 
                    padding: '8px 12px', 
                    border: '1px solid #ddd', 
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  ZIP Code
                </label>
                <input
                  type="text"
                  name="shipAddr.postalCode"
                  value={customerData.shipAddr.postalCode}
                  onChange={handleInputChange}
                  placeholder="04609"
                  style={{ 
                    width: '100%', 
                    padding: '8px 12px', 
                    border: '1px solid #ddd', 
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div style={{ textAlign: 'center' }}>
          <button
            type="submit"
            disabled={loading || !customerData.name.trim()}
            style={{
              backgroundColor: '#28a745',
              color: 'white',
              padding: '12px 30px',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading || !customerData.name.trim() ? 'not-allowed' : 'pointer',
              opacity: loading || !customerData.name.trim() ? 0.7 : 1
            }}
          >
            {loading ? '⏳ Creating...' : '🏪 Create Customer'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateCustomer;
