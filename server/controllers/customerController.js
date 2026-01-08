const Customer = require('../models/Customer');
const quickbooksClient = require('../utils/quickbooksClient');
const ResponseHandler = require('../utils/responseHandler');

class CustomerController {
  async getAll(req, res) {
    if (!quickbooksClient.isAuthenticated()) {
      return ResponseHandler.notAuthenticated(res);
    }

    try {
      const customers = await Customer.getAll();
      
      console.log('Customers fetched successfully. Count:', customers.length);
      if (customers.length > 0) {
        console.log('Sample customer structure:', JSON.stringify(customers[0], null, 2));
      }

      return res.json({
        customers,
        count: customers.length,
        sampleStructure: customers[0] || null
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async create(req, res) {
    if (!quickbooksClient.isAuthenticated()) {
      return ResponseHandler.notAuthenticated(res);
    }

    const customerData = req.body;
    
    console.log('Creating single customer');
    console.log('Customer data received:', JSON.stringify(customerData, null, 2));

    if (!customerData.Name || !customerData.Name.trim()) {
      return ResponseHandler.badRequest(res, 'Customer name is required.');
    }

    try {
      const createdCustomer = await Customer.create(customerData);
      
      console.log(`✅ Created customer: ${customerData.Name} (ID: ${createdCustomer.Id})`);

      return ResponseHandler.success(res, {
        customer: createdCustomer
      }, `Customer "${customerData.Name}" created successfully`);
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async update(req, res) {
    if (!quickbooksClient.isAuthenticated()) {
      return ResponseHandler.notAuthenticated(res);
    }

    const customerId = req.params.id;
    const customerData = req.body;
    
    console.log('Updating customer ID:', customerId);
    console.log('Update data received:', JSON.stringify(customerData, null, 2));

    try {
      const updatedCustomer = await Customer.update(customerId, customerData);
      
      console.log(`✅ Updated customer: ${updatedCustomer.DisplayName} (ID: ${customerId})`);

      return ResponseHandler.success(res, {
        customer: updatedCustomer
      }, `Customer "${updatedCustomer.DisplayName}" updated successfully`);
    } catch (error) {
      if (error.message === 'Customer not found') {
        return ResponseHandler.notFound(res, 'Customer not found');
      }
      return ResponseHandler.error(res, error);
    }
  }

  async createBulk(req, res) {
    if (!quickbooksClient.isAuthenticated()) {
      return ResponseHandler.notAuthenticated(res);
    }

    const { customers } = req.body;
    
    console.log('Creating bulk customers');
    console.log('Number of customers to create:', customers?.length || 0);

    if (!customers || !Array.isArray(customers) || customers.length === 0) {
      return ResponseHandler.badRequest(res, 'Invalid request. Customers array is required.');
    }

    try {
      const { results, errors } = await Customer.createBulk(customers);

      console.log(`Bulk creation completed. Success: ${results.length}, Errors: ${errors.length}`);

      return res.json({
        success: true,
        message: `Bulk customer creation completed. ${results.length} created, ${errors.length} failed.`,
        results,
        errors,
        totalAttempted: customers.length,
        totalSuccessful: results.length,
        totalFailed: errors.length
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async createTest(req, res) {
    if (!quickbooksClient.isAuthenticated()) {
      return ResponseHandler.notAuthenticated(res);
    }

    try {
      const timestamp = Date.now();
      const testCustomer = {
        DisplayName: `TestCustomer${timestamp}`
      };

      console.log('Testing with minimal DisplayName only:', JSON.stringify(testCustomer, null, 2));

      const data = await quickbooksClient.post('customer', { Customer: testCustomer });

      console.log('✅ Test customer created successfully:', data);
      return ResponseHandler.success(res, { data }, 'Test customer created');
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }
}

module.exports = new CustomerController();
