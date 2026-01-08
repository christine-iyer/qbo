const Item = require('../models/Item');
const quickbooksClient = require('../utils/quickbooksClient');
const ResponseHandler = require('../utils/responseHandler');

class ItemController {
  async getAll(req, res) {
    if (!quickbooksClient.isAuthenticated()) {
      return ResponseHandler.notAuthenticated(res);
    }

    try {
      const items = await Item.getAll();
      
      console.log('Items fetched successfully. Count:', items.length);
      if (items.length > 0) {
        console.log('Sample item structure:', JSON.stringify(items[0], null, 2));
      }

      return res.json({
        success: true,
        items,
        count: items.length,
        sampleStructure: items[0] || null
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async create(req, res) {
    if (!quickbooksClient.isAuthenticated()) {
      return ResponseHandler.notAuthenticated(res);
    }

    const itemData = req.body;
    
    console.log('Creating item');
    console.log('Item data received:', JSON.stringify(itemData, null, 2));

    try {
      const data = await Item.create(itemData);
      
      console.log('Item created successfully');
      
      return ResponseHandler.success(res, { data }, 'Item created successfully');
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }
}

module.exports = new ItemController();
