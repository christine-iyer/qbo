const express = require('express');
const bodyParser = require('body-parser');
const config = require('./config/environment');
const corsMiddleware = require('./middleware/cors');

// Import routes
const authRoutes = require('./routes/authRoutes');
const customerRoutes = require('./routes/customerRoutes');
const itemRoutes = require('./routes/itemRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(corsMiddleware);

// Routes
app.use('/', authRoutes);
app.use('/', customerRoutes);
app.use('/', itemRoutes);
app.use('/', invoiceRoutes);

// Start server
app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
  console.log('Environment:', process.env.NODE_ENV || 'development');
});
