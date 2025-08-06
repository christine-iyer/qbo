import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ItemsList = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const fetchItems = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      const response = await axios.get('http://localhost:3001/items');
      console.log('Items response:', response.data);
      setItems(response.data.items || []);
      setMessage(`Found ${response.data.count || 0} items`);
    } catch (error) {
      console.error('Error fetching items:', error);
      setMessage(`Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  return (
    <div style={{ padding: '20px', maxWidth: '800px' }}>
      <h2>QuickBooks Items/Products</h2>
      
      <button 
        onClick={fetchItems}
        disabled={loading}
        style={{
          backgroundColor: loading ? '#ccc' : '#007bff',
          color: 'white',
          padding: '10px 20px',
          border: 'none',
          borderRadius: '4px',
          fontSize: '14px',
          cursor: loading ? 'not-allowed' : 'pointer',
          marginBottom: '20px'
        }}
      >
        {loading ? 'Loading...' : 'Refresh Items'}
      </button>

      {message && (
        <div style={{ 
          padding: '10px', 
          margin: '10px 0',
          backgroundColor: message.includes('Error') ? '#f8d7da' : '#d4edda',
          color: message.includes('Error') ? '#721c24' : '#155724',
          border: `1px solid ${message.includes('Error') ? '#f5c6cb' : '#c3e6cb'}`,
          borderRadius: '4px'
        }}>
          {message}
        </div>
      )}

      {items.length > 0 ? (
        <div>
          <h3>Available Items ({items.length}):</h3>
          <div style={{ display: 'grid', gap: '10px' }}>
            {items.map((item, index) => (
              <div 
                key={item.Id || index} 
                style={{
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  padding: '15px',
                  backgroundColor: '#f9f9f9'
                }}
              >
                <div><strong>ID:</strong> {item.Id}</div>
                <div><strong>Name:</strong> {item.Name}</div>
                <div><strong>Type:</strong> {item.Type}</div>
                {item.Description && <div><strong>Description:</strong> {item.Description}</div>}
                {item.UnitPrice && <div><strong>Unit Price:</strong> ${item.UnitPrice}</div>}
                {item.QtyOnHand && <div><strong>Quantity on Hand:</strong> {item.QtyOnHand}</div>}
                <div><strong>Active:</strong> {item.Active ? 'Yes' : 'No'}</div>
                
                <details style={{ marginTop: '10px' }}>
                  <summary style={{ cursor: 'pointer' }}>Full Item Data</summary>
                  <pre style={{ fontSize: '12px', backgroundColor: '#fff', padding: '10px', overflow: 'auto' }}>
                    {JSON.stringify(item, null, 2)}
                  </pre>
                </details>
              </div>
            ))}
          </div>
        </div>
      ) : (
        !loading && message && !message.includes('Error') && (
          <div>No items found in QuickBooks.</div>
        )
      )}
    </div>
  );
};

export default ItemsList;
