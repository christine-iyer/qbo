const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');

router.get('/customers', customerController.getAll);
router.post('/customers/create', customerController.create);
router.post('/customers/bulk', customerController.createBulk);
router.post('/customers/test', customerController.createTest);
router.put('/customers/:id', customerController.update);

module.exports = router;
