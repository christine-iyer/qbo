import React, { useState, useEffect } from 'react';
import customersToImport from './data.jsx'; // Import your Maine destinations data

const DeliveryDestinations = () => {
  const [destinations, setDestinations] = useState([]);
  const [selectedDestination, setSelectedDestination] = useState(null);
  const [qbCustomers, setQbCustomers] = useState([]);

  useEffect(() => {
    // Load Maine destinations from our data
    setDestinations(customersToImport);
    
    // Load QuickBooks customers for mapping
    fetchQBCustomers();
  }, []);

  const fetchQBCustomers = async () => {
    try {
      const response = await fetch('http://localhost:3001/customers');
      const data = await response.json();
      setQbCustomers(data.customers || []);
    } catch (error) {
      console.error('Error fetching QB customers:', error);
    }
  };

  const createInvoiceForDestination = (destination, qbCustomer) => {
    // Prepare invoice data with delivery information
    const invoiceData = {
      CustomerRef: { value: qbCustomer.Id },
      Line: [{
        Amount: 50.00, // Default delivery fee
        DetailType: "SalesItemLineDetail",
        Description: `Delivery Service to: ${destination.name}, ${destination.ShipAddr.Line1}, ${destination.ShipAddr.City}, ${destination.ShipAddr.CountrySubDivisionCode} ${destination.ShipAddr.PostalCode}`,
        SalesItemLineDetail: {
          ItemRef: { value: "1", name: "Services" }
        }
      }]
    };

    // Redirect to create invoice with pre-filled data
    const encodedData = encodeURIComponent(JSON.stringify(invoiceData));
    window.open(`/create-invoice?data=${encodedData}`, '_blank');
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h2>Maine Delivery Destinations Management</h2>
      
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f0f8ff', borderRadius: '8px' }}>
        <h3>📍 Available Destinations ({destinations.length})</h3>
        <p style={{ color: '#666', fontSize: '14px' }}>
          Since QuickBooks customer creation is currently experiencing API issues, 
          you can use this tool to manage delivery destinations and create invoices 
          using existing QuickBooks customers with custom delivery addresses.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Destinations List */}
        <div>
          <h3>🎯 Delivery Destinations</h3>
          <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '8px' }}>
            {destinations.map((dest, index) => (
              <div 
                key={index}
                style={{ 
                  padding: '12px', 
                  borderBottom: '1px solid #eee',
                  cursor: 'pointer',
                  backgroundColor: selectedDestination === dest ? '#e3f2fd' : 'white'
                }}
                onClick={() => setSelectedDestination(dest)}
              >
                <div style={{ fontWeight: 'bold', color: '#1976d2' }}>{dest.name}</div>
                <div style={{ fontSize: '13px', color: '#666' }}>
                  {dest.ShipAddr.Line1}, {dest.ShipAddr.City}, {dest.ShipAddr.CountrySubDivisionCode} {dest.ShipAddr.PostalCode}
                </div>
                {dest.phone && (
                  <div style={{ fontSize: '12px', color: '#888' }}>📞 {dest.phone}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Customer Mapping & Invoice Creation */}
        <div>
          <h3>🧾 Create Delivery Invoice</h3>
          {selectedDestination ? (
            <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '15px' }}>
              <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
                <strong>Selected Destination:</strong>
                <div style={{ marginTop: '5px' }}>
                  <div style={{ fontWeight: 'bold' }}>{selectedDestination.name}</div>
                  <div style={{ fontSize: '13px' }}>
                    {selectedDestination.ShipAddr.Line1}, {selectedDestination.ShipAddr.City}, {selectedDestination.ShipAddr.CountrySubDivisionCode} {selectedDestination.ShipAddr.PostalCode}
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Select QuickBooks Customer for Billing:
                </label>
                <select 
                  style={{ 
                    width: '100%', 
                    padding: '8px', 
                    borderRadius: '4px', 
                    border: '1px solid #ddd' 
                  }}
                  onChange={(e) => {
                    const customerId = e.target.value;
                    const customer = qbCustomers.find(c => c.Id === customerId);
                    if (customer) {
                      createInvoiceForDestination(selectedDestination, customer);
                    }
                  }}
                  defaultValue=""
                >
                  <option value="">Choose a customer...</option>
                  {qbCustomers.map(customer => (
                    <option key={customer.Id} value={customer.Id}>
                      {customer.DisplayName} - ${customer.Balance.toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ fontSize: '12px', color: '#666', fontStyle: 'italic' }}>
                💡 This will create an invoice for the selected QuickBooks customer 
                with delivery details for the Maine destination included in the line description.
              </div>
            </div>
          ) : (
            <div style={{ 
              padding: '40px', 
              textAlign: 'center', 
              color: '#666',
              border: '2px dashed #ddd',
              borderRadius: '8px'
            }}>
              ← Select a destination from the list to create an invoice
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#fff3e0', borderRadius: '8px' }}>
        <h4>🚚 How This Works:</h4>
        <ol style={{ margin: '10px 0', paddingLeft: '20px' }}>
          <li>Select a Maine destination from the list</li>
          <li>Choose an existing QuickBooks customer for billing</li>
          <li>An invoice will be created with the delivery address in the description</li>
          <li>Use the delivery analytics to track and plan your routes</li>
        </ol>
      </div>
    </div>
  );
};

export default DeliveryDestinations;
