const quickbooksClient = require('../utils/quickbooksClient');

class Invoice {
  static async getAll(maxResults = 50) {
    const query = `SELECT * FROM Invoice ORDER BY TxnDate DESC MAXRESULTS ${maxResults}`;
    const data = await quickbooksClient.query(query);
    return data.QueryResponse?.Invoice || [];
  }

  static async getById(invoiceId) {
    const data = await quickbooksClient.get(`invoice/${invoiceId}`);
    return data.QueryResponse?.Invoice?.[0] || data.Invoice;
  }

  static async getByDocNumber(docNumber) {
    const query = `SELECT * FROM Invoice WHERE DocNumber = '${docNumber}'`;
    const data = await quickbooksClient.query(query);
    return data.QueryResponse?.Invoice?.[0];
  }

  static async create(invoiceData) {
    const data = await quickbooksClient.post('invoice', invoiceData);
    return data;
  }

  static async update(invoiceData) {
    const data = await quickbooksClient.post('invoice', invoiceData);
    return data.QueryResponse?.Invoice?.[0] || data.Invoice;
  }

  static async updateLine(invoiceNumber, lineDescription, amount) {
    const invoice = await this.getByDocNumber(invoiceNumber);
    
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    // Find the delivery service line
    let lineIndex = -1;
    for (let i = 0; i < invoice.Line.length; i++) {
      if (invoice.Line[i].Description?.includes('Product Delivery Service')) {
        lineIndex = i;
        break;
      }
    }

    if (lineIndex === -1) {
      throw new Error('Delivery service line not found in invoice');
    }

    // Update the line
    invoice.Line[lineIndex].Description = lineDescription;
    invoice.Line[lineIndex].Amount = parseFloat(amount);
    invoice.Line[lineIndex].SalesItemLineDetail.UnitPrice = parseFloat(amount);

    return this.update(invoice);
  }

  static async deleteLine(invoiceId, lineIndex) {
    let invoice = await this.getById(invoiceId);

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    console.log('Found invoice:', invoice.DocNumber, 'with', invoice.Line?.length, 'line items');

    // Remove the line item
    if (invoice.Line && invoice.Line[lineIndex]) {
      console.log('Removing line item at index:', lineIndex);
      invoice.Line = invoice.Line.filter((_, index) => index !== lineIndex);
      
      // Recalculate totals
      let subTotal = 0;
      invoice.Line.forEach(line => {
        if (line.Amount) {
          subTotal += parseFloat(line.Amount);
        }
      });
      invoice.TotalAmt = subTotal;
      console.log('New total after line removal:', subTotal);
    } else {
      throw new Error(`Line item at index ${lineIndex} not found`);
    }

    return this.update(invoice);
  }

  static async delete(invoiceId) {
    // QuickBooks API does not support invoice deletion
    throw new Error('Invoice deletion not supported by QuickBooks API');
  }
}

module.exports = Invoice;
