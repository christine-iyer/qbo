const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');

router.get('/invoices', invoiceController.getAll);
router.post('/create-invoice', invoiceController.create);
router.put('/api/update-invoice-line', invoiceController.updateLine);
router.put('/api/delete-invoice-line', invoiceController.deleteLine);
router.delete('/api/invoice/:invoiceId', invoiceController.delete);

module.exports = router;
