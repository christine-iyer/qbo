# Invoice Me - QuickBooks OAuth Invoice Application
2/13/26 Getting a 403 error, somehow the server is not passing the token to fetch users. Considering starting over because I have just been granted most admin permissions on quickbooks. So I should go into my account, sign in as a developer...app is in development, get token and secret. need account number. need endpoint and callback url. Will need to change envt variables in all envirmonments including in digital ocean. 
A full-stack application for creating and managing invoices through QuickBooks Online integration with OAuth authentication.

### Production Deployment Guide - August 6, 2025

## 🚀 Moving from Sandbox to Production QuickBooks

### **1. QuickBooks Developer Account Setup**

**Current Status**: You're using sandbox mode  
**Production Steps**:
1. **Go to**: [QuickBooks Developer Portal](https://developer.intuit.com)
2. **Navigate to**: Your app dashboard
3. **Click**: "Go Live" or "Submit for Production"
4. **Complete**: App review process (can take 1-2 weeks)

### **2. App Review Requirements**

QuickBooks requires your app to meet these criteria:
- ✅ **Functional OAuth flow** (you have this!)
- ✅ **Proper error handling** (you have this!)
- ✅ **Professional UI/UX** (you have this!)
- ✅ **Security compliance** (HTTPS required for production)
- 📋 **Privacy policy** (you'll need to create this)
- 📋 **Terms of service** (you'll need to create this)

### **3. Code Changes for Production**

Update your `.env` file for production:
```env
# Production Environment
ENVIRONMENT=production
CLIENT_ID=your_production_client_id_here
CLIENT_SECRET=your_production_client_secret_here
REDIRECT_URI=https://yourapp.com/auth/callback  # Must use HTTPS
COMPANY_ID=  # This will be set dynamically per user

# React App Environment Variables
REACT_APP_CLIENT_ID=your_production_client_id_here
REACT_APP_ENVIRONMENT=production

# Email Configuration  
EMAIL_USER=your_business_email@yourdomain.com
EMAIL_PASS=your_email_app_password
```

Update your server.js to handle both sandbox and production:
```javascript
const getQuickBooksBaseURL = () => {
  return process.env.ENVIRONMENT === 'production' 
    ? 'https://quickbooks.api.intuit.com'      // Production
    : 'https://sandbox-quickbooks.api.intuit.com';  // Sandbox (current)
};

// Update all API calls to use the dynamic URL:
const response = await axios.get(
  `${getQuickBooksBaseURL()}/v3/company/${companyId}/query?query=SELECT * FROM Customer`
);
```

### **4. Environment Comparison**

| **Aspect** | **Sandbox (Current)** | **Production** |
|------------|---------------------|----------------|
| **URL** | `sandbox-quickbooks.api.intuit.com` | `quickbooks.api.intuit.com` |
| **Data** | Test/fake data | Real customer data |
| **Customers** | Limited test customers | Actual QuickBooks customers |
| **Invoices** | Test invoices | Real invoices with real money |
| **OAuth** | `appcenter.intuit.com/connect/oauth2` | Same (but with prod credentials) |
| **HTTPS** | Optional | **Required** |

### **5. Deployment Requirements**

**Backend Requirements**:
- **HTTPS**: SSL certificate required
- **Domain**: Real domain name (not localhost)
- **Server**: Cloud hosting (AWS, Heroku, DigitalOcean, etc.)

**Frontend Requirements**:
- **Static hosting**: Netlify, Vercel, or similar
- **HTTPS**: Also required for frontend
- **Environment variables**: Production API URLs

### **6. OAuth Redirect URI Update**

**Current**: `http://localhost:3001/auth/callback`  
**Production**: `https://yourdomain.com/auth/callback`

This must be updated in:
- Your QuickBooks Developer Console
- Your `.env` file
- Your React app configuration

### **7. Production Launch Steps**

1. **Deploy your app** to a production server with HTTPS
2. **Update QuickBooks app settings** with production URLs
3. **Submit for review** in QuickBooks Developer Console
4. **Wait for approval** (1-2 weeks typically)
5. **Test with real QuickBooks data** (start with your own account)
6. **Launch to customers**

### **8. Multi-Company Support in Production**

In production, you'll handle multiple QuickBooks companies:
- Each customer has their own QuickBooks company
- Your app needs to store which user connects to which company
- You'll need a database to track user sessions and company IDs

### **9. Testing Production Setup**

**Before going live**:
1. Create your own QuickBooks Online account
2. Connect your production app to your account
3. Test creating invoices with real (small) amounts
4. Verify everything syncs correctly

### **10. Important Notes**

- **Real Money**: Production invoices involve actual financial transactions
- **Real Data**: You'll have access to customers' actual QuickBooks data
- **Compliance**: Ensure your app follows financial data handling regulations
- **Support**: Have customer support processes in place

---

## 🚀 What This App Does

This is a **QuickBooks invoice management application** with two main components:
1. **Backend (Express server)** - Handles QuickBooks OAuth authentication and invoice creation
2. **Frontend (React app)** - Provides UI for authentication, invoice creation, and customer management

## 🏗️ Architecture

- **Server**: Express.js running on port 3001
- **Frontend**: React app running on port 3000
- **Authentication**: QuickBooks OAuth 2.0
- **Email**: Nodemailer integration for invoice delivery

## ✨ Features

- ✅ QuickBooks authentication via OAuth
- ✅ Invoice creation with email sending
- ✅ Navigation between different sections
- 🚧 Customer management (in development)

## 📁 Project Structure

```
invoice-me/
├── server.js                 # Express backend server
├── package.json              # Dependencies and scripts
├── .env                      # Environment variables
├── public/                   # Static assets
└── src/
    ├── App.js               # Main React component
    ├── index.js             # React entry point
    └── components/
        ├── Nav.js           # Navigation component
        ├── QuickBooksAuth.js # OAuth authentication
        ├── CreateInvoice.js  # Invoice creation form
        └── FetchCustomers.js # Customer management
```

## 🛠️ Setup & Installation

### 1. Install Dependencies

```bash
npm install
npm install -D nodemon
```

### 2. Environment Configuration

Your `.env` file should contain:

```env
# QuickBooks OAuth Configuration
CLIENT_ID=your_quickbooks_client_id_here
CLIENT_SECRET=your_quickbooks_client_secret_here
REDIRECT_URI=http://localhost:3001/auth/callback
COMPANY_ID=your_company_id_here

# React App Environment Variables
REACT_APP_CLIENT_ID=your_quickbooks_client_id_here

# Email Configuration
EMAIL_USER=your_gmail_address@gmail.com
EMAIL_PASS=your_gmail_app_password_here
```

**Important**: Replace the placeholder values with your actual QuickBooks app credentials and Gmail settings.

### 3. Gmail App Password Setup

For email functionality, you'll need a Gmail App Password:
1. Enable 2-factor authentication on your Gmail account
2. Generate an App Password for this application
3. Use the App Password (not your regular Gmail password) in the `EMAIL_PASS` field

## 🚦 Running the Application

The application requires both backend and frontend servers to run simultaneously.

### Start Both Servers

**Terminal 1 - Backend Server:**
```bash
npm run dev
```
This starts the Express server on `http://localhost:3001`

**Terminal 2 - Frontend Server:**
```bash
npm run react
```
This starts the React app on `http://localhost:3000`

### Alternative Commands

```bash
# Production backend
npm start

# Build React for production
npm run build

# Run tests
npm test
```

## 🌐 Usage

1. **Open the App**: Navigate to `http://localhost:3000`
2. **Authenticate**: Click "Connect to QuickBooks" to authorize the application
3. **Create Invoice**: Use the invoice form to create and send invoices
4. **Email Delivery**: Invoices are automatically emailed to customers

## 🔄 Application Flow

1. User clicks "Connect to QuickBooks"
2. Redirected to QuickBooks OAuth consent page
3. After authorization, redirected back to `/create-invoice`
4. User fills out invoice form with customer details
5. Invoice is created in QuickBooks and emailed to customer

## 🛑 Stopping the Servers

- Press `Ctrl+C` in each terminal window
- Or use VS Code's terminal controls

## 🔧 Development Notes

### Environment Variables
- Frontend variables must be prefixed with `REACT_APP_`
- Backend uses standard environment variable names
- The `.env` file should never be committed to version control

### Ports
- Backend: `3001` (Express server)
- Frontend: `3000` (React development server)
- Make sure both ports are available before starting

### QuickBooks Sandbox
- The app is configured for QuickBooks Sandbox environment
- Change the base URL for production: `https://quickbooks.api.intuit.com`

## 📝 Next Steps

1. **Complete Email Setup**: Add your Gmail credentials to `.env`
2. **Test OAuth Flow**: Ensure QuickBooks authentication works
3. **Implement Customer Fetching**: Complete the `FetchCustomers` component
4. **Add Error Handling**: Improve user experience with better error messages
5. **Styling**: Add CSS for better visual design

## 🐛 Troubleshooting

### Common Issues

**"Invalid state parameter" error:**
- Ensure the STATE variable matches between frontend and backend

**Email not sending:**
- Verify Gmail App Password is correct
- Check that 2FA is enabled on Gmail account

**OAuth redirect issues:**
- Confirm REDIRECT_URI matches exactly in QuickBooks Developer Console
- Ensure both servers are running

**Port conflicts:**
- Make sure ports 3000 and 3001 are not in use by other applications

## 📚 Technologies Used

- **Frontend**: React, React Router, Axios
- **Backend**: Express.js, Body Parser, Dotenv
- **Authentication**: QuickBooks OAuth 2.0
- **Email**: Nodemailer
- **Development**: Nodemon for auto-restart

---

*This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).*

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
