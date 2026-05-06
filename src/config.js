// API Configuration
const config = {
  // Change this to your production API URL when deploying
  //https://franky-app-ix96j.ondigitalocean.app/api
  // For local development: 
  // For production: https://franky-app-ix96j.ondigitalocean.app/api
  API_BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:3006/api',
};

export default config;
