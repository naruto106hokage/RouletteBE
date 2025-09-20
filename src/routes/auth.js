const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { body, validationResult } = require('express-validator');
const twilio = require('twilio');

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Generate OTP
const generateOTP = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

// Signup route
router.post('/signup',
  [
    body('name').notEmpty().trim(),
    body('phone_number').matches(/^[0-9]{10}$/).withMessage('Invalid phone number')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, phone_number } = req.body;

      // Create user
      const user = await User.create({
        name,
        phoneNumber: phone_number
      });

      // Generate token
      const token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({ token });
    } catch (error) {
      next(error);
    }
  }
);

// Login route
router.post('/login',
  [
    body('phone_number').matches(/^[0-9]{10}$/).withMessage('Invalid phone number')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { phone_number } = req.body;

      // Find or create user
      let user = await User.findOne({ phoneNumber: phone_number });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Generate OTP
      const otp = generateOTP();
      
      // Store OTP
      user.otp = {
        code: otp,
        expiry: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes expiry
      };
      await user.save();

      // Send OTP via Twilio
      try {
        await client.messages.create({
          body: `Your Roulette verification code is: ${otp}`,
          to: '+' + phone_number,
          from: process.env.TWILIO_PHONE_NUMBER
        });
      } catch (error) {
        console.error('Twilio error:', error);
        // For development, log OTP
        console.log('Development OTP:', otp);
      }

      res.json({ message: 'OTP sent successfully' });
    } catch (error) {
      next(error);
    }
  }
);

// Verify OTP route
router.post('/verifyOtp',
  [
    body('phone_number').matches(/^[0-9]{10}$/).withMessage('Invalid phone number'),
    body('verify_otp').matches(/^[0-9]{4}$/).withMessage('Invalid OTP')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { phone_number, verify_otp } = req.body;

      // Find user
      const user = await User.findOne({ phoneNumber: phone_number });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Verify OTP
      if (!user.otp || !user.otp.code || user.otp.expiry < new Date()) {
        return res.status(400).json({ error: 'OTP expired' });
      }

      if (user.otp.code !== verify_otp) {
        return res.status(400).json({ error: 'Invalid OTP' });
      }

      // Clear OTP
      user.otp = undefined;
      await user.save();

      // Generate access token
      const access_token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      console.log('Generated Token:', access_token); // Debug log
      console.log('User ID:', user._id); // Debug log

      res.json({ access_token });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;