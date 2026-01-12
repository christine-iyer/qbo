const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.get('/auth/callback', authController.handleCallback);
router.get('/auth/status', authController.checkAuth);

module.exports = router;
