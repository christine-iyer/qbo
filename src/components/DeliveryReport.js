import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const DeliveryReport = () => {
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  
  // Date filter state
  const [startDate, setStartDate] = useState(() => {
    // Default to today
    return new Date().toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    // Default to the upcoming Friday
    const today = new Date();
    const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 5 = Friday, 6 = Saturday
    
    // Calculate days until next Friday (5)
    let daysUntilFriday;
    if (currentDay <= 5) {
      // If it's Sunday through Friday, get the next Friday
      daysUntilFriday = 5 - currentDay;
    } else {
      // If it's Saturday, get Friday of next week
      daysUntilFriday = 6; // Saturday to Friday is 6 days
    }
    
    // If today is Friday, get next Friday
    if (daysUntilFriday === 0) {
      daysUntilFriday = 7;
    }
    
    const upcomingFriday = new Date(today);
    upcomingFriday.setDate(today.getDate() + daysUntilFriday);
    
    return upcomingFriday.toISOString().split('T')[0];
  });
  
  // Report data
  const [deliveryReport, setDeliveryReport] = useState([]);
  const [totalDeliveries, setTotalDeliveries] = useState(0);
  const [totalCommission, setTotalCommission] = useState(0);
  const [uniqueBusinesses, setUniqueBusinesses] = useState(0);
  
  // Editing state for delivery transactions
  const [editingDelivery, setEditingDelivery] = useState(null);
  const [editDeliveryData, setEditDeliveryData] = useState({});
  
  // Map state
  const [showMap, setShowMap] = useState(false);
  const [mapData, setMapData] = useState([]);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [routeData, setRouteData] = useState(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [showRoute, setShowRoute] = useState(false);

  // Starting location (1 Hacker Way, Menlo Park, CA)
  const START_LOCATION = {
    lat: 37.4846,
    lng: -122.1495,
    name: "1 Hacker Way, Menlo Park, CA 94025",
    address: "Starting Point"
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch both invoices and customers
  const fetchData = async () => {
    setLoading(true);
    setMessage('');
    try {
      // Fetch both invoices and customers in parallel
      const [invoicesResponse, customersResponse] = await Promise.all([
        axios.get('http://localhost:3001/invoices'),
        axios.get('http://localhost:3001/customers')
      ]);
      
      const invoicesData = invoicesResponse.data.invoices || [];
      const customersData = customersResponse.data.customers || [];
      
      setInvoices(invoicesData);
      setCustomers(customersData);
      
      if (invoicesData.length > 0) {
        setMessage(`✅ Refreshed successfully! Loaded ${invoicesData.length} invoice(s) and ${customersData.length} customer(s) with latest address data.`);
        setMessageType('success');
      } else {
        setMessage('No invoices found. Create some invoices first!');
        setMessageType('info');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setMessage('Failed to fetch data. Please make sure you are authenticated with QuickBooks.');
      setMessageType('error');
      setInvoices([]);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (invoices.length > 0) {
      // Generate delivery report based on selected date range
      const deliveryData = {};
      let totalDeliveryCount = 0;
      let totalCommissionAmount = 0;

      // Create a map of customer names to their addresses for quick lookup
      const customerAddressMap = {};
      customers.forEach(customer => {
        const customerName = customer.DisplayName || customer.Name || '';
        if (customerName) {
          customerAddressMap[customerName.toLowerCase()] = customer.BillAddr || customer.ShipAddr || {};
        }
      });

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
                // Find the address for this business from the customer database
                const businessAddress = customerAddressMap[recipient.toLowerCase()] || {};
                
                deliveryData[recipient] = {
                  businessName: recipient,
                  deliveries: [],
                  totalDeliveries: 0,
                  totalTransactionValue: 0,
                  totalCommission: 0,
                  firstDelivery: deliveryDate,
                  lastDelivery: deliveryDate,
                  customerName: invoice.CustomerName,
                  ShipAddr: {
                    Line1: businessAddress.Line1 || '',
                    City: businessAddress.City || '',
                    CountrySubDivisionCode: businessAddress.CountrySubDivisionCode || '',
                    PostalCode: businessAddress.PostalCode || ''
                  },
                  customers: new Set([invoice.CustomerName]) // Track all customers
                };
              }
              
              // Update customer information
              deliveryData[recipient].customers.add(invoice.CustomerName);
              
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
                // Update customer name to the most recent delivery's customer
                deliveryData[recipient].customerName = invoice.CustomerName;
              }
            }
          }
        });
      });

      // Convert to array and sort by total commission (highest first)
      const reportArray = Object.values(deliveryData).map(business => ({
        ...business,
        customerName: business.customerName, 
        ShipAddr: business.ShipAddr,
        customerCount: business.customers.size,
        allCustomers: Array.from(business.customers).join(', '),
        customers: undefined // Remove Set object for clean JSON
      })).sort((a, b) => b.totalCommission - a.totalCommission);
      
      setDeliveryReport(reportArray);
      setTotalDeliveries(totalDeliveryCount);
      setTotalCommission(totalCommissionAmount);
      setUniqueBusinesses(reportArray.length);
    }
  }, [invoices, startDate, endDate, customers]);

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

  const refreshReport = () => {
    setMessage('Refreshing invoices and customer data...');
    setMessageType('info');
    fetchData();
  };

  // Geocode addresses for map display
  const geocodeAddresses = async () => {
    if (deliveryReport.length === 0) {
      setMessage('No delivery data to map');
      setMessageType('error');
      return;
    }

    setIsGeocoding(true);
    const mappedData = [];

    console.log(`Starting geocoding for ${deliveryReport.length} businesses:`);
    
    // Log all delivery report data for debugging
    deliveryReport.forEach((business, index) => {
      console.log(`Business ${index + 1}: ${business.businessName}`, {
        ShipAddr: business.ShipAddr,
        customerName: business.customerName,
        totalDeliveries: business.totalDeliveries
      });
    });
    
    for (const business of deliveryReport) {
      const { ShipAddr, businessName, totalDeliveries, totalCommission } = business;
      
      // DIRECT OVERRIDES: Force specific coordinates for known businesses
      const businessOverrides = {
        // Original California businesses
        'Cool Cars': { lat: 37.4636, lng: -122.4286, location: 'Half Moon Bay CA' },
        'Amy\'s Bird Sanctuary': { lat: 37.6017, lng: -122.4014, location: 'Bayshore CA' },
        'Jeff\'s Jalopies': { lat: 37.4530, lng: -122.1817, location: 'Menlo Park CA' },
        'Bill\'s Windsurf Shop': { lat: 37.4636, lng: -122.4286, location: 'Half Moon Bay CA' },
        'Freeman Sporting Goods': { lat: 37.4419, lng: -122.1430, location: 'Middlefield CA' },
        
        // New Maine businesses
        'Good Tern': { lat: 44.1037, lng: -69.1097, location: 'Rockland ME' },
        'Tenderwild': { lat: 44.1828, lng: -69.0712, location: 'Rockport ME' },
        'Fresh off the Farm': { lat: 44.1828, lng: -69.0712, location: 'Rockport ME' },
        'French and Braun': { lat: 44.2092, lng: -69.0653, location: 'Camden ME' },
        'Megunticook': { lat: 44.2092, lng: -69.0653, location: 'Camden ME' },
        'Owen\'s General Store': { lat: 44.2631, lng: -69.0331, location: 'Lincolnville ME' },
        '3 Bug Farm': { lat: 44.2631, lng: -69.0331, location: 'Lincolnville ME' },
        'Bahner Farm': { lat: 44.4292, lng: -69.0681, location: 'Belmont ME' },
        'Marsh River': { lat: 44.5353, lng: -69.1261, location: 'Brooks ME' },
        'Blue Hill Coop': { lat: 44.4081, lng: -68.5900, location: 'Blue Hill ME' },
        'Blue Hill Hannaford': { lat: 44.4081, lng: -68.5900, location: 'Blue Hill ME' },
        'Masons': { lat: 44.7967, lng: -68.7644, location: 'Brewer ME' },
        'Tiller and Rye': { lat: 44.7967, lng: -68.7644, location: 'Brewer ME' },
        'Natural Living Center': { lat: 44.8016, lng: -68.7712, location: 'Bangor ME' },
        'Uncle Dean\'s': { lat: 44.5467, lng: -69.6319, location: 'Waterville ME' },
        'Morning Glory': { lat: 43.9139, lng: -69.9653, location: 'Brunswick ME' },
        'Bath Natural Market': { lat: 43.9189, lng: -69.8208, location: 'Bath ME' },
        'Belfast Co-op': { lat: 44.4261, lng: -69.0064, location: 'Belfast ME' },
        'Rising Tide': { lat: 44.0331, lng: -69.5156, location: 'Damariscotta ME' }
      };
      
      // Check if this business needs a direct override
      const override = businessOverrides[businessName];
      if (override) {
        console.log(`DIRECT OVERRIDE: Forcing ${businessName} to ${override.location} coordinates`);
        
        // Add small random offset to prevent exact overlap with other businesses
        const offsetRange = 0.005; // About 500 meters
        const latOffset = (Math.random() - 0.5) * offsetRange;
        const lngOffset = (Math.random() - 0.5) * offsetRange;
        
        // Check if there are other businesses already mapped in the same area
        const sameAreaBusinesses = mappedData.filter(existing => 
          Math.abs(existing.lat - override.lat) < 0.01 && 
          Math.abs(existing.lng - override.lng) < 0.01
        );
        
        const locationData = {
          lat: override.lat + latOffset,
          lng: override.lng + lngOffset,
          businessName,
          address: sameAreaBusinesses.length > 0 
            ? `${businessName}, ${override.location} (${sameAreaBusinesses.length + 1} of ${Object.values(businessOverrides).filter(b => b.location === override.location).length} businesses in area)`
            : `${businessName}, ${override.location} (forced coordinates)`,
          totalDeliveries,
          totalCommission,
          areaBusinessCount: sameAreaBusinesses.length + 1
        };
        mappedData.push(locationData);
        console.log(`FORCED ${businessName} location added with offset:`, locationData);
        continue; // Skip all geocoding attempts for this business
      }
      
      const fullAddress = `${ShipAddr.Line1 || ''} ${ShipAddr.City || ''} ${ShipAddr.CountrySubDivisionCode || ''} ${ShipAddr.PostalCode || ''}`.trim();
      
      console.log(`Geocoding ${businessName}: "${fullAddress}"`);
      console.log(`Address components:`, ShipAddr);
      
      // Try full address first, then fallback to business name
      let searchQuery = fullAddress;
      let addressToDisplay = fullAddress;
      
      if (!fullAddress || fullAddress.length <= 3) {
        // Fallback to business name if address is insufficient
        searchQuery = businessName;
        addressToDisplay = `${businessName} (using business name)`;
        console.log(`Using business name as fallback: "${searchQuery}"`);
      }
      
      if (searchQuery && searchQuery.length > 2) {
        try {
          // Using free Nominatim geocoding service (no API key required)
          let response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`);
          let data = await response.json();
          
          console.log(`Geocoding result for ${businessName}:`, data);
          
          // If full address fails, try just city and state
          if (!data || data.length === 0) {
            const cityState = `${ShipAddr.City || ''} ${ShipAddr.CountrySubDivisionCode || ''}`.trim();
            if (cityState && cityState.length > 3) {
              console.log(`Trying city/state fallback for ${businessName}: "${cityState}"`);
              response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityState)}&limit=1`);
              data = await response.json();
              console.log(`City/state geocoding result for ${businessName}:`, data);
              
              if (data && data.length > 0) {
                addressToDisplay = `${cityState} (city center)`;
              }
            }
          }
          
          // If city/state fails, try just the business name
          if (!data || data.length === 0) {
            console.log(`Trying business name fallback for ${businessName}: "${businessName}"`);
            response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(businessName)}&limit=1`);
            data = await response.json();
            console.log(`Business name geocoding result for ${businessName}:`, data);
            
            if (data && data.length > 0) {
              addressToDisplay = `${businessName} (business search)`;
            }
          }
          
          // If all else fails, place near the city center with some randomization
          if (!data || data.length === 0) {
            const cityState = `${ShipAddr.City || ''} ${ShipAddr.CountrySubDivisionCode || ''}`.trim();
            
            // Special case for Cool Cars - try specific fallback
            if (businessName === 'Cool Cars' || businessName.includes('Cool Cars')) {
              console.log(`Special handling for Cool Cars business`);
              // Try to geocode "Cool Cars Half Moon Bay CA" specifically
              const specialQuery = 'Cool Cars Half Moon Bay CA';
              console.log(`Trying special query for Cool Cars: "${specialQuery}"`);
              response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(specialQuery)}&limit=1`);
              data = await response.json();
              console.log(`Special Cool Cars geocoding result:`, data);
              
              if (data && data.length > 0) {
                addressToDisplay = `Cool Cars, Half Moon Bay CA (special search)`;
              } else {
                // If that fails, use Half Moon Bay coordinates with offset
                console.log(`Using Half Moon Bay coordinates for Cool Cars`);
                const randomOffset = 0.01;
                const lat = 37.4636 + (Math.random() - 0.5) * randomOffset;
                const lng = -122.4286 + (Math.random() - 0.5) * randomOffset;
                
                const locationData = {
                  lat,
                  lng,
                  businessName,
                  address: `Cool Cars, Half Moon Bay CA (default location)`,
                  totalDeliveries,
                  totalCommission
                };
                mappedData.push(locationData);
                console.log(`Added Cool Cars with default Half Moon Bay location:`, locationData);
                continue; // Skip the normal processing below
              }
            }
            
            if (cityState) {
              console.log(`Using approximate location for ${businessName} near ${cityState}`);
              // Approximate coordinates for some common CA cities
              const approximateLocations = {
                'Half Moon Bay CA': { lat: 37.4636, lng: -122.4286 },
                'Bayshore CA': { lat: 37.6017, lng: -122.4014 }, // Near SF Bay
                'Menlo Park CA': { lat: 37.4530, lng: -122.1817 },
                'Middlefield CA': { lat: 37.4419, lng: -122.1430 }, // Near Palo Alto
                'Tucson AZ': { lat: 32.2217, lng: -111.9717 }
              };
              
              const location = approximateLocations[cityState];
              if (location) {
                // Check for existing businesses in this area
                const sameAreaBusinesses = mappedData.filter(existing => 
                  Math.abs(existing.lat - location.lat) < 0.01 && 
                  Math.abs(existing.lng - location.lng) < 0.01
                );
                
                // Add small random offset to avoid exact overlap
                const randomOffset = 0.005; // About 500 meters
                const lat = location.lat + (Math.random() - 0.5) * randomOffset;
                const lng = location.lng + (Math.random() - 0.5) * randomOffset;
                
                const locationData = {
                  lat,
                  lng,
                  businessName,
                  address: sameAreaBusinesses.length > 0 
                    ? `${addressToDisplay} (${sameAreaBusinesses.length + 1} of multiple businesses in ${cityState})`
                    : `${addressToDisplay} (approximate location)`,
                  totalDeliveries,
                  totalCommission,
                  areaBusinessCount: sameAreaBusinesses.length + 1
                };
                mappedData.push(locationData);
                console.log(`Added approximate location to map:`, locationData);
              }
            }
          } else if (data && data.length > 0) {
            const locationData = {
              lat: parseFloat(data[0].lat),
              lng: parseFloat(data[0].lon),
              businessName,
              address: addressToDisplay,
              totalDeliveries,
              totalCommission
            };
            mappedData.push(locationData);
            console.log(`Added to map:`, locationData);
          }
          
          // Add delay to respect rate limits
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`Error geocoding ${businessName}:`, error);
        }
      } else {
        console.log(`Skipping ${businessName} - no valid search query available`);
      }
    }

    console.log(`Final mapped data (${mappedData.length} locations):`, mappedData);
    setMapData(mappedData);
    setShowMap(true);
    setIsGeocoding(false);
    
    if (mappedData.length > 0) {
      setMessage(`Successfully mapped ${mappedData.length} delivery locations out of ${deliveryReport.length} businesses`);
      setMessageType('success');
    } else {
      setMessage('No addresses could be geocoded for mapping. Check browser console for details.');
      setMessageType('error');
    }
  };

  // Calculate optimal delivery route using nearest neighbor algorithm
  const calculateOptimalRoute = async () => {
    if (mapData.length === 0) {
      setMessage('No businesses mapped yet. Generate the map first.');
      setMessageType('error');
      return;
    }

    setIsCalculatingRoute(true);
    console.log('Calculating optimal route...');

    try {
      // Calculate distances between all points using Haversine formula
      const calculateDistance = (lat1, lng1, lat2, lng2) => {
        const R = 3959; // Earth's radius in miles
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
      };

      // Create route using nearest neighbor algorithm
      const unvisited = [...mapData];
      const route = [START_LOCATION];
      let currentLocation = START_LOCATION;
      let totalDistance = 0;
      let totalTime = 0; // Estimated driving time

      while (unvisited.length > 0) {
        // Find nearest unvisited business
        let nearestBusiness = null;
        let nearestDistance = Infinity;
        let nearestIndex = -1;

        unvisited.forEach((business, index) => {
          const distance = calculateDistance(
            currentLocation.lat, currentLocation.lng,
            business.lat, business.lng
          );
          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestBusiness = business;
            nearestIndex = index;
          }
        });

        if (nearestBusiness) {
          route.push(nearestBusiness);
          totalDistance += nearestDistance;
          totalTime += nearestDistance * 2.5; // Rough estimate: 2.5 minutes per mile in city driving
          currentLocation = nearestBusiness;
          unvisited.splice(nearestIndex, 1);
        }
      }

      // Add return trip to start
      const returnDistance = calculateDistance(
        currentLocation.lat, currentLocation.lng,
        START_LOCATION.lat, START_LOCATION.lng
      );
      totalDistance += returnDistance;
      totalTime += returnDistance * 2.5;
      route.push({...START_LOCATION, name: "Return to Start", address: "End of Route"});

      const routeInfo = {
        route,
        totalDistance: totalDistance.toFixed(1),
        totalTime: Math.round(totalTime),
        businessCount: mapData.length
      };

      setRouteData(routeInfo);
      setShowRoute(true);
      
      console.log('Optimal route calculated:', routeInfo);
      
      setMessage(`Route calculated: ${routeInfo.totalDistance} miles, ~${routeInfo.totalTime} minutes for ${routeInfo.businessCount} businesses`);
      setMessageType('success');

    } catch (error) {
      console.error('Error calculating route:', error);
      setMessage('Failed to calculate route');
      setMessageType('error');
    } finally {
      setIsCalculatingRoute(false);
    }
  };

  const exportToCSV = () => {
    if (deliveryReport.length === 0) {
      setMessage('No data to export');
      setMessageType('error');
      return;
    }

    const csvHeaders = 'Business Name,Delivery Address,Total Deliveries,Total Transaction Value,Total Commission,First Delivery,Last Delivery,Customer Name\n';
    const csvData = deliveryReport.map(business => {
      const addressLine = `${business.ShipAddr.Line1 || ''} ${business.ShipAddr.City || ''} ${business.ShipAddr.CountrySubDivisionCode || ''} ${business.ShipAddr.PostalCode || ''}`.trim();
      return `"${business.businessName}","${addressLine}",${business.totalDeliveries},$${business.totalTransactionValue.toFixed(2)},$${business.totalCommission.toFixed(2)},${business.firstDelivery},${business.lastDelivery},"${business.customerName}"`;
    }).join('\n');

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
      <p style={{ color: '#666', marginBottom: '15px' }}>
        Track businesses delivered to and analyze your delivery performance. Default range shows today through the upcoming Friday to help plan your delivery route.
      </p>
      <div style={{ 
        backgroundColor: '#e7f3ff', 
        border: '1px solid #b3d7ff', 
        padding: '10px', 
        borderRadius: '4px', 
        marginBottom: '20px',
        fontSize: '14px'
      }}>
        💡 <strong>Tip:</strong> If you've updated customer addresses in the "View Customers" tab, click "🔄 Refresh Data & Report" to see the latest address information in this report.
      </div>

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
              {loading ? 'Loading...' : '🔄 Refresh Data & Report'}
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
                fontSize: '14px',
                marginRight: '10px'
              }}
            >
              📊 Export CSV
            </button>
            <button 
              onClick={geocodeAddresses}
              disabled={deliveryReport.length === 0 || isGeocoding}
              style={{
                backgroundColor: '#28a745',
                color: 'white',
                padding: '8px 16px',
                border: 'none',
                borderRadius: '4px',
                cursor: deliveryReport.length === 0 || isGeocoding ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                marginRight: '10px'
              }}
            >
              {isGeocoding ? '📍 Mapping...' : '🗺️ Show Map'}
            </button>
            <button 
              onClick={calculateOptimalRoute}
              disabled={mapData.length === 0 || isCalculatingRoute}
              style={{
                backgroundColor: '#17a2b8',
                color: 'white',
                padding: '8px 16px',
                border: 'none',
                borderRadius: '4px',
                cursor: mapData.length === 0 || isCalculatingRoute ? 'not-allowed' : 'pointer',
                fontSize: '14px'
              }}
            >
              {isCalculatingRoute ? '🧭 Calculating...' : '🚗 Plan Route'}
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

      {/* Map View */}
      {showMap && mapData.length > 0 && (
        <div style={{ 
          marginBottom: '30px',
          backgroundColor: 'white',
          borderRadius: '8px',
          border: '1px solid #dee2e6',
          overflow: 'hidden'
        }}>
          <div style={{ 
            padding: '15px 20px', 
            backgroundColor: '#f8f9fa',
            borderBottom: '1px solid #dee2e6'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, color: '#333' }}>🗺️ Delivery Route Map</h3>
                {showRoute && routeData && (
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                    📍 Start: 1 Hacker Way, Menlo Park → {routeData.businessCount} businesses → Return
                    <br />
                    🚗 Total: {routeData.totalDistance} miles, ~{routeData.totalTime} minutes
                  </div>
                )}
              </div>
              <div>
                {showRoute && (
                  <button 
                    onClick={() => setShowRoute(false)}
                    style={{
                      backgroundColor: '#ffc107',
                      color: '#212529',
                      padding: '4px 8px',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      marginRight: '8px'
                    }}
                  >
                    Hide Route
                  </button>
                )}
                <button 
                  onClick={() => setShowMap(false)}
                  style={{
                    backgroundColor: '#6c757d',
                    color: 'white',
                    padding: '4px 8px',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  ✕ Close Map
                </button>
              </div>
            </div>
          </div>
          <div style={{ height: '500px' }}>
            <MapContainer 
              center={[START_LOCATION.lat, START_LOCATION.lng]} 
              zoom={11} 
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              {/* Starting location marker */}
              <Marker position={[START_LOCATION.lat, START_LOCATION.lng]}>
                <Popup>
                  <div style={{ minWidth: '220px' }}>
                    <strong style={{ color: '#dc3545', fontSize: '14px' }}>🏠 {START_LOCATION.name}</strong>
                    <div style={{ color: '#666', fontSize: '12px', margin: '5px 0' }}>
                      Starting Point / Return Destination
                    </div>
                    <div style={{ fontSize: '12px' }}>
                      📍 Your delivery route begins and ends here
                    </div>
                  </div>
                </Popup>
              </Marker>

              {/* Business markers */}
              {mapData.map((location, index) => (
                <Marker key={index} position={[location.lat, location.lng]}>
                  <Popup>
                    <div style={{ minWidth: '220px' }}>
                      <strong style={{ color: '#333', fontSize: '14px' }}>{location.businessName}</strong>
                      {showRoute && routeData && (
                        <div style={{ 
                          fontSize: '11px', 
                          color: '#28a745', 
                          fontWeight: 'bold',
                          backgroundColor: '#d4edda',
                          padding: '2px 6px',
                          borderRadius: '3px',
                          margin: '3px 0',
                          border: '1px solid #c3e6cb'
                        }}>
                          🗺️ Stop #{routeData.route.findIndex(stop => stop.businessName === location.businessName)} in route
                        </div>
                      )}
                      {location.areaBusinessCount > 1 && (
                        <div style={{ 
                          fontSize: '11px', 
                          color: '#ff6b35', 
                          fontWeight: 'bold',
                          backgroundColor: '#fff3cd',
                          padding: '2px 6px',
                          borderRadius: '3px',
                          margin: '3px 0',
                          border: '1px solid #ffeaa7'
                        }}>
                          📍 {location.areaBusinessCount} business{location.areaBusinessCount > 1 ? 'es' : ''} in this area
                        </div>
                      )}
                      <div style={{ color: '#666', fontSize: '12px', margin: '5px 0' }}>
                        {location.address}
                      </div>
                      <div style={{ fontSize: '12px' }}>
                        <div>📦 Deliveries: <strong>{location.totalDeliveries}</strong></div>
                        <div>💵 Commission: <strong>${location.totalCommission.toFixed(2)}</strong></div>
                      </div>
                      {location.areaBusinessCount > 1 && (
                        <div style={{ 
                          fontSize: '10px', 
                          color: '#666', 
                          marginTop: '8px',
                          fontStyle: 'italic'
                        }}>
                          💡 Tip: Multiple businesses nearby - markers spread for visibility
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Route line */}
              {showRoute && routeData && (
                <Polyline
                  positions={routeData.route.map(stop => [stop.lat, stop.lng])}
                  color="#007bff"
                  weight={3}
                  opacity={0.8}
                  dashArray="5, 10"
                />
              )}
            </MapContainer>
          </div>
        </div>
      )}

      {/* Route Details */}
      {showRoute && routeData && (
        <div style={{ 
          marginBottom: '30px',
          backgroundColor: 'white',
          borderRadius: '8px',
          border: '1px solid #dee2e6',
          overflow: 'hidden'
        }}>
          <div style={{ 
            padding: '15px 20px', 
            backgroundColor: '#e3f2fd',
            borderBottom: '1px solid #dee2e6'
          }}>
            <h3 style={{ margin: 0, color: '#1565c0' }}>🗺️ Optimized Delivery Route</h3>
            <div style={{ fontSize: '14px', color: '#424242', marginTop: '8px' }}>
              <strong>📊 Route Summary:</strong> {routeData.totalDistance} miles • ~{routeData.totalTime} minutes • {routeData.businessCount} stops
            </div>
          </div>
          <div style={{ padding: '20px' }}>
            <div style={{ display: 'grid', gap: '12px' }}>
              {routeData.route.map((stop, index) => {
                const isStart = index === 0;
                const isReturn = index === routeData.route.length - 1;
                const isBusiness = !isStart && !isReturn;
                
                return (
                  <div key={index} style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px',
                    backgroundColor: isStart ? '#f8d7da' : isReturn ? '#d4edda' : '#fff3cd',
                    borderLeft: `4px solid ${isStart ? '#dc3545' : isReturn ? '#28a745' : '#ffc107'}`,
                    borderRadius: '4px'
                  }}>
                    <div style={{
                      minWidth: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      backgroundColor: isStart ? '#dc3545' : isReturn ? '#28a745' : '#ffc107',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold',
                      fontSize: '14px',
                      marginRight: '15px'
                    }}>
                      {isStart ? '🏠' : isReturn ? '🏁' : index}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>
                        {isStart ? '🏠 Start' : isReturn ? '🏁 Return to Start' : `📦 Stop ${index}`}: {stop.businessName || stop.name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {stop.address || stop.name}
                      </div>
                      {isBusiness && (
                        <div style={{ fontSize: '11px', color: '#555', marginTop: '4px' }}>
                          📦 {stop.totalDeliveries} deliveries • 💵 ${stop.totalCommission.toFixed(2)} commission
                        </div>
                      )}
                    </div>
                    {index < routeData.route.length - 1 && (
                      <div style={{ color: '#666', fontSize: '12px', marginLeft: '10px' }}>
                        ⬇️
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            <div style={{ 
              marginTop: '20px', 
              padding: '15px', 
              backgroundColor: '#f8f9fa', 
              borderRadius: '6px',
              fontSize: '12px',
              color: '#666'
            }}>
              <strong>💡 Route Optimization Notes:</strong>
              <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                <li>Route calculated using nearest neighbor algorithm for efficiency</li>
                <li>Distances and times are estimates based on straight-line calculations</li>
                <li>Actual driving times may vary due to traffic, road conditions, and exact routes</li>
                <li>Consider checking real-time traffic before starting your deliveries</li>
              </ul>
            </div>
          </div>
        </div>
      )}

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
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>� Delivery Address</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>�👤 Customer</th>
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
                  <td style={{ padding: '12px', fontSize: '12px' }}>
                    <div style={{ lineHeight: '1.3' }}>
                      {business.ShipAddr.Line1 && (
                        <div>{business.ShipAddr.Line1}</div>
                      )}
                      {(business.ShipAddr.City || business.ShipAddr.CountrySubDivisionCode || business.ShipAddr.PostalCode) && (
                        <div>
                          {business.ShipAddr.City}
                          {business.ShipAddr.City && business.ShipAddr.CountrySubDivisionCode && ', '}
                          {business.ShipAddr.CountrySubDivisionCode} {business.ShipAddr.PostalCode}
                        </div>
                      )}
                      {!business.ShipAddr.Line1 && !business.ShipAddr.City && (
                        <div style={{ color: '#999', fontStyle: 'italic' }}>Address not available</div>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <div>
                      <div style={{ fontWeight: 'bold' }}>{business.customerName}</div>
                      {business.customerCount > 1 && (
                        <div style={{ fontSize: '11px', color: '#666' }}>
                          + {business.customerCount - 1} other customer{business.customerCount > 2 ? 's' : ''}
                        </div>
                      )}
                    </div>
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
                            <div style={{ color: '#666', fontSize: '10px' }}>👤 Customer: {delivery.customerName}</div>
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
