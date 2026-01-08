const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');
const quickbooksClient = require('../utils/quickbooksClient');
const ResponseHandler = require('../utils/responseHandler');

class InvoiceController {
  async getAll(req, res) {
    if (!quickbooksClient.isAuthenticated()) {
      return ResponseHandler.notAuthenticated(res);
    }

    try {
      const invoices = await Invoice.getAll();
      
      console.log('Number of invoices found:', invoices.length);
      
      if (invoices.length > 0) {
        console.log('First invoice sample:', JSON.stringify(invoices[0], null, 2));
      }

      // Fetch customers to enrich invoice data
      const customers = await Customer.getAll();
      
      const customerMap = {};
      customers.forEach(customer => {
        customerMap[customer.Id] = customer;
        console.log(`Customer mapping: ID=${customer.Id} -> Name=${customer.DisplayName || customer.Name}`);
      });

      // Enrich invoices with customer names
      const enrichedInvoices = invoices.map(invoice => {
        const customerName = customerMap[invoice.CustomerRef?.value]?.DisplayName || 
                            customerMap[invoice.CustomerRef?.value]?.Name || 
                            'Unknown Customer';
        
        console.log(`Invoice ${invoice.DocNumber}: CustomerRef=${invoice.CustomerRef?.value}, CustomerName=${customerName}`);
        
        if (invoice.Line?.[0]?.Description) {
          console.log(`Invoice ${invoice.DocNumber} description:`, invoice.Line[0].Description);
        }
        
        return {
          ...invoice,
          CustomerName: customerName
        };
      });

      return res.json({
        invoices: enrichedInvoices,
        total: enrichedInvoices.length
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async create(req, res) {
    if (!quickbooksClient.isAuthenticated()) {
      return ResponseHandler.notAuthenticated(res);
    }

    const invoice = req.body;
    
    console.log('Creating invoice');
    console.log('Invoice data received:', JSON.stringify(invoice, null, 2));
    console.log('Invoice line description:', invoice.Line?.[0]?.Description);
    console.log('Does description include delivery info?', invoice.Line?.[0]?.Description?.includes('Delivering to:'));

    try {
      const invoiceData = await Invoice.create(invoice);
      
      console.log('Invoice created successfully:', JSON.stringify(invoiceData, null, 2));
      console.log('Email sending is disabled. Invoice created without email notification.');

      return res.json(invoiceData);
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async updateLine(req, res) {
    if (!quickbooksClient.isAuthenticated()) {
      return ResponseHandler.notAuthenticated(res);
    }

    const { invoiceNumber, lineDescription, amount } = req.body;
    
    if (!invoiceNumber || !lineDescription || amount === undefined) {
      return ResponseHandler.badRequest(res, 'Missing required fields: invoiceNumber, lineDescription, amount');
    }

    try {
      const updatedInvoice = await Invoice.updateLine(invoiceNumber, lineDescription, amount);
      
      return ResponseHandler.success(res, {
        invoice: updatedInvoice
      }, 'Invoice line updated successfully');
    } catch (error) {
      if (error.message === 'Invoice not found') {
        return ResponseHandler.notFound(res, 'Invoice not found');
      }
      if (error.message === 'Delivery service line not found in invoice') {
        return ResponseHandler.notFound(res, 'Delivery service line not found in invoice');
      }
      return ResponseHandler.error(res, error);
    }
  }

  async deleteLine(req, res) {
    if (!quickbooksClient.isAuthenticated()) {
      return ResponseHandler.notAuthenticated(res);
    }

    const { invoiceId, lineIndex } = req.body;
    
    if (!invoiceId || lineIndex === undefined) {
      return ResponseHandler.badRequest(res, 'Missing required fields: invoiceId and lineIndex');
    }

    console.log(`Deleting line item ${lineIndex} from invoice ${invoiceId}`);

    try {
      const updatedInvoice = await Invoice.deleteLine(invoiceId, lineIndex);

      return res.json({
        success: true,
        message: 'Line item deleted successfully',
        invoice: updatedInvoice,
        lineIndex
      });
    } catch (error) {
      if (error.message === 'Invoice not found') {
        return ResponseHandler.notFound(res, 'Invoice not found');
      }
      if (error.message.includes('Line item at index')) {
        return ResponseHandler.notFound(res, error.message);
      }
      return ResponseHandler.error(res, error);
    }
  }

  async delete(req, res) {
    const { invoiceId } = req.params;
    
    if (!invoiceId) {
      return ResponseHandler.badRequest(res, 'Missing invoiceId parameter');
    }

    console.log(`Attempting to delete invoice ${invoiceId}`);

    // QuickBooks API does not support invoice deletion
    return res.status(400).json({
      error: 'Invoice deletion not supported by QuickBooks API',
      details: 'QuickBooks does not allow deletion of invoices through their API. Invoices can only be voided manually in the QuickBooks interface.',
      limitation: 'This is a QuickBooks API limitation, not an application error.',
      suggestion: 'To remove an invoice, you must void it directly in QuickBooks Online.',
      invoiceId: invoiceId
    });
  }
}

module.exports = new InvoiceController();
