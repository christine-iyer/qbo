const quickbooksClient = require('../utils/quickbooksClient');

class Item {
  static async getAll() {
    const data = await quickbooksClient.query('SELECT * FROM Item');
    return data.QueryResponse?.Item || [];
  }

  static async getById(itemId) {
    const data = await quickbooksClient.get(`item/${itemId}`);
    return data.QueryResponse?.Item?.[0] || data.Item;
  }

  static async create(itemData) {
    const data = await quickbooksClient.post('item', itemData);
    return data;
  }
}

module.exports = Item;
