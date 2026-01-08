const quickbooksClient = require('../utils/quickbooksClient');

class Customer {
  static async getAll() {
    const data = await quickbooksClient.query('SELECT * FROM Customer');
    return data.QueryResponse?.Customer || [];
  }

  static async getById(customerId) {
    const data = await quickbooksClient.get(`customer/${customerId}`);
    return data.QueryResponse?.Customer?.[0] || data.Customer;
  }

  static async create(customerData) {
    const customerToCreate = {
      Name: customerData.Name.trim(),
      DisplayName: customerData.DisplayName || customerData.Name.trim(),
      Active: true,
      ...customerData
    };

    const data = await quickbooksClient.post('customer', customerToCreate);
    return data.QueryResponse?.Customer?.[0] || data.Customer;
  }

  static async update(customerId, customerData) {
    // First fetch current customer to get SyncToken
    const currentCustomer = await this.getById(customerId);
    
    if (!currentCustomer) {
      throw new Error('Customer not found');
    }

    const customerToUpdate = {
      ...currentCustomer,
      ...customerData,
      Id: customerId,
      SyncToken: currentCustomer.SyncToken
    };

    const data = await quickbooksClient.post('customer', customerToUpdate);
    return data.QueryResponse?.Customer?.[0] || data.Customer;
  }

  static async createBulk(customers) {
    const results = [];
    const errors = [];

    for (let i = 0; i < customers.length; i++) {
      const customer = customers[i];
      
      try {
        console.log(`Creating customer ${i + 1}/${customers.length}: ${customer.name}`);
        
        const cleanName = customer.name
          .replace(/[^\w\s\-.]/g, '')
          .replace(/\s+/g, ' ')
          .trim()
          .substring(0, 100);
        
        const qbCustomer = {
          Name: cleanName,
          DisplayName: cleanName,
          CompanyName: cleanName,
          Active: true
        };

        if (customer.ShipAddr && customer.ShipAddr.Line1 && customer.ShipAddr.City) {
          qbCustomer.BillAddr = {
            Line1: customer.ShipAddr.Line1,
            City: customer.ShipAddr.City,
            CountrySubDivisionCode: customer.ShipAddr.CountrySubDivisionCode || "ME",
            PostalCode: customer.ShipAddr.PostalCode,
            Country: "US"
          };
          qbCustomer.ShipAddr = { ...qbCustomer.BillAddr };
        }

        const createdCustomer = await this.create(qbCustomer);

        results.push({
          originalName: customer.name,
          success: true,
          customer: createdCustomer,
          id: createdCustomer.Id
        });

        console.log(`✅ Created customer: ${customer.name} (ID: ${createdCustomer.Id})`);
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        const errorMessage = error.response?.data?.Fault?.Error?.[0]?.Detail || 
                           error.response?.data?.Fault?.Error?.[0]?.code || 
                           error.message;
                           
        console.error(`❌ Failed to create customer ${customer.name}:`, errorMessage);
        
        errors.push({
          originalName: customer.name,
          success: false,
          error: errorMessage,
          details: error.response?.data?.Fault?.Error?.[0] || error.response?.data
        });
      }
    }

    return { results, errors };
  }
}

module.exports = Customer;
