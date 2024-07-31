const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const nodemailer = require('nodemailer')
const dotenv = require('dotenv')

dotenv.config()

const app = express();
app.use(bodyParser.json());
const CLIENT_ID = process.env.CLIENT_ID
const CLIENT_SECRET = process.env.CLIENT_SECRET
const REDIRECT_URI = process.env.REDIRECT_
const COMPANY_ID = "com"

let accessToken =''
app.get('/auth/callback', async (req, res) => {
     const authCode = req.query.code;
     try {
       const response = await axios.post('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
         grant_type: 'authorization_code',
         code: authCode,
         redirect_uri: REDIRECT_URI,
         client_id: CLIENT_ID,
         client_secret: CLIENT_SECRET,
       });
       accessToken = response.data.access_token;
       res.redirect('/create-invoice');
     } catch (error) {
       console.error('Error during token exchange', error);
       res.status(500).send('Authentication failed');
     }
   });
   
//    app.post('/create-invoice', async (req, res) => {
//      const invoice = req.body;
//      try {
//        const response = await axios.post(`https://sandbox-quickbooks.api.intuit.com/v3/company/${COMPANY_ID}/invoice`, invoice, {
//          headers: {
//            Authorization: `Bearer ${accessToken}`,
//            'Content-Type': 'application/json',
//          },
//        });
//        const invoiceData = response.data;
   
//        // Send email with the invoice
//        const transporter = nodemailer.createTransport({
//          service: 'gmail',
//          auth: {
//            user: process.env.EMAIL_USER,
//            pass: process.env.EMAIL_PASS,
//          },
//        });
   
//        const mailOptions = {
//          from: process.env.EMAIL_USER,
//          to: invoice.BillEmail.Address,
//          subject: 'Your Invoice from [Your Company]',
//          text: `Please find attached your invoice.`,
//          html: `<p>Please find attached your invoice.</p><p>Invoice ID: ${invoiceData.Id}</p>`,
//        };
   
//        await transporter.sendMail(mailOptions);
   
//        res.json(invoiceData);
//      } catch (error) {
//        console.error('Error creating invoice', error);
//        res.status(500).send('Failed to create invoice');
//      }
//    });
   
   app.listen(3001, () => {
     console.log('Server running on port 3001');
   });