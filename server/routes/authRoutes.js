const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.get('/auth/callback', authController.handleCallback);

module.exports = router;
