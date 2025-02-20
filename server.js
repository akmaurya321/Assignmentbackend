const express = require('express');
const twilio = require('twilio');
const stripe = require('stripe');
const cors = require('cors');
const path = require('path');
const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files if needed

// API Keys (use environment variables in production)
const stripeClient = stripe(process.env.STRIPE_SECRET_KEY || 'your_stripe_secret_key');
const twilioClient = new twilio(process.env.TWILIO_SID || 'your_twilio_sid', process.env.TWILIO_AUTH_TOKEN || 'your_twilio_auth_token');
const twilioNumber = process.env.TWILIO_NUMBER || 'your_twilio_number';

// Store OTPs temporarily (in-memory, use a database in production)
let storedOTP = {};

// Send OTP endpoint
app.post('/send-otp', (req, res) => {
    const { mobile } = req.body;
    if (!mobile) return res.status(400).json({ success: false, error: 'Mobile number required' });

    const otp = Math.floor(100000 + Math.random() * 900000); // 6-digit OTP
    storedOTP[mobile] = otp;

    twilioClient.messages
        .create({
            body: `Your AssignMate OTP is ${otp}`,
            from: twilioNumber,
            to: mobile
        })
        .then(() => res.json({ success: true }))
        .catch(err => res.status(500).json({ success: false, error: err.message }));
});

// Process payment endpoint
app.post('/process-payment', async (req, res) => {
    const { mobile, otp, paymentMethodId, amount } = req.body;
    if (!mobile || !otp || !paymentMethodId || !amount) {
        return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    if (storedOTP[mobile] != otp) {
        return res.status(400).json({ success: false, error: 'Invalid OTP' });
    }

    try {
        const paymentIntent = await stripeClient.paymentIntents.create({
            amount: amount * 100, // Convert to cents
            currency: 'usd',
            payment_method: paymentMethodId,
            confirm: true,
            return_url: 'https://your-frontend-url.github.io' // Replace with your GitHub Pages URL
        });

        delete storedOTP[mobile]; // Clear OTP after use
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));