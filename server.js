const express = require('express');
const twilio = require('twilio');
const cors = require('cors');
const path = require('path');
const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Twilio Configuration
const twilioClient = new twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
const twilioNumber = process.env.TWILIO_NUMBER;

// Store OTPs temporarily (in-memory)
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

// Verify OTP endpoint
app.post('/verify-otp', (req, res) => {
    const { mobile, otp } = req.body;
    if (!mobile || !otp) return res.status(400).json({ success: false, error: 'Missing required fields' });

    if (storedOTP[mobile] != otp) {
        return res.status(400).json({ success: false, error: 'Invalid OTP' });
    }

    delete storedOTP[mobile]; // Clear OTP after verification
    res.json({ success: true, message: 'Order confirmed successfully' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
