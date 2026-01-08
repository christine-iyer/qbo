const express = require('express');
const bodyParser = require('body-parser');
const config = require('./server/config/environment');
const corsMiddleware = require('./server/middleware/cors');

// Import routes
const authRoutes = require('./server/routes/authRoutes');
const customerRoutes = require('./server/routes/customerRoutes');
const itemRoutes = require('./server/routes/itemRoutes');
const invoiceRoutes = require('./server/routes/invoiceRoutes');

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
