import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import config from '../config';

const Logout = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loggedOut, setLoggedOut] = useState(false);

  useEffect(() => {
    handleLogout();
  }, []);

  const handleLogout = async () => {
    try {
      // Call backend logout endpoint
      const response = await fetch(`${config.API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        setLoggedOut(true);
        console.log('✅ Successfully logged out');
        // Redirect to auth page after 2 seconds
        setTimeout(() => {
          navigate('/');
        }, 2000);
      } else {
        throw new Error('Logout failed');
      }
    } catch (err) {
      console.error('Error logging out:', err);
      setError(err.message || 'Failed to logout. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
      <h2>Logout</h2>

      {loggedOut ? (
        <div style={{ 
          padding: '20px', 
          backgroundColor: '#e8f5e9', 
          borderRadius: '8px', 
          color: '#2e7d32',
          marginTop: '20px'
        }}>
          <h3>✅ Successfully logged out</h3>
          <p>You have been disconnected from QuickBooks.</p>
          <p style={{ fontSize: '14px', marginTop: '10px' }}>
            Redirecting to login page in 2 seconds...
          </p>
        </div>
      ) : error ? (
        <div style={{ 
          padding: '20px', 
          backgroundColor: '#ffebee', 
          borderRadius: '8px', 
          color: '#c62828',
          marginTop: '20px'
        }}>
          <h3>❌ Logout Failed</h3>
          <p>{error}</p>
          <button
            onClick={() => navigate('/')}
            style={{
              marginTop: '15px',
              padding: '10px 20px',
              backgroundColor: '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Return to Auth
          </button>
        </div>
      ) : (
        <div style={{ 
          padding: '20px', 
          backgroundColor: '#f5f5f5', 
          borderRadius: '8px',
          marginTop: '20px'
        }}>
          <p>Logging out...</p>
          <div style={{ marginTop: '10px' }}>
            <div style={{
              display: 'inline-block',
              width: '20px',
              height: '20px',
              border: '3px solid #f3f3f3',
              borderTop: '3px solid #1976d2',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}>
            </div>
          </div>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}

      <div style={{ 
        marginTop: '30px', 
        padding: '15px', 
        backgroundColor: '#e3f2fd', 
        borderRadius: '8px',
        fontSize: '14px',
        color: '#1565c0'
      }}>
        <strong>What happens when you logout:</strong>
        <ul style={{ textAlign: 'left', marginTop: '10px' }}>
          <li>Your QuickBooks session will be terminated</li>
          <li>You'll need to re-authenticate to use the app again</li>
          <li>Your local data is not affected</li>
        </ul>
      </div>
    </div>
  );
};

export default Logout;
