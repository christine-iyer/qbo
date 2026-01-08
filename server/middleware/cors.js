const config = require('../config/environment');

const corsMiddleware = (req, res, next) => {
  res.header('Access-Control-Allow-Origin', config.clientUrl);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
};

module.exports = corsMiddleware;
