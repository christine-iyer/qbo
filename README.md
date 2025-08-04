# Invoice Me - QuickBooks OAuth Invoice Application

A full-stack application for creating and managing invoices through QuickBooks Online integration with OAuth authentication.

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
