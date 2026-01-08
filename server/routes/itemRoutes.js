const express = require('express');
const router = express.Router();
const itemController = require('../controllers/itemController');

router.get('/items', itemController.getAll);
router.post('/create-item', itemController.create);

module.exports = router;
